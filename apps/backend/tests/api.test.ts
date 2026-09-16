/**
 * End-to-end API tests against a real Postgres database.
 * Requires TEST_DATABASE_URL (never falls back to DATABASE_URL, to avoid touching a shared database).
 */
import type { MarketDetail, MeDTO, OrderBookResponse, PlaceOrderResponse, PortfolioDTO } from '@repo/shared';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const ADMIN_KEY = 'test-admin-key-0123456789abcdef0123456789';

describe.skipIf(!TEST_DATABASE_URL)('API (integration)', () => {
  let app: Express;
  let disconnect: () => Promise<void>;
  const run = randomUUID().slice(0, 8);
  const alice = `alice-${run}`;
  const bob = `bob-${run}`;

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
      AUTH_DEV_BYPASS: '1',
      ADMIN_API_KEY: ADMIN_KEY,
      STARTING_BALANCE_CENTS: '10000',
      DAILY_CLAIM_CENTS: '10000',
    });
    app = (await import('../src/app')).createApp();
    const { prisma } = await import('db');
    disconnect = () => prisma.$disconnect();
  });

  afterAll(async () => {
    await disconnect?.();
  });

  const as = (address: string) => ({ 'x-dev-address': address });

  async function me(address: string): Promise<MeDTO> {
    const res = await request(app).get('/api/me').set(as(address)).expect(200);
    return res.body.user;
  }

  async function portfolio(address: string): Promise<PortfolioDTO> {
    return (await request(app).get('/api/portfolio').set(as(address)).expect(200)).body;
  }

  async function shares(address: string, marketId: string, outcome: 'yes' | 'no') {
    const p = (await portfolio(address)).positions.find(x => x.market.id === marketId && x.outcome === outcome);
    return p?.quantity ?? 0;
  }

  async function createMarket(suffix: string): Promise<MarketDetail> {
    const res = await request(app)
      .post('/api/admin/markets')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        title: `Integration market ${run} ${suffix}`,
        description: 'Created by the integration test suite.',
        rules: 'Resolves YES if the test says so.',
        category: 'Testing',
        endDate: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    return res.body.market;
  }

  function order(address: string, body: Record<string, unknown>) {
    return request(app).post('/api/orders').set(as(address)).send(body);
  }

  it('reports health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('rejects admin calls without the key and invalid payloads', async () => {
    await request(app).post('/api/admin/markets').send({}).expect(401);
    const res = await request(app).post('/api/admin/markets').set('x-admin-key', ADMIN_KEY).send({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates users with a starting balance and enforces one daily claim', async () => {
    expect((await me(alice)).balance).toBe(10_000);
    await request(app).post('/api/me/claim').set(as(alice)).expect(200);
    const second = await request(app).post('/api/me/claim').set(as(alice)).expect(409);
    expect(second.body.error.code).toBe('ALREADY_CLAIMED');
    const user = await me(alice);
    expect(user.balance).toBe(20_000);
    expect(user.nextClaimAt).not.toBeNull();
    await me(bob);
  });

  // PGlite-based local servers (`prisma dev`) cannot run concurrent connections; opt in on real Postgres.
  it.runIf(process.env.TEST_CONCURRENCY === '1')(
    'allows exactly one daily claim under concurrent requests',
    async () => {
      const carol = `carol-${run}`;
      await me(carol);
      const results = await Promise.all(
        Array.from({ length: 5 }, () => request(app).post('/api/me/claim').set(as(carol))),
      );
      expect(results.filter(r => r.status === 200)).toHaveLength(1);
      expect(results.filter(r => r.status === 409)).toHaveLength(4);
      expect((await me(carol)).balance).toBe(20_000);
    },
  );

  it('validates order input', async () => {
    const market = await createMarket('validation');
    for (const bad of [{ price: 0 }, { price: 100 }, { quantity: -5 }, { quantity: 1.5 }, { outcome: 'maybe' }]) {
      const res = await order(alice, {
        marketId: market.id,
        outcome: 'yes',
        side: 'buy',
        price: 50,
        quantity: 1,
        ...bad,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const missing = await order(alice, { marketId: 'nope', outcome: 'yes', side: 'buy', price: 50, quantity: 1 });
    expect(missing.status).toBe(404);
    const bySlug = await order(alice, {
      marketId: market.slug,
      outcome: 'yes',
      side: 'buy',
      price: 1,
      quantity: 1,
      timeInForce: 'IOC',
    });
    expect(bySlug.body.error.code).toBe('NO_LIQUIDITY');
  });

  it('mints, transfers and merges across the unified book with correct escrow', async () => {
    const market = await createMarket('matching');
    const start = { alice: (await me(alice)).balance, bob: (await me(bob)).balance };

    // Alice rests Buy YES 10 @ 60 (escrows 600).
    const resting = await order(alice, { marketId: market.id, outcome: 'yes', side: 'buy', price: 60, quantity: 10 });
    expect(resting.status).toBe(201);
    expect((resting.body as PlaceOrderResponse).order.status).toBe('open');
    expect((await me(alice)).balance).toBe(start.alice - 600);
    expect((await me(alice)).lockedBalance).toBe(600);

    const book: OrderBookResponse = (await request(app).get(`/api/markets/${market.slug}/orderbook`).expect(200)).body;
    expect(book.yes.bids).toEqual([{ price: 60, quantity: 10 }]);
    expect(book.no.asks).toEqual([{ price: 40, quantity: 10 }]);

    // Mint: Bob buys NO 4 @ 45 (YES ask 55) -> fills at maker YES 60, i.e. NO 40.
    const mint = await order(bob, { marketId: market.id, outcome: 'no', side: 'buy', price: 45, quantity: 4 });
    expect(mint.status).toBe(201);
    expect(mint.body.fills).toEqual([{ price: 40, quantity: 4 }]);
    expect(mint.body.order.status).toBe('filled');
    expect((await me(bob)).balance).toBe(start.bob - 160);
    expect(await shares(alice, market.id, 'yes')).toBe(4);
    expect(await shares(bob, market.id, 'no')).toBe(4);

    // Alice lists 2 YES @ 70; nobody else bids that high, so it rests.
    const ask = await order(alice, { marketId: market.id, outcome: 'yes', side: 'sell', price: 70, quantity: 2 });
    expect(ask.body.order.status).toBe('open');
    const oversell = await order(alice, { marketId: market.id, outcome: 'yes', side: 'sell', price: 70, quantity: 3 });
    expect(oversell.status).toBe(400);
    expect(oversell.body.error.code).toBe('INSUFFICIENT_SHARES');

    // Merge: Bob sells 2 NO @ 25 (YES bid 75) crossing Alice's YES ask @70 -> Bob gets 30, Alice gets 70.
    const bobBefore = (await me(bob)).balance;
    const aliceBefore = (await me(alice)).balance;
    const merge = await order(bob, { marketId: market.id, outcome: 'no', side: 'sell', price: 25, quantity: 2 });
    expect(merge.body.fills).toEqual([{ price: 30, quantity: 2 }]);
    expect((await me(bob)).balance).toBe(bobBefore + 60);
    expect((await me(alice)).balance).toBe(aliceBefore + 140);
    expect(await shares(alice, market.id, 'yes')).toBe(2);
    expect(await shares(bob, market.id, 'no')).toBe(2);

    // NO transfer: Alice rests Buy NO 2 @ 35; Bob sells NO 2 @ 30 and fills at 35.
    await order(alice, { marketId: market.id, outcome: 'no', side: 'buy', price: 35, quantity: 2 }).expect(201);
    const transfer = await order(bob, { marketId: market.id, outcome: 'no', side: 'sell', price: 30, quantity: 2 });
    expect(transfer.body.fills).toEqual([{ price: 35, quantity: 2 }]);
    expect(await shares(bob, market.id, 'no')).toBe(0);
    expect(await shares(alice, market.id, 'no')).toBe(2);

    const detail: MarketDetail = (await request(app).get(`/api/markets/${market.id}`).expect(200)).body.market;
    expect(detail.volume).toBe(4 * 40 + 2 * 30 + 2 * 35);
    expect(detail.lastPrice).toBe(65);
    const trades = (await request(app).get(`/api/markets/${market.id}/trades`).expect(200)).body.trades;
    expect(trades).toHaveLength(3);
    const prices = (await request(app).get(`/api/markets/${market.id}/prices?interval=1d`).expect(200)).body.points;
    expect(prices.at(-1).price).toBe(65);
  });

  it('refunds escrow on cancel and rejects double cancel', async () => {
    const market = await createMarket('cancel');
    const before = (await me(alice)).balance;
    const placed = await order(alice, { marketId: market.id, outcome: 'no', side: 'buy', price: 30, quantity: 5 });
    expect((await me(alice)).balance).toBe(before - 150);
    const id = placed.body.order.id;
    await request(app).delete(`/api/orders/${id}`).set(as(bob)).expect(404);
    const cancelled = await request(app).delete(`/api/orders/${id}`).set(as(alice)).expect(200);
    expect(cancelled.body.order.status).toBe('cancelled');
    expect((await me(alice)).balance).toBe(before);
    const again = await request(app).delete(`/api/orders/${id}`).set(as(alice)).expect(409);
    expect(again.body.error.code).toBe('ORDER_NOT_OPEN');

    const open = await request(app).get('/api/orders?status=open').set(as(alice)).expect(200);
    expect(open.body.orders.some((o: { id: string }) => o.id === id)).toBe(false);
  });

  it('fails IOC orders without liquidity and rejects orders beyond balance', async () => {
    const market = await createMarket('ioc');
    const ioc = await order(alice, {
      marketId: market.id,
      outcome: 'yes',
      side: 'buy',
      price: 99,
      quantity: 1,
      timeInForce: 'IOC',
    });
    expect(ioc.status).toBe(409);
    expect(ioc.body.error.code).toBe('NO_LIQUIDITY');
    expect(
      (await request(app).get('/api/orders').set(as(alice))).body.orders.some(
        (o: { market: { id: string } }) => o.market.id === market.id,
      ),
    ).toBe(false);

    const poor = await order(bob, { marketId: market.id, outcome: 'yes', side: 'buy', price: 99, quantity: 100_000 });
    expect(poor.status).toBe(400);
    expect(poor.body.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('partially fills IOC orders and cancels the remainder', async () => {
    const market = await createMarket('ioc-partial');
    await order(bob, { marketId: market.id, outcome: 'no', side: 'buy', price: 50, quantity: 3 }).expect(201);
    const before = (await me(alice)).balance;
    const res = await order(alice, {
      marketId: market.id,
      outcome: 'yes',
      side: 'buy',
      price: 60,
      quantity: 5,
      timeInForce: 'IOC',
    }).expect(201);
    expect(res.body.order).toMatchObject({ status: 'cancelled', filledQuantity: 3 });
    expect(res.body.averagePrice).toBe(50);
    expect((await me(alice)).balance).toBe(before - 150);
  });

  it('splits and merges positions', async () => {
    const market = await createMarket('split');
    const before = (await me(bob)).balance;
    await request(app).post(`/api/markets/${market.id}/split`).set(as(bob)).send({ quantity: 3 }).expect(200);
    expect((await me(bob)).balance).toBe(before - 300);
    expect(await shares(bob, market.id, 'yes')).toBe(3);
    expect(await shares(bob, market.id, 'no')).toBe(3);

    const tooMany = await request(app).post(`/api/markets/${market.id}/merge`).set(as(bob)).send({ quantity: 4 });
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_SHARES');
    await request(app).post(`/api/markets/${market.slug}/merge`).set(as(bob)).send({ quantity: 2 }).expect(200);
    expect((await me(bob)).balance).toBe(before - 100);
    const pf = await portfolio(bob);
    const yes = pf.positions.find(p => p.market.id === market.id && p.outcome === 'yes');
    expect(yes).toMatchObject({ quantity: 1, costBasis: 50, avgPrice: 50 });
  });

  it('resolves a market, refunding orders and paying winners', async () => {
    const market = await createMarket('resolve');
    // Mint 5 pairs: Alice YES, Bob NO at 70/30.
    await order(alice, { marketId: market.id, outcome: 'yes', side: 'buy', price: 70, quantity: 5 }).expect(201);
    await order(bob, { marketId: market.id, outcome: 'no', side: 'buy', price: 30, quantity: 5 }).expect(201);
    // Resting order that must be refunded on resolution.
    await order(bob, { marketId: market.id, outcome: 'no', side: 'buy', price: 10, quantity: 10 }).expect(201);

    const alice0 = (await me(alice)).balance;
    const bob0 = (await me(bob)).balance;
    await request(app)
      .post(`/api/admin/markets/${market.id}/resolve`)
      .set('x-admin-key', ADMIN_KEY)
      .send({ outcome: 'yes' })
      .expect(200);

    expect((await me(alice)).balance).toBe(alice0 + 500);
    expect((await me(bob)).balance).toBe(bob0 + 100);
    expect(await shares(alice, market.id, 'yes')).toBe(0);

    const trade = await order(alice, { marketId: market.id, outcome: 'yes', side: 'buy', price: 50, quantity: 1 });
    expect(trade.status).toBe(409);
    expect(trade.body.error.code).toBe('MARKET_CLOSED');

    const activity = await request(app).get('/api/activity?limit=2').set(as(alice)).expect(200);
    expect(activity.body.items[0].type).toBe('payout');
    expect(activity.body.nextCursor).not.toBeNull();
    const next = await request(app).get(`/api/activity?limit=2&cursor=${activity.body.nextCursor}`).set(as(alice));
    expect(next.body.items[0].id).not.toBe(activity.body.items[1].id);
  });

  it('lists and filters markets', async () => {
    const market = await createMarket('listing');
    const res = await request(app)
      .get(`/api/markets?q=${encodeURIComponent(run)}&sort=newest`)
      .expect(200);
    expect(res.body.markets[0].id).toBe(market.id);
    const categories = await request(app).get('/api/markets/categories').expect(200);
    expect(categories.body.categories.some((c: { name: string }) => c.name === 'Testing')).toBe(true);
    await request(app).get('/api/markets?sort=bogus').expect(400);
    await request(app).get('/api/does-not-exist').expect(404);
  });
});
