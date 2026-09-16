import type { OrderDTO, PlaceOrderResponse, createOrderSchema, listOrdersQuerySchema } from '@repo/shared';
import { prisma, type PrismaTransaction } from 'db';
import type { z } from 'zod';
import {
  matchOrder,
  oppositeBookSide,
  releasedCostBasis,
  settleFill,
  takerBuyCost,
  toBook,
  type EngineBookSide,
  type Fill,
  type OrderTerms,
  type RestingOrder,
} from '../engine/matching';
import { conflict, notFound } from '../lib/errors';
import { fromOutcome, fromSide, toOrderDTO } from '../mappers';
import { cancelWithRefund, creditCash, debitCash, lockShares, TX_OPTIONS, unlockShares } from './ledger';
import { assertTradable, lockMarket } from './market-lock';
import { findMarket } from './markets';

type PlaceOrderInput = z.output<typeof createOrderSchema>;
type ListOrdersQuery = z.output<typeof listOrdersQuerySchema>;

const MAKER_BATCH_SIZE = 200;
const MAX_LISTED_ORDERS = 200;

/** Loads resting orders that cross the taker's limit, in priority order, until enough size is found. */
async function loadCrossingMakers(
  tx: PrismaTransaction,
  marketId: string,
  userId: string,
  takerSide: EngineBookSide,
  takerYesPrice: number,
  quantity: number,
): Promise<RestingOrder[]> {
  const makerSide = oppositeBookSide(takerSide);
  const makers: RestingOrder[] = [];
  let available = 0;

  for (let skip = 0; available < quantity; skip += MAKER_BATCH_SIZE) {
    const rows = await tx.order.findMany({
      where: {
        marketId,
        status: 'Open',
        bookSide: makerSide,
        userId: { not: userId },
        yesPrice: takerSide === 'Bid' ? { lte: takerYesPrice } : { gte: takerYesPrice },
      },
      orderBy: [{ yesPrice: makerSide === 'Ask' ? 'asc' : 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      skip,
      take: MAKER_BATCH_SIZE,
    });
    for (const row of rows) {
      const remaining = row.quantity - row.filledQuantity;
      makers.push({ ...row, remaining });
      available += remaining;
    }
    if (rows.length < MAKER_BATCH_SIZE) break;
  }
  return makers;
}

async function settleParticipant(
  tx: PrismaTransaction,
  marketId: string,
  userId: string,
  order: OrderTerms,
  fill: Fill,
  role: 'maker' | 'taker',
) {
  const settlement = settleFill(order, fill, role);
  const where = { userId_marketId_outcome: { userId, marketId, outcome: order.outcome } };

  if (order.side === 'Buy') {
    const cost = settlement.price * fill.quantity;
    await tx.position.upsert({
      where,
      create: { userId, marketId, outcome: order.outcome, qty: fill.quantity, costBasis: cost },
      update: { qty: { increment: fill.quantity }, costBasis: { increment: cost } },
    });
  } else {
    const position = await tx.position.findUniqueOrThrow({ where });
    await tx.position.update({
      where,
      data: {
        qty: { decrement: fill.quantity },
        lockedQty: { decrement: fill.quantity },
        costBasis: { decrement: releasedCostBasis(position.costBasis, position.qty, fill.quantity) },
      },
    });
  }

  await creditCash(tx, userId, settlement.cashCredit);
  await tx.activity.create({
    data: {
      userId,
      marketId,
      type: order.side,
      outcome: order.outcome,
      quantity: fill.quantity,
      price: settlement.price,
      amount: settlement.tradeAmount,
    },
  });
  return settlement;
}

export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResponse> {
  const terms: OrderTerms = { outcome: fromOutcome(input.outcome), side: fromSide(input.side), price: input.price };
  const { bookSide, yesPrice } = toBook(terms.outcome, terms.side, terms.price);
  const isIoc = input.timeInForce === 'IOC';
  const { id: marketId } = await findMarket(input.marketId);

  const { orderId, fills } = await prisma.$transaction(async tx => {
    const market = await lockMarket(tx, marketId);
    assertTradable(market);

    const makers = await loadCrossingMakers(tx, market.id, userId, bookSide, yesPrice, input.quantity);
    const { fills, filled, remaining } = matchOrder({ ...terms, userId, quantity: input.quantity }, makers);
    if (isIoc && filled === 0) throw conflict('NO_LIQUIDITY', 'No liquidity available at this price');

    const restingQuantity = isIoc ? 0 : remaining;
    if (terms.side === 'Buy') {
      await debitCash(tx, userId, takerBuyCost(terms, fills, restingQuantity));
    } else {
      await lockShares(tx, userId, market.id, terms.outcome, input.quantity);
    }

    const order = await tx.order.create({
      data: {
        userId,
        marketId: market.id,
        ...terms,
        bookSide,
        yesPrice,
        quantity: input.quantity,
        filledQuantity: filled,
        status: remaining === 0 ? 'Filled' : isIoc ? 'Cancelled' : 'Open',
        timeInForce: input.timeInForce,
      },
    });

    let volume = 0;
    const executedAt = Date.now();
    for (const [index, fill] of fills.entries()) {
      const { maker } = fill;
      await tx.order.update({
        where: { id: maker.id },
        data: {
          filledQuantity: { increment: fill.quantity },
          status: fill.quantity === maker.remaining ? 'Filled' : 'Open',
        },
      });
      await settleParticipant(tx, market.id, maker.userId, maker, fill, 'maker');
      const taker = await settleParticipant(tx, market.id, userId, terms, fill, 'taker');
      volume += taker.price * fill.quantity;
      await tx.trade.create({
        data: {
          marketId: market.id,
          makerOrderId: maker.id,
          takerOrderId: order.id,
          yesPrice: fill.yesPrice,
          quantity: fill.quantity,
          takerOutcome: terms.outcome,
          takerSide: terms.side,
          // Preserve execution sequence for trades written in the same transaction.
          createdAt: new Date(executedAt + index),
        },
      });
    }

    if (terms.side === 'Sell' && isIoc) {
      await unlockShares(tx, userId, market.id, terms.outcome, remaining);
    }
    const lastFill = fills.at(-1);
    if (lastFill) {
      await tx.market.update({
        where: { id: market.id },
        data: { volume: { increment: volume }, lastPrice: lastFill.yesPrice },
      });
    }
    return { orderId: order.id, fills };
  }, TX_OPTIONS);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { market: true } });
  const ownFills = fills.map(f => ({ price: settleFill(terms, f, 'taker').price, quantity: f.quantity }));
  const filledQuantity = ownFills.reduce((sum, f) => sum + f.quantity, 0);
  const averagePrice =
    filledQuantity === 0
      ? null
      : Math.round((ownFills.reduce((sum, f) => sum + f.price * f.quantity, 0) / filledQuantity) * 100) / 100;

  return { order: toOrderDTO(order), fills: ownFills, averagePrice };
}

export async function cancelOrder(userId: string, orderId: string): Promise<OrderDTO> {
  const existing = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!existing) throw notFound('Order not found');

  await prisma.$transaction(async tx => {
    await lockMarket(tx, existing.marketId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== 'Open') throw conflict('ORDER_NOT_OPEN', 'Order is no longer open');
    await cancelWithRefund(tx, order);
  }, TX_OPTIONS);

  return toOrderDTO(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { market: true } }));
}

export async function listOrders(userId: string, query: ListOrdersQuery): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      ...(query.status === 'open' ? { status: 'Open' as const } : {}),
      ...(query.marketId ? { marketId: query.marketId } : {}),
    },
    include: { market: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_LISTED_ORDERS,
  });
  return orders.map(toOrderDTO);
}
