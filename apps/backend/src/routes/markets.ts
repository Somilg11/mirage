import { marketListQuerySchema, paginationQuerySchema, priceHistoryQuerySchema, splitMergeSchema } from '@repo/shared';
import { Router } from 'express';
import { parse } from '../lib/validate';
import { currentUser, requireAuth } from '../middleware/auth';
import {
  getMarketDetail,
  getOrderBook,
  getPriceHistory,
  listCategories,
  listMarkets,
  listTrades,
} from '../services/markets';
import { mergePosition, splitPosition } from '../services/positions';

export const marketsRouter = Router();

marketsRouter.get('/', async (req, res) => {
  res.json({ markets: await listMarkets(parse(marketListQuerySchema, req.query)) });
});

marketsRouter.get('/categories', async (_req, res) => {
  res.json({ categories: await listCategories() });
});

marketsRouter.get('/:id', async (req, res) => {
  res.json({ market: await getMarketDetail(req.params.id) });
});

marketsRouter.get('/:id/orderbook', async (req, res) => {
  res.json(await getOrderBook(req.params.id));
});

marketsRouter.get('/:id/trades', async (req, res) => {
  const { limit } = parse(paginationQuerySchema, req.query);
  res.json({ trades: await listTrades(req.params.id, limit) });
});

marketsRouter.get('/:id/prices', async (req, res) => {
  res.json({ points: await getPriceHistory(req.params.id, parse(priceHistoryQuerySchema, req.query)) });
});

marketsRouter.post<{ id: string }>('/:id/split', requireAuth, async (req, res) => {
  const { quantity } = parse(splitMergeSchema, req.body);
  res.json({ user: await splitPosition(currentUser(req).id, req.params.id, quantity) });
});

marketsRouter.post<{ id: string }>('/:id/merge', requireAuth, async (req, res) => {
  const { quantity } = parse(splitMergeSchema, req.body);
  res.json({ user: await mergePosition(currentUser(req).id, req.params.id, quantity) });
});
