/**
 * Pure matching and settlement math for a binary-outcome central limit order book.
 *
 * Every order is projected onto a single book quoted in YES terms:
 *   Buy YES @p  -> Bid @p          Sell YES @p -> Ask @p
 *   Sell NO @p  -> Bid @(100 - p)  Buy NO @p   -> Ask @(100 - p)
 *
 * Crossing a bid with an ask therefore covers all four economic cases:
 * YES transfer, NO transfer, minting a YES/NO pair (Buy YES x Buy NO) and
 * merging a pair back into collateral (Sell YES x Sell NO).
 *
 * This module has no I/O so it can be unit tested exhaustively.
 */
import { SHARE_PAYOUT_CENTS } from '@repo/shared';

export type EngineOutcome = 'Yes' | 'No';
export type EngineSide = 'Buy' | 'Sell';
export type EngineBookSide = 'Bid' | 'Ask';

export interface OrderTerms {
  outcome: EngineOutcome;
  side: EngineSide;
  /** Limit price in the order's own outcome terms. */
  price: number;
}

export interface IncomingOrder extends OrderTerms {
  userId: string;
  quantity: number;
}

export interface RestingOrder extends OrderTerms {
  id: string;
  userId: string;
  bookSide: EngineBookSide;
  yesPrice: number;
  /** Unfilled quantity. */
  remaining: number;
  createdAt: Date;
}

export interface Fill {
  maker: RestingOrder;
  quantity: number;
  /** Execution price in YES terms (always the maker's limit). */
  yesPrice: number;
}

export interface MatchResult {
  fills: Fill[];
  filled: number;
  remaining: number;
}

export function toBook(outcome: EngineOutcome, side: EngineSide, price: number) {
  const bookSide: EngineBookSide = (outcome === 'Yes') === (side === 'Buy') ? 'Bid' : 'Ask';
  return { bookSide, yesPrice: toOwnPrice(outcome, price) };
}

/** Converts between YES terms and an outcome's own terms (the mapping is its own inverse). */
export function toOwnPrice(outcome: EngineOutcome, yesPrice: number): number {
  return outcome === 'Yes' ? yesPrice : SHARE_PAYOUT_CENTS - yesPrice;
}

export function oppositeBookSide(side: EngineBookSide): EngineBookSide {
  return side === 'Bid' ? 'Ask' : 'Bid';
}

/** Whether a maker quote at `makerYesPrice` is marketable for a taker. */
export function crosses(takerSide: EngineBookSide, takerYesPrice: number, makerYesPrice: number): boolean {
  return takerSide === 'Bid' ? makerYesPrice <= takerYesPrice : makerYesPrice >= takerYesPrice;
}

/** Price-time priority: best price first, then oldest first. */
export function comparePriority(makerSide: EngineBookSide) {
  return (a: RestingOrder, b: RestingOrder) => {
    const byPrice = makerSide === 'Ask' ? a.yesPrice - b.yesPrice : b.yesPrice - a.yesPrice;
    return byPrice !== 0 ? byPrice : a.createdAt.getTime() - b.createdAt.getTime();
  };
}

/**
 * Matches an incoming order against resting orders on the opposite side.
 * Orders owned by the taker are skipped (self-trade prevention).
 */
export function matchOrder(taker: IncomingOrder, makers: readonly RestingOrder[]): MatchResult {
  const { bookSide, yesPrice } = toBook(taker.outcome, taker.side, taker.price);
  const makerSide = oppositeBookSide(bookSide);
  const candidates = makers
    .filter(m => m.bookSide === makerSide && m.remaining > 0 && m.userId !== taker.userId)
    .sort(comparePriority(makerSide));

  const fills: Fill[] = [];
  let remaining = taker.quantity;
  for (const maker of candidates) {
    if (remaining === 0 || !crosses(bookSide, yesPrice, maker.yesPrice)) break;
    const quantity = Math.min(remaining, maker.remaining);
    fills.push({ maker, quantity, yesPrice: maker.yesPrice });
    remaining -= quantity;
  }
  return { fills, filled: taker.quantity - remaining, remaining };
}

/** Cash a buyer must escrow up front: executed cost plus the limit value of any resting remainder. */
export function takerBuyCost(
  taker: OrderTerms,
  fills: readonly Pick<Fill, 'quantity' | 'yesPrice'>[],
  restingQuantity: number,
) {
  const executed = fills.reduce((sum, f) => sum + toOwnPrice(taker.outcome, f.yesPrice) * f.quantity, 0);
  return executed + taker.price * restingQuantity;
}

export interface ParticipantSettlement {
  /** Execution price in the participant's own terms. */
  price: number;
  /** Cash credited to the participant on this fill (never negative). */
  cashCredit: number;
  /** Signed change in shares held of the order's outcome. */
  shareDelta: number;
  /** Signed cash delta of the underlying trade, for the activity ledger. */
  tradeAmount: number;
}

/**
 * Settlement for one side of a fill. Escrow model:
 * buyers escrow cash at their limit (taker escrows exact executed cost), sellers escrow shares.
 */
export function settleFill(
  order: OrderTerms,
  fill: Pick<Fill, 'quantity' | 'yesPrice'>,
  role: 'maker' | 'taker',
): ParticipantSettlement {
  const price = toOwnPrice(order.outcome, fill.yesPrice);
  const notional = price * fill.quantity;
  if (order.side === 'Buy') {
    const refund = role === 'maker' ? (order.price - price) * fill.quantity : 0;
    return { price, cashCredit: refund, shareDelta: fill.quantity, tradeAmount: -notional };
  }
  return { price, cashCredit: notional, shareDelta: -fill.quantity, tradeAmount: notional };
}

/** Cost basis released when `quantity` of `heldQuantity` shares leave a position. */
export function releasedCostBasis(costBasis: number, heldQuantity: number, quantity: number): number {
  if (heldQuantity <= 0 || quantity <= 0) return 0;
  if (quantity >= heldQuantity) return costBasis;
  return Math.round((costBasis * quantity) / heldQuantity);
}

export interface Quote {
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
  resolution?: EngineOutcome | null;
}

/** Maximum spread (cents) for which the midpoint is used as the displayed probability. */
export const MIDPOINT_MAX_SPREAD = 10;

export function impliedYesPrice({ bestBid, bestAsk, lastPrice, resolution }: Quote): number | null {
  if (resolution) return resolution === 'Yes' ? SHARE_PAYOUT_CENTS : 0;
  const hasBoth = bestBid !== null && bestAsk !== null;
  const mid = hasBoth ? Math.round((bestBid + bestAsk) / 2) : null;
  if (hasBoth && bestAsk - bestBid <= MIDPOINT_MAX_SPREAD) return mid;
  return lastPrice ?? mid;
}
