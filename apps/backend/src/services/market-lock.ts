import type { Market, PrismaTransaction } from 'db';
import { conflict, notFound } from '../lib/errors';

/**
 * Locks the market row for the rest of the transaction. All book, position and
 * escrow mutations for a market happen under this lock, which serializes matching.
 */
export async function lockMarket(tx: PrismaTransaction, marketId: string): Promise<Market> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Market" WHERE id = ${marketId} FOR UPDATE`;
  if (rows.length === 0) throw notFound('Market not found');
  return tx.market.findUniqueOrThrow({ where: { id: marketId } });
}

export function assertTradable(market: Market, now = new Date()) {
  if (market.status !== 'Open' || market.endDate.getTime() <= now.getTime()) {
    throw conflict('MARKET_CLOSED', 'Market is closed for trading');
  }
}
