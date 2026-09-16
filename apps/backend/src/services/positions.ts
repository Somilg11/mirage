import type { MarketRef, PortfolioDTO, PositionDTO } from '@repo/shared';
import { SHARE_PAYOUT_CENTS } from '@repo/shared';
import { prisma } from 'db';
import { releasedCostBasis } from '../engine/matching';
import { badRequest, conflict } from '../lib/errors';
import { toMarketRef, toOutcome } from '../mappers';
import { creditCash, debitCash, TX_OPTIONS } from './ledger';
import { assertTradable, lockMarket } from './market-lock';
import { findMarket, getQuotes } from './markets';
import { getMe } from './users';

const OUTCOMES = ['Yes', 'No'] as const;

/** Converts cash into equal YES and NO shares (1 pair per 100 cents). */
export async function splitPosition(userId: string, idOrSlug: string, quantity: number) {
  const { id: marketId } = await findMarket(idOrSlug);
  await prisma.$transaction(async tx => {
    assertTradable(await lockMarket(tx, marketId));
    const amount = SHARE_PAYOUT_CENTS * quantity;
    await debitCash(tx, userId, amount);
    for (const outcome of OUTCOMES) {
      const costBasis = (SHARE_PAYOUT_CENTS / 2) * quantity;
      await tx.position.upsert({
        where: { userId_marketId_outcome: { userId, marketId, outcome } },
        create: { userId, marketId, outcome, qty: quantity, costBasis },
        update: { qty: { increment: quantity }, costBasis: { increment: costBasis } },
      });
    }
    await tx.activity.create({ data: { userId, marketId, type: 'Split', quantity, amount: -amount } });
  }, TX_OPTIONS);
  return getMe(userId);
}

/** Redeems equal YES and NO shares back into cash. */
export async function mergePosition(userId: string, idOrSlug: string, quantity: number) {
  const { id: marketId } = await findMarket(idOrSlug);
  await prisma.$transaction(async tx => {
    const market = await lockMarket(tx, marketId);
    if (market.status === 'Resolved') throw conflict('MARKET_CLOSED', 'Market is resolved');

    const positions = await tx.position.findMany({ where: { userId, marketId } });
    for (const outcome of OUTCOMES) {
      const position = positions.find(p => p.outcome === outcome);
      if (!position || position.qty - position.lockedQty < quantity) {
        throw badRequest('INSUFFICIENT_SHARES', 'Merging requires equal unlocked YES and NO shares');
      }
      await tx.position.update({
        where: { id: position.id },
        data: {
          qty: { decrement: quantity },
          costBasis: { decrement: releasedCostBasis(position.costBasis, position.qty, quantity) },
        },
      });
    }
    const amount = SHARE_PAYOUT_CENTS * quantity;
    await creditCash(tx, userId, amount);
    await tx.activity.create({ data: { userId, marketId, type: 'Merge', quantity, amount } });
  }, TX_OPTIONS);
  return getMe(userId);
}

export async function getPortfolio(userId: string): Promise<PortfolioDTO> {
  const [me, rows] = await Promise.all([
    getMe(userId),
    prisma.position.findMany({
      where: { userId, qty: { gt: 0 } },
      include: { market: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  const quotes = await getQuotes([...new Map(rows.map(r => [r.marketId, r.market])).values()]);

  const positions: PositionDTO[] = rows.map(row => {
    const yesPrice = quotes.get(row.marketId)?.yesPrice ?? null;
    const currentPrice = yesPrice === null ? null : row.outcome === 'Yes' ? yesPrice : SHARE_PAYOUT_CENTS - yesPrice;
    const value = currentPrice === null ? row.costBasis : currentPrice * row.qty;
    const market: MarketRef = toMarketRef(row.market);
    return {
      market,
      outcome: toOutcome(row.outcome),
      quantity: row.qty,
      lockedQuantity: row.lockedQty,
      avgPrice: Math.round((row.costBasis / row.qty) * 100) / 100,
      costBasis: row.costBasis,
      currentPrice,
      value,
      pnl: value - row.costBasis,
    };
  });

  const positionsValue = positions.reduce((sum, p) => sum + p.value, 0);
  return {
    cash: me.balance,
    lockedCash: me.lockedBalance,
    positionsValue,
    totalValue: me.balance + me.lockedBalance + positionsValue,
    unrealizedPnl: positions.reduce((sum, p) => sum + p.pnl, 0),
    positions,
  };
}
