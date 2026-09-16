import { describe, expect, it } from 'vitest';
import {
  impliedYesPrice,
  matchOrder,
  releasedCostBasis,
  settleFill,
  takerBuyCost,
  toBook,
  type EngineOutcome,
  type EngineSide,
  type IncomingOrder,
  type RestingOrder,
} from '../src/engine/matching';

let seq = 0;
function resting(
  userId: string,
  outcome: EngineOutcome,
  side: EngineSide,
  price: number,
  remaining: number,
  createdAt = new Date(1_000 + seq),
): RestingOrder {
  seq += 1;
  return { id: `o${seq}`, userId, outcome, side, price, remaining, createdAt, ...toBook(outcome, side, price) };
}

function incoming(
  userId: string,
  outcome: EngineOutcome,
  side: EngineSide,
  price: number,
  quantity: number,
): IncomingOrder {
  return { userId, outcome, side, price, quantity };
}

describe('toBook', () => {
  it('projects all four order kinds onto the YES book', () => {
    expect(toBook('Yes', 'Buy', 60)).toEqual({ bookSide: 'Bid', yesPrice: 60 });
    expect(toBook('No', 'Sell', 40)).toEqual({ bookSide: 'Bid', yesPrice: 60 });
    expect(toBook('Yes', 'Sell', 60)).toEqual({ bookSide: 'Ask', yesPrice: 60 });
    expect(toBook('No', 'Buy', 40)).toEqual({ bookSide: 'Ask', yesPrice: 60 });
  });
});

describe('matchOrder', () => {
  it('transfers YES between a buyer and a seller at the maker price', () => {
    const maker = resting('seller', 'Yes', 'Sell', 55, 10);
    const { fills, remaining } = matchOrder(incoming('buyer', 'Yes', 'Buy', 60, 4), [maker]);
    expect(remaining).toBe(0);
    expect(fills).toEqual([{ maker, quantity: 4, yesPrice: 55 }]);
  });

  it('mints a pair when Buy YES crosses Buy NO', () => {
    const maker = resting('noBuyer', 'No', 'Buy', 45, 10); // Ask @55
    const { fills } = matchOrder(incoming('yesBuyer', 'Yes', 'Buy', 55, 10), [maker]);
    expect(fills).toHaveLength(1);
    expect(settleFill({ outcome: 'Yes', side: 'Buy', price: 55 }, fills[0]!, 'taker').price).toBe(55);
    expect(settleFill(maker, fills[0]!, 'maker').price).toBe(45);
  });

  it('merges a pair when Sell YES crosses Sell NO', () => {
    const maker = resting('noSeller', 'No', 'Sell', 30, 5); // Bid @70
    const { fills } = matchOrder(incoming('yesSeller', 'Yes', 'Sell', 65, 5), [maker]);
    expect(fills[0]?.yesPrice).toBe(70);
    const takerSide = settleFill({ outcome: 'Yes', side: 'Sell', price: 65 }, fills[0]!, 'taker');
    const makerSide = settleFill(maker, fills[0]!, 'maker');
    expect(takerSide.cashCredit + makerSide.cashCredit).toBe(500);
  });

  it('transfers NO when Sell NO crosses Buy NO', () => {
    const maker = resting('noBuyer', 'No', 'Buy', 42, 3); // Ask @58
    const { fills } = matchOrder(incoming('noSeller', 'No', 'Sell', 40, 3), [maker]); // Bid @60
    expect(fills[0]?.yesPrice).toBe(58);
    expect(settleFill({ outcome: 'No', side: 'Sell', price: 40 }, fills[0]!, 'taker').cashCredit).toBe(126);
  });

  it('does not match when prices do not cross', () => {
    const makers = [resting('s', 'Yes', 'Sell', 61, 10), resting('n', 'No', 'Buy', 38, 10)];
    expect(matchOrder(incoming('b', 'Yes', 'Buy', 60, 5), makers)).toEqual({ fills: [], filled: 0, remaining: 5 });
  });

  it('applies price-time priority across levels and ignores same-side orders', () => {
    const late = resting('a', 'Yes', 'Sell', 50, 2, new Date(3_000));
    const early = resting('b', 'No', 'Buy', 50, 2, new Date(2_000)); // Ask @50, older
    const cheap = resting('c', 'Yes', 'Sell', 48, 1, new Date(9_000));
    const bid = resting('d', 'Yes', 'Buy', 70, 100);
    const { fills, remaining } = matchOrder(incoming('t', 'Yes', 'Buy', 50, 10), [late, bid, early, cheap]);
    expect(fills.map(f => [f.maker.id, f.quantity])).toEqual([
      [cheap.id, 1],
      [early.id, 2],
      [late.id, 2],
    ]);
    expect(remaining).toBe(5);
  });

  it('sweeps bids from highest to lowest for a seller', () => {
    const b1 = resting('a', 'Yes', 'Buy', 40, 3);
    const b2 = resting('b', 'Yes', 'Buy', 45, 3);
    const { fills } = matchOrder(incoming('t', 'Yes', 'Sell', 40, 5), [b1, b2]);
    expect(fills.map(f => [f.yesPrice, f.quantity])).toEqual([
      [45, 3],
      [40, 2],
    ]);
  });

  it("skips the taker's own resting orders", () => {
    const own = resting('t', 'Yes', 'Sell', 40, 5);
    const other = resting('x', 'Yes', 'Sell', 45, 5);
    const { fills } = matchOrder(incoming('t', 'Yes', 'Buy', 50, 5), [own, other]);
    expect(fills.map(f => f.maker.id)).toEqual([other.id]);
  });
});

