export type OrderBookLevel = {
  availableQuantity: number;
  // backend may include an orders array on levels; we don't rely on it for UI.
  orders?: unknown;
};

export type OrderBook = Record<string, OrderBookLevel>;

export type MarketListItem = {
  id: string;
  title: string;
  description: string;
  // if backend provides computed pcts, use them; otherwise compute client-side from books.
  yesPct?: number;
  noPct?: number;
  yesBook?: OrderBook;
  noBook?: OrderBook;
};

export type MarketListResponse = {
  markets: MarketListItem[];
};

export type MarketResponse = {
  // backend currently returns { market }
  market: {
    id: string;
    title: string;
    description: string;
    yesOrderBook?: unknown;
    noOrderBook?: unknown;
    yesBook?: OrderBook;
    noBook?: OrderBook;
  };
};

export type BalanceResponse = {
  balance: number;
};

export type Position = {
  id: string;
  userId: string;
  marketId: string;
  type: 'Yes' | 'No';
  qty: number;
};

export type PositionsResponse = {
  positions: Position[];
};

export type CreateOrderRequest = {
  marketId: string;
  side: 'yes' | 'no';
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
};

export type OrderOkResponse = {
  message?: string;
  ok?: boolean;
};
