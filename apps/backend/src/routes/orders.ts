import { createOrderSchema, listOrdersQuerySchema } from '@repo/shared';
import { Router } from 'express';
import { parse } from '../lib/validate';
import { currentUser, requireAuth } from '../middleware/auth';
import { orderLimiter } from '../middleware/rate-limit';
import { cancelOrder, listOrders, placeOrder } from '../services/orders';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/', async (req, res) => {
  res.json(await listOrders(currentUser(req).id, parse(listOrdersQuerySchema, req.query)));
});

ordersRouter.post('/', orderLimiter, async (req, res) => {
  const input = parse(createOrderSchema, req.body);
  res.status(201).json(await placeOrder(currentUser(req).id, input));
});

ordersRouter.delete('/:id', async (req, res) => {
  res.json({ order: await cancelOrder(currentUser(req).id, req.params.id) });
});
