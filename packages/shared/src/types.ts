import type { z } from 'zod';
import type {
  marketStatusSchema,
  orderSideSchema,
  orderStatusSchema,
  outcomeSchema,
  timeInForceSchema,
} from './schemas';

export type Outcome = z.infer<typeof outcomeSchema>;
export type OrderSide = z.infer<typeof orderSideSchema>;
export type TimeInForce = z.infer<typeof timeInForceSchema>;
export type MarketStatus = z.infer<typeof marketStatusSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ActivityType = 'claim' | 'buy' | 'sell' | 'split' | 'merge' | 'payout';

/** Dates are ISO-8601 strings. Prices are cents (1-99). Amounts are cents. */

export interface MarketRef {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  status: MarketStatus;
  resolution: Outcome | null;
}

export interface MarketSummary extends MarketRef {
  endDate: string;
  createdAt: string;
  /** Implied probability of YES in cents: midpoint when spread is tight, otherwise last trade. */
  yesPrice: number | null;
  noPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
  /** Change of YES price over the last 24h, in cents. */
  change24h: number | null;
  volume: number;
}

export interface MarketDetail extends MarketSummary {
  description: string;
  rules: string;
  resolvedAt: string | null;
  /** Outstanding YES/NO share pairs. */
  openInterest: number;
  traders: number;
}

export interface BookLevel {
  price: number;
  quantity: number;
}

export interface OutcomeBook {
  /** Sorted best (highest) first. */
  bids: BookLevel[];
  /** Sorted best (lowest) first. */
  asks: BookLevel[];
}

export interface OrderBookResponse {
  marketId: string;
  yes: OutcomeBook;
  no: OutcomeBook;
}

export interface PricePoint {
  t: string;
  /** YES price in cents. */
  price: number;
}

export interface TradeDTO {
  id: string;
  /** YES price in cents. */
  price: number;
  quantity: number;
  takerOutcome: Outcome;
  takerSide: OrderSide;
  createdAt: string;
}

export interface MeDTO {
  id: string;
  address: string;
  /** Spendable cash. */
  balance: number;
  /** Cash escrowed in open buy orders. */
  lockedBalance: number;
  lastClaimAt: string | null;
  nextClaimAt: string | null;
  createdAt: string;
}

export interface PositionDTO {
  market: MarketRef;
  outcome: Outcome;
  quantity: number;
  /** Shares escrowed in open sell orders (included in quantity). */
  lockedQuantity: number;
  avgPrice: number | null;
  costBasis: number;
  currentPrice: number | null;
  value: number;
  pnl: number;
}

export interface PortfolioDTO {
  cash: number;
  lockedCash: number;
  positionsValue: number;
  totalValue: number;
  unrealizedPnl: number;
  positions: PositionDTO[];
}

export interface OrderDTO {
  id: string;
  market: MarketRef;
  outcome: Outcome;
  side: OrderSide;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: string;
  updatedAt: string;
}

export interface FillDTO {
  /** Execution price in the order's own outcome terms. */
  price: number;
  quantity: number;
}

export interface PlaceOrderResponse {
  order: OrderDTO;
  fills: FillDTO[];
  averagePrice: number | null;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  market: MarketRef | null;
  outcome: Outcome | null;
  quantity: number | null;
  price: number | null;
  /** Signed cash delta in cents. */
  amount: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
