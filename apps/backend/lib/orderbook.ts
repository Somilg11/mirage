// Lightweight typed orderbook helper for matching logic
export type Side = 'yes' | 'no';

export type Order = {
  userId: string;
  quantity: number;
  filledQuantity?: number;
  originalOrderId?: string;
  reverseOrder?: boolean;
};

export type OrderBookLevel = {
  availableQuantity: number;
  orders: Order[];
};

export type OrderBook = Record<string, OrderBookLevel>;

export function cloneOrderBook(book: OrderBook): OrderBook {
  const out: OrderBook = {};
  for (const k of Object.keys(book)) {
    const lvl = book[k];
    if (!lvl) continue;
    out[k] = { availableQuantity: lvl.availableQuantity, orders: lvl.orders.map(o => ({ ...o })) };
  }
  return out;
}

// Match an incoming order against the given book. Returns leftover quantity and modifies book (fills) in place.
export function matchAgainstBook(book: OrderBook, incomingQty: number, incomingPrice: number, isBuy: boolean) {
  let left = incomingQty;
  const levels = Object.keys(book).sort((a, b) => parseInt(a) - parseInt(b));
  for (const level of levels) {
    const price = Number(level);
    if (isBuy && price > incomingPrice) continue;
    if (!isBuy && price < incomingPrice) continue;
    const lvl = book[level];
    if (!lvl) continue;
    for (const order of lvl.orders) {
      if (left <= 0) break;
      const available = order.quantity - (order.filledQuantity || 0);
      if (available <= 0) continue;
      const matched = Math.min(left, available);
      // apply matched
      order.filledQuantity = (order.filledQuantity || 0) + matched;
      lvl.availableQuantity -= matched;
      left -= matched;
    }
    if (left <= 0) break;
  }
  return left;
}

// Apply a new resting order into the book at price with reverseOrder flag
export function placeRestingOrder(book: OrderBook, price: number, order: Order) {
  const key = String(price);
  if (!book[key]) book[key] = { availableQuantity: 0, orders: [] };
  book[key].orders.push(order);
  book[key].availableQuantity += order.quantity - (order.filledQuantity || 0);
}
