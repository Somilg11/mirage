import type { BookLevel, MarketDetail, MarketSummary, OrderBookResponse, PricePoint, TradeDTO } from '@repo/shared';
import { SHARE_PAYOUT_CENTS, marketListQuerySchema, priceHistoryQuerySchema } from '@repo/shared';
import { prisma, type Market, type Prisma } from 'db';
import type { z } from 'zod';
import { impliedYesPrice } from '../engine/matching';
import { notFound } from '../lib/errors';
import { DAY_MS, HOUR_MS } from '../lib/time';
import { marketStatus, toMarketRef, toTradeDTO } from '../mappers';

const MAX_BOOK_LEVELS = 50;

export interface MarketQuote {
  bestBid: number | null;
  bestAsk: number | null;
  yesPrice: number | null;
}

export async function findMarket(idOrSlug: string): Promise<Market> {
  const market = await prisma.market.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
  if (!market) throw notFound('Market not found');
  return market;
}

export async function getQuotes(markets: readonly Market[]): Promise<Map<string, MarketQuote>> {
  const ids = markets.map(m => m.id);
  const groups =
    ids.length === 0
      ? []
      : await prisma.order.groupBy({
          by: ['marketId', 'bookSide'],
          where: { marketId: { in: ids }, status: 'Open' },
          _max: { yesPrice: true },
          _min: { yesPrice: true },
        });

  const quotes = new Map<string, MarketQuote>();
  for (const market of markets) {
    const bid = groups.find(g => g.marketId === market.id && g.bookSide === 'Bid');
    const ask = groups.find(g => g.marketId === market.id && g.bookSide === 'Ask');
    const bestBid = bid?._max.yesPrice ?? null;
    const bestAsk = ask?._min.yesPrice ?? null;
    quotes.set(market.id, {
      bestBid,
      bestAsk,
      yesPrice: impliedYesPrice({ bestBid, bestAsk, lastPrice: market.lastPrice, resolution: market.resolution }),
    });
  }
  return quotes;
}

async function getPricesAt(marketIds: readonly string[], at: Date): Promise<Map<string, number>> {
  if (marketIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ marketId: string; yesPrice: number }[]>`
    SELECT DISTINCT ON ("marketId") "marketId", "yesPrice"
    FROM "Trade"
    WHERE "marketId" = ANY(${[...marketIds]}::text[]) AND "createdAt" <= ${at}
    ORDER BY "marketId", "createdAt" DESC`;
  return new Map(rows.map(r => [r.marketId, r.yesPrice]));
}

function toSummary(market: Market, quote: MarketQuote | undefined, price24hAgo: number | undefined): MarketSummary {
  const yesPrice = quote?.yesPrice ?? null;
  return {
    ...toMarketRef(market),
    endDate: market.endDate.toISOString(),
    createdAt: market.createdAt.toISOString(),
    yesPrice,
    noPrice: yesPrice === null ? null : SHARE_PAYOUT_CENTS - yesPrice,
    bestBid: quote?.bestBid ?? null,
    bestAsk: quote?.bestAsk ?? null,
    lastPrice: market.lastPrice,
    change24h:
      yesPrice !== null && price24hAgo !== undefined && market.status === 'Open' ? yesPrice - price24hAgo : null,
    volume: market.volume,
  };
}

async function summarize(markets: Market[]): Promise<MarketSummary[]> {
  const [quotes, prior] = await Promise.all([
    getQuotes(markets),
    getPricesAt(
      markets.map(m => m.id),
      new Date(Date.now() - DAY_MS),
    ),
  ]);
  return markets.map(m => toSummary(m, quotes.get(m.id), prior.get(m.id)));
}

export async function listMarkets(query: z.output<typeof marketListQuerySchema>): Promise<MarketSummary[]> {
  const now = new Date();
  const where: Prisma.MarketWhereInput = {};
  if (query.status === 'open') Object.assign(where, { status: 'Open', endDate: { gt: now } });
  if (query.status === 'resolved') where.status = 'Resolved';
  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
  if (query.q) where.title = { contains: query.q, mode: 'insensitive' };

  const orderBy: Prisma.MarketOrderByWithRelationInput[] = {
    volume: [{ volume: 'desc' as const }, { createdAt: 'desc' as const }],
    newest: [{ createdAt: 'desc' as const }],
    ending: [{ endDate: 'asc' as const }],
  }[query.sort];

  const markets = await prisma.market.findMany({ where, orderBy, take: 200 });
  return summarize(markets);
}

