import { matchAgainstBook, placeRestingOrder, cloneOrderBook } from '../lib/orderbook';
import type { OrderBook } from '../lib/orderbook';
import { test, expect } from 'vitest';

function makeBook(): OrderBook {
  return {
    '10': { availableQuantity: 5, orders: [{ userId: 'A', quantity: 5 }] },
    '20': { availableQuantity: 3, orders: [{ userId: 'B', quantity: 3 }] },
  };
}

test('full match uses up lowest price levels first', () => {
  const book = makeBook();
  const left = matchAgainstBook(book, 4, 15, true); // buy at 15 should consume price 10 only
  expect(left).toBe(0);
  expect(book['10']!.availableQuantity).toBe(1);
  expect(book['10']!.orders[0]!.filledQuantity).toBe(4);
});

test('partial fill leaves leftover', () => {
  const book = makeBook();
  const left = matchAgainstBook(book, 10, 100, true); // buy at high price, but only 8 available
  expect(left).toBe(2);
  expect(book['10']!.orders[0]!.filledQuantity).toBe(5);
  expect(book['20']!.orders[0]!.filledQuantity).toBe(3);
});

test('place resting order appends and increments availableQuantity', () => {
  const book = makeBook();
  placeRestingOrder(book, 30, { userId: 'C', quantity: 7 });
  expect(book['30']).toBeDefined();
  expect(book['30']!.availableQuantity).toBe(7);
  expect(book['30']!.orders.length).toBe(1);
});