describe('settlement helpers', () => {
  it('refunds a maker buyer the difference between limit and execution', () => {
    const maker = resting('m', 'Yes', 'Buy', 60, 10);
    const { fills } = matchOrder(incoming('t', 'No', 'Buy', 45, 10), [maker]); // Ask @55 hits Bid @60
    expect(fills[0]?.yesPrice).toBe(60);
    expect(settleFill(maker, fills[0]!, 'maker')).toEqual({
      price: 60,
      cashCredit: 0,
      shareDelta: 10,
      tradeAmount: -600,
    });
    expect(takerBuyCost({ outcome: 'No', side: 'Buy', price: 45 }, fills, 0)).toBe(400);
  });

  it('charges taker executed cost plus limit value of the resting remainder', () => {
    expect(takerBuyCost({ outcome: 'Yes', side: 'Buy', price: 60 }, [{ quantity: 2, yesPrice: 50 }], 3)).toBe(280);
  });

  it('releases cost basis proportionally', () => {
    expect(releasedCostBasis(600, 10, 5)).toBe(300);
    expect(releasedCostBasis(601, 10, 10)).toBe(601);
    expect(releasedCostBasis(100, 3, 1)).toBe(33);
    expect(releasedCostBasis(0, 0, 1)).toBe(0);
  });

  it('derives implied probability from midpoint, last trade or resolution', () => {
    expect(impliedYesPrice({ bestBid: 40, bestAsk: 44, lastPrice: 10 })).toBe(42);
    expect(impliedYesPrice({ bestBid: 20, bestAsk: 80, lastPrice: 35 })).toBe(35);
    expect(impliedYesPrice({ bestBid: 20, bestAsk: 80, lastPrice: null })).toBe(50);
    expect(impliedYesPrice({ bestBid: 20, bestAsk: null, lastPrice: null })).toBeNull();
    expect(impliedYesPrice({ bestBid: 20, bestAsk: 22, lastPrice: 1, resolution: 'No' })).toBe(0);
  });
});

/**
 * In-memory exchange driven only by the engine, mirroring the service's escrow rules.
 * Invariants: Σ cash + Σ escrowed cash + 100 × outstanding pairs is constant,
 * and YES supply always equals NO supply.
 */
