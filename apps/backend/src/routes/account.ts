import { paginationQuerySchema } from '@repo/shared';
import { Router } from 'express';
import { parse } from '../lib/validate';
import { currentUser, requireAuth } from '../middleware/auth';
import { listActivity } from '../services/activity';
import { getPortfolio } from '../services/positions';
import { claimDaily, getMe } from '../services/users';

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.get('/me', async (req, res) => {
  res.json({ user: await getMe(currentUser(req).id) });
});

accountRouter.post('/me/claim', async (req, res) => {
  res.json({ user: await claimDaily(currentUser(req).id) });
});

accountRouter.get('/portfolio', async (req, res) => {
  res.json(await getPortfolio(currentUser(req).id));
});

accountRouter.get('/activity', async (req, res) => {
  res.json(await listActivity(currentUser(req).id, parse(paginationQuerySchema, req.query)));
});
