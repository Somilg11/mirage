import { createMarketSchema, resolveMarketSchema } from '@repo/shared';
import { Router } from 'express';
import { parse } from '../lib/validate';
import { requireAdmin } from '../middleware/admin';
import { createMarket, resolveMarket } from '../services/admin';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.post('/markets', async (req, res) => {
  res.status(201).json({ market: await createMarket(parse(createMarketSchema, req.body)) });
});

adminRouter.post('/markets/:id/resolve', async (req, res) => {
  res.json({ market: await resolveMarket(req.params.id, parse(resolveMarketSchema, req.body)) });
});