describe('conservation invariant', () => {
  type Account = { cash: number; Yes: number; No: number; lockedYes: number; lockedNo: number };

  function rng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1_103_515_245 + 12_345) % 2 ** 31;
      return s / 2 ** 31;
    };
  }

  it('holds across thousands of random placements, fills and cancels', () => {
    const rand = rng(42);
    const users = ['u1', 'u2', 'u3', 'u4'];
    const accounts = new Map<string, Account>(
      users.map(u => [u, { cash: 50_000, Yes: 0, No: 0, lockedYes: 0, lockedNo: 0 }]),
    );
    const book: RestingOrder[] = [];
    const initialCash = 50_000 * users.length;
    let clock = 0;

    const escrowedCash = () => book.filter(o => o.side === 'Buy').reduce((s, o) => s + o.price * o.remaining, 0);
    const supply = (outcome: EngineOutcome) => [...accounts.values()].reduce((s, a) => s + a[outcome], 0);

    for (let step = 0; step < 5_000; step++) {
      const userId = users[Math.floor(rand() * users.length)]!;
      const acct = accounts.get(userId)!;

      if (rand() < 0.1 && book.length > 0) {
        const idx = Math.floor(rand() * book.length);
        const order = book[idx]!;
        const owner = accounts.get(order.userId)!;
        if (order.side === 'Buy') owner.cash += order.price * order.remaining;
        else owner[order.outcome === 'Yes' ? 'lockedYes' : 'lockedNo'] -= order.remaining;
        book.splice(idx, 1);
      } else if (rand() < 0.05) {
        const qty = 1 + Math.floor(rand() * 5);
        if (acct.cash >= 100 * qty) {
          acct.cash -= 100 * qty;
          acct.Yes += qty;
          acct.No += qty;
        }
      } else {
        const outcome: EngineOutcome = rand() < 0.5 ? 'Yes' : 'No';
        const side: EngineSide = rand() < 0.5 ? 'Buy' : 'Sell';
        const price = 1 + Math.floor(rand() * 99);
        const quantity = 1 + Math.floor(rand() * 20);
        const ioc = rand() < 0.3;
        const lockKey = outcome === 'Yes' ? 'lockedYes' : 'lockedNo';
        const taker = incoming(userId, outcome, side, price, quantity);

        if (side === 'Sell' && acct[outcome] - acct[lockKey] < quantity) continue;
        const { fills, remaining } = matchOrder(taker, book);
        if (ioc && fills.length === 0) continue;
        const rest = ioc ? 0 : remaining;
        if (side === 'Buy') {
          const cost = takerBuyCost(taker, fills, rest);
          if (acct.cash < cost) continue;
          acct.cash -= cost;
        } else {
          acct[lockKey] += quantity;
        }

        for (const fill of fills) {
          const maker = fill.maker;
          const makerAcct = accounts.get(maker.userId)!;
          for (const [order, account, role] of [
            [maker, makerAcct, 'maker'],
            [taker, acct, 'taker'],
          ] as const) {
            const s = settleFill(order, fill, role);
            account.cash += s.cashCredit;
            account[order.outcome] += s.shareDelta;
            if (order.side === 'Sell') account[order.outcome === 'Yes' ? 'lockedYes' : 'lockedNo'] -= fill.quantity;
          }
          maker.remaining -= fill.quantity;
        }
        for (let i = book.length - 1; i >= 0; i--) if (book[i]!.remaining === 0) book.splice(i, 1);

        if (side === 'Sell' && ioc) acct[lockKey] -= remaining;
        if (rest > 0) {
          clock += 1;
          book.push({
            ...taker,
            id: `r${step}`,
            remaining: rest,
            createdAt: new Date(clock),
            ...toBook(outcome, side, price),
          });
        }
      }

      const yes = supply('Yes');
      const cash = [...accounts.values()].reduce((s, a) => s + a.cash, 0);
      expect(yes).toBe(supply('No'));
      expect(cash + escrowedCash() + 100 * yes).toBe(initialCash);
      for (const a of accounts.values()) {
        expect(a.cash).toBeGreaterThanOrEqual(0);
        expect(a.Yes).toBeGreaterThanOrEqual(a.lockedYes);
        expect(a.No).toBeGreaterThanOrEqual(a.lockedNo);
        expect(a.lockedYes).toBeGreaterThanOrEqual(0);
        expect(a.lockedNo).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