export async function listCategories(): Promise<{ name: string; count: number }[]> {
  const groups = await prisma.market.groupBy({
    by: ['category'],
    where: { status: 'Open', endDate: { gt: new Date() } },
    _count: { _all: true },
  });
  return groups
    .map(g => ({ name: g.category, count: g._count._all }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getMarketDetail(idOrSlug: string): Promise<MarketDetail> {
  const market = await findMarket(idOrSlug);
  const [[summary], openInterest, traders] = await Promise.all([
    summarize([market]),
    prisma.position.aggregate({ where: { marketId: market.id, outcome: 'Yes' }, _sum: { qty: true } }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT "userId" FROM "Position" WHERE "marketId" = ${market.id}
        UNION
        SELECT "userId" FROM "Order" WHERE "marketId" = ${market.id}
      ) participants`,
  ]);
  return {
    ...summary!,
    description: market.description,
    rules: market.rules,
    resolvedAt: market.resolvedAt?.toISOString() ?? null,
    openInterest: openInterest._sum.qty ?? 0,
    traders: traders[0]?.count ?? 0,
  };
}

export async function getOrderBook(idOrSlug: string): Promise<OrderBookResponse> {
  const market = await findMarket(idOrSlug);
  const rows = await prisma.$queryRaw<{ bookSide: 'Bid' | 'Ask'; yesPrice: number; quantity: number }[]>`
    SELECT "bookSide"::text AS "bookSide", "yesPrice", SUM("quantity" - "filledQuantity")::int AS quantity
    FROM "Order"
    WHERE "marketId" = ${market.id} AND "status" = 'Open'
    GROUP BY "bookSide", "yesPrice"`;

  const level = (r: { yesPrice: number; quantity: number }): BookLevel => ({ price: r.yesPrice, quantity: r.quantity });
  const complement = (l: BookLevel): BookLevel => ({ price: SHARE_PAYOUT_CENTS - l.price, quantity: l.quantity });

  const yesBids = rows
    .filter(r => r.bookSide === 'Bid')
    .map(level)
    .sort((a, b) => b.price - a.price);
  const yesAsks = rows
    .filter(r => r.bookSide === 'Ask')
    .map(level)
    .sort((a, b) => a.price - b.price);

  return {
    marketId: market.id,
    yes: { bids: yesBids.slice(0, MAX_BOOK_LEVELS), asks: yesAsks.slice(0, MAX_BOOK_LEVELS) },
    // A YES ask is a NO bid at the complementary price, and vice versa.
    no: {
      bids: yesAsks.map(complement).slice(0, MAX_BOOK_LEVELS),
      asks: yesBids.map(complement).slice(0, MAX_BOOK_LEVELS),
    },
  };
}

export async function listTrades(idOrSlug: string, limit: number): Promise<TradeDTO[]> {
  const market = await findMarket(idOrSlug);
  const trades = await prisma.trade.findMany({
    where: { marketId: market.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
  return trades.map(toTradeDTO);
}

const INTERVALS = {
  '1d': { window: DAY_MS, bucket: 15 * 60 * 1000 },
  '1w': { window: 7 * DAY_MS, bucket: HOUR_MS },
  '1m': { window: 30 * DAY_MS, bucket: 6 * HOUR_MS },
} as const;

const MAX_ALL_POINTS = 200;

export async function getPriceHistory(
  idOrSlug: string,
  query: z.output<typeof priceHistoryQuerySchema>,
): Promise<PricePoint[]> {
  const market = await findMarket(idOrSlug);
  const now = Date.now();

  let start: number;
  let bucket: number;
  if (query.interval === 'all') {
    const first = await prisma.trade.findFirst({ where: { marketId: market.id }, orderBy: { createdAt: 'asc' } });
    start = Math.min(market.createdAt.getTime(), first?.createdAt.getTime() ?? now);
    bucket = Math.max(HOUR_MS, Math.ceil((now - start) / MAX_ALL_POINTS / HOUR_MS) * HOUR_MS);
  } else {
    ({ window: start, bucket } = INTERVALS[query.interval]);
    start = now - start;
  }

  const [trades, before] = await Promise.all([
    prisma.trade.findMany({
      where: { marketId: market.id, createdAt: { gt: new Date(start) } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { yesPrice: true, createdAt: true },
    }),
    prisma.trade.findFirst({
      where: { marketId: market.id, createdAt: { lte: new Date(start) } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { yesPrice: true },
    }),
  ]);

  const points: PricePoint[] = [];
  if (before) points.push({ t: new Date(start).toISOString(), price: before.yesPrice });

  const buckets = new Map<number, number>();
  for (const trade of trades) {
    buckets.set(Math.floor(trade.createdAt.getTime() / bucket) * bucket, trade.yesPrice);
  }
  for (const [t, price] of buckets) {
    const at = new Date(Math.max(t, start)).toISOString();
    // The bucket straddling the window start supersedes the carried-over price.
    if (points.at(-1)?.t === at) points.pop();
    points.push({ t: at, price });
  }

  const [quote] = [...(await getQuotes([market])).values()];
  const current = marketStatus(market) === 'resolved' ? quote?.yesPrice : (market.lastPrice ?? quote?.yesPrice);
  if (points.length > 0 && current !== null && current !== undefined) {
    points.push({ t: new Date(now).toISOString(), price: current });
  }
  return points;
}
