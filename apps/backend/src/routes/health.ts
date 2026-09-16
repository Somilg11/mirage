import { prisma } from 'db';
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  let db: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    req.log.error({ err }, 'health check database probe failed');
    db = 'error';
  }
  res.status(db === 'ok' ? 200 : 503).json({ status: db === 'ok' ? 'ok' : 'degraded', uptime: process.uptime(), db });
});
