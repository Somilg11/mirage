/// <reference path="./types.d.ts" />
import express from "express";
import cors from "cors";
import { z } from "zod";
import { middleware } from "./middleware";
import { prisma } from "db";
import { CreateOrderSchema, type OrderBook } from "./types";
import { matchAgainstBook, placeRestingOrder, cloneOrderBook } from './lib/orderbook';

const app = express();
app.use(express.json());
app.use(cors());
// Order processing helper: creates/matches orders and updates balances/positions atomically.
type OrderData = z.infer<typeof CreateOrderSchema>;

async function processOrder(data: OrderData, userId: string) {
  return prisma.$transaction(async tx => {
    const response = await tx.$queryRaw<{ yesOrderBook: string | null, noOrderBook: string | null, id: string, totalQty: number }[]>`SELECT * FROM "Market" WHERE id = ${data.marketId} FOR UPDATE;`;
    const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE;`;
    const market = response[0];
    if (!market) throw new Error('Market not found');
    const user = userResponse[0];
    if (!user) throw new Error('User not found');

  const yesOrderBook: OrderBook = market.yesOrderBook ? JSON.parse(market.yesOrderBook) : {};
  const noOrderBook: OrderBook = market.noOrderBook ? JSON.parse(market.noOrderBook) : {};

    // Helper to ensure position exists
    const ensurePosition = async (type: 'Yes' | 'No') => {
      const p = await tx.position.findFirst({ where: { userId, marketId: data.marketId, type } });
      if (!p) {
        await tx.position.create({ data: { userId, marketId: data.marketId, type, qty: 0 } });
      }
    };

    // buy, sell, split, merge, balance, positions, history

    // We'll implement a simplified matching loop: match against opposite order book and update positions/balances
    const matchOrders = async (book: OrderBook, oppositeType: 'Yes' | 'No', ownType: 'Yes' | 'No') => {
      let leftQuantity = data.quantity;
      const prices = Object.keys(book).sort((a, b) => parseInt(a) - parseInt(b));
      for (const priceStr of prices) {
        const priceNum = Number(priceStr);
        if ((data.type === 'buy' && priceNum > data.price) || (data.type === 'sell' && priceNum < data.price)) continue;
        const entry = book[priceStr]!;
        for (const order of entry.orders) {
          if (leftQuantity <= 0) break;
          const matched = Math.min(leftQuantity, order.quantity - (order.filledQuantity || 0));
          if (matched <= 0) continue;
          // update counterparty position and balance
          if (!order.reverseOrder) {
            // counterparty decreases their position of oppositeType
            await tx.position.update({ where: { userId_marketId_type: { userId: order.userId, marketId: data.marketId, type: oppositeType } }, data: { qty: { decrement: matched } } });
            await tx.user.update({ where: { id: order.userId }, data: { usdBalance: { increment: matched * priceNum } } });
          } else {
            await tx.position.update({ where: { userId_marketId_type: { userId: order.userId, marketId: data.marketId, type: oppositeType } }, data: { qty: { increment: matched } } });
            await tx.user.update({ where: { id: order.userId }, data: { usdBalance: { decrement: (100 - matched) * priceNum } } });
          }

          // update taker's position and balance
          if (data.type === 'buy') {
            await tx.position.update({ where: { userId_marketId_type: { userId, marketId: data.marketId, type: ownType } }, data: { qty: { increment: matched } } });
            await tx.user.update({ where: { id: userId }, data: { usdBalance: { decrement: matched * priceNum } } });
          } else {
            await tx.position.update({ where: { userId_marketId_type: { userId, marketId: data.marketId, type: ownType } }, data: { qty: { decrement: matched } } });
            await tx.user.update({ where: { id: userId }, data: { usdBalance: { increment: matched * priceNum } } });
          }

          leftQuantity -= matched;
          order.filledQuantity = (order.filledQuantity || 0) + matched;
          entry.availableQuantity -= matched;
        }
        if (leftQuantity <= 0) break;
      }
      return leftQuantity;
    };

    // Use helper functions for matching and resting orders
    if (data.side === 'yes') {
      if (data.type === 'buy') {
        const usd = data.quantity * data.price;
        if (user.usdBalance < usd) throw new Error('Not enough balance');
        const clone = cloneOrderBook(noOrderBook);
        const left = matchAgainstBook(clone, data.quantity, data.price, true);
        // apply clone results back to noOrderBook
        // (we merged in-place matching in helper; here we replace original with clone to ensure safety)
        Object.assign(noOrderBook, clone);
        if (left > 0) {
          placeRestingOrder(yesOrderBook, data.price, { userId, quantity: left, originalOrderId: crypto.randomUUID(), reverseOrder: true });
          console.info(`Placed resting buy-yes order for ${left} @ ${data.price}`);
        }
      } else {
        const pos = await tx.position.findFirst({ where: { userId, marketId: data.marketId, type: 'Yes' } });
        if (!pos || pos.qty < data.quantity) throw new Error('Not enough quantity');
        const clone = cloneOrderBook(noOrderBook);
        const left = matchAgainstBook(clone, data.quantity, data.price, false);
        Object.assign(noOrderBook, clone);
        if (left > 0) {
          placeRestingOrder(yesOrderBook, data.price, { userId, quantity: left, originalOrderId: crypto.randomUUID(), reverseOrder: true });
          console.info(`Placed resting sell-yes order for ${left} @ ${data.price}`);
        }
      }
    } else {
      if (data.type === 'buy') {
        const usd = data.quantity * data.price;
        if (user.usdBalance < usd) throw new Error('Not enough balance');
        const clone = cloneOrderBook(yesOrderBook);
        const left = matchAgainstBook(clone, data.quantity, data.price, true);
        Object.assign(yesOrderBook, clone);
        if (left > 0) {
          placeRestingOrder(noOrderBook, data.price, { userId, quantity: left, originalOrderId: crypto.randomUUID(), reverseOrder: true });
          console.info(`Placed resting buy-no order for ${left} @ ${data.price}`);
        }
      } else {
        const pos = await tx.position.findFirst({ where: { userId, marketId: data.marketId, type: 'No' } });
        if (!pos || pos.qty < data.quantity) throw new Error('Not enough quantity');
        const clone = cloneOrderBook(yesOrderBook);
        const left = matchAgainstBook(clone, data.quantity, data.price, false);
        Object.assign(yesOrderBook, clone);
        if (left > 0) {
          placeRestingOrder(noOrderBook, data.price, { userId, quantity: left, originalOrderId: crypto.randomUUID(), reverseOrder: true });
          console.info(`Placed resting sell-no order for ${left} @ ${data.price}`);
        }
      }
    }

    await tx.market.update({ where: { id: data.marketId }, data: { yesOrderBook: JSON.stringify(yesOrderBook), noOrderBook: JSON.stringify(noOrderBook) } });
    // record order history
    await tx.orderHistory.create({ data: { orderType: data.type === 'buy' ? 'Buy' : 'Sell', qty: data.quantity, price: data.price, userId, marketId: data.marketId } });
    return { ok: true };
  });
}

// buy, sell, split, merge, balance, positions, history
app.post("/buy", middleware, async (req, res) => {
  const { success, data } = CreateOrderSchema.safeParse(req.body);
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });
  if (!success) return res.status(400).json({ message: 'Input is not valid' });
  try {
    await processOrder(data, userId);
    res.json({ message: 'Order processed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/order', middleware, async (req, res) => {
  const { success, data } = CreateOrderSchema.safeParse(req.body);
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });
  if (!success) return res.status(400).json({ message: 'Input is not valid' });
  try {
    await processOrder(data, userId);
    res.json({ message: 'Order processed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/sell', middleware, async (req, res) => {
  // for backward compatibility: same payload
  const { success, data } = CreateOrderSchema.safeParse(req.body);
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized: userId missing' });
  if (!success) return res.status(400).json({ message: 'Input is not valid' });
  try {
    await processOrder(data, userId);
    res.json({ message: 'Sell order processed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/market", async (req, res) => {
  const marketId = req.query.marketId as string;
  if (!marketId) return res.status(400).json({ error: 'marketId required' });
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) return res.status(404).json({ error: 'Market not found' });
  res.json({ market });
});

// Simple public market list used by frontend
app.get('/api/market-list', async (req, res) => {
  try {
    const markets = await prisma.market.findMany({ select: { id: true, title: true, description: true, yesOrderBook: true, noOrderBook: true } });
    const enriched = markets.map(m => {
      const yesBook = m.yesOrderBook ? JSON.parse(String(m.yesOrderBook)) : {};
      const noBook = m.noOrderBook ? JSON.parse(String(m.noOrderBook)) : {};
      const yesQty = Object.values(yesBook).reduce((s: number, lvl: any) => s + (lvl.availableQuantity || 0), 0);
      const noQty = Object.values(noBook).reduce((s: number, lvl: any) => s + (lvl.availableQuantity || 0), 0);
      const total = yesQty + noQty || 1;
      const yesPct = Math.round((yesQty / total) * 100);
      const noPct = 100 - yesPct;
      return { id: m.id, title: m.title, description: m.description, yesPct, noPct, yesBook, noBook };
    });
    res.json({ markets: enriched });
  } catch (err: any) {
    console.error('Error in /api/market-list:', err);
    // surface Prisma error details to client (safe for dev); in production avoid leaking DB internals
    return res.status(500).json({ error: err.message ?? String(err) });
  }
});

app.post("/split", middleware, (req, res) => {
  // split: convert one position into two (example: split 1 into two halves)
  const { marketId, type, quantity } = req.body as { marketId: string, type: 'Yes' | 'No', quantity: number };
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!marketId || !type || !quantity) return res.status(400).json({ error: 'marketId,type,quantity required' });
  // simple implementation: decrement qty by quantity and create an order history of split
  prisma.$transaction(async tx => {
    const pos = await tx.position.findFirst({ where: { userId, marketId, type } });
    if (!pos || pos.qty < quantity) throw new Error('Not enough quantity to split');
    await tx.position.update({ where: { userId_marketId_type: { userId, marketId, type } }, data: { qty: { decrement: quantity } } });
    await tx.orderHistory.create({ data: { orderType: 'Split', qty: quantity, price: 0, userId, marketId } });
  }).then(() => res.json({ message: 'Split done' })).catch(err => res.status(400).json({ error: err.message }));
});

app.post("/merge", middleware, (req, res) => {
  const { marketId, type, quantity } = req.body as { marketId: string, type: 'Yes' | 'No', quantity: number };
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!marketId || !type || !quantity) return res.status(400).json({ error: 'marketId,type,quantity required' });
  prisma.$transaction(async tx => {
    await tx.position.update({ where: { userId_marketId_type: { userId, marketId, type } }, data: { qty: { increment: quantity } } });
    await tx.orderHistory.create({ data: { orderType: 'Merge', qty: quantity, price: 0, userId, marketId } });
  }).then(() => res.json({ message: 'Merge done' })).catch(err => res.status(400).json({ error: err.message }));
});

app.get("/balance", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ balance: user.usdBalance });
});

app.get("/positions", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const positions = await prisma.position.findMany({ where: { userId } });
  res.json({ positions });
});

app.get("/history", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const history = await prisma.orderHistory.findMany({ where: { userId }, orderBy: { id: 'desc' } });
  res.json({ history });
});

app.get("/orders", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const orders = await prisma.orderHistory.findMany({ where: { userId }, orderBy: { id: 'desc' } });
  res.json({ orders });
});

app.post("/claim-daily", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (user.lastClaimDate) {
      const lastClaim = new Date(user.lastClaimDate);
      const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      
      if (lastClaimDay.getTime() === today.getTime()) {
        return res.status(400).json({ error: 'Already claimed today' });
      }
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        usdBalance: { increment: 10000 }, // $100.00 in cents
        lastClaimDate: now,
      },
    });
    
    res.json({ message: 'Claimed $100 successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);