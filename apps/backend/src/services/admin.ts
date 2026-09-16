import type { CreateMarketInput, MarketDetail, ResolveMarketInput } from '@repo/shared';
import { SHARE_PAYOUT_CENTS } from '@repo/shared';
import { prisma } from 'db';
import { randomBytes } from 'node:crypto';
import { badRequest, conflict } from '../lib/errors';
import { fromOutcome } from '../mappers';
import { cancelWithRefund, creditCash, TX_OPTIONS } from './ledger';
import { lockMarket } from './market-lock';
import { findMarket, getMarketDetail } from './markets';

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export async function createMarket(input: CreateMarketInput): Promise<MarketDetail> {
  const endDate = new Date(input.endDate);
  if (endDate.getTime() <= Date.now()) {
    throw badRequest('VALIDATION_ERROR', 'endDate must be in the future');
  }

  let slug = input.slug ?? (slugify(input.title) || 'market');
  if (await prisma.market.findUnique({ where: { slug } })) {
    if (input.slug) throw conflict('CONFLICT', 'A market with this slug already exists');
    slug = `${slug}-${randomBytes(3).toString('hex')}`;
  }

  const market = await prisma.market.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      rules: input.rules,
      category: input.category,
      imageUrl: input.imageUrl ?? null,
      endDate,
    },
  });
  return getMarketDetail(market.id);
}

/** Resolves a market: refunds open orders, pays 100 cents per winning share and clears positions. */
export async function resolveMarket(idOrSlug: string, input: ResolveMarketInput): Promise<MarketDetail> {
  const { id: marketId } = await findMarket(idOrSlug);
  const winner = fromOutcome(input.outcome);

  await prisma.$transaction(async tx => {
    const market = await lockMarket(tx, marketId);
    if (market.status !== 'Open') throw conflict('MARKET_CLOSED', 'Market is already resolved');

    const openOrders = await tx.order.findMany({ where: { marketId, status: 'Open' } });
    for (const order of openOrders) await cancelWithRefund(tx, order);

    const winners = await tx.position.findMany({ where: { marketId, outcome: winner, qty: { gt: 0 } } });
    for (const position of winners) {
      const amount = SHARE_PAYOUT_CENTS * position.qty;
      await creditCash(tx, position.userId, amount);
      await tx.activity.create({
        data: {
          userId: position.userId,
          marketId,
          type: 'Payout',
          outcome: winner,
          quantity: position.qty,
          price: SHARE_PAYOUT_CENTS,
          amount,
        },
      });
    }

    await tx.position.updateMany({ where: { marketId }, data: { qty: 0, lockedQty: 0, costBasis: 0 } });
    await tx.market.update({
      where: { id: marketId },
      data: { status: 'Resolved', resolution: winner, resolvedAt: new Date() },
    });
  }, TX_OPTIONS);

  return getMarketDetail(marketId);
}
