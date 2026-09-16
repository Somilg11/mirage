import type {
  ActivityDTO,
  ActivityType,
  MarketRef,
  MarketStatus,
  OrderDTO,
  OrderSide,
  OrderStatus,
  Outcome,
  TimeInForce,
  TradeDTO,
} from '@repo/shared';
import type { Activity, Market, Order, Trade } from 'db';

type LowercaseEnum<T extends string> = Lowercase<T>;

export function lower<T extends string>(value: T): LowercaseEnum<T> {
  return value.toLowerCase() as LowercaseEnum<T>;
}

export const toOutcome = (value: 'Yes' | 'No'): Outcome => lower(value);
export const fromOutcome = (value: Outcome): 'Yes' | 'No' => (value === 'yes' ? 'Yes' : 'No');
export const fromSide = (value: OrderSide): 'Buy' | 'Sell' => (value === 'buy' ? 'Buy' : 'Sell');

export function marketStatus(market: Pick<Market, 'status' | 'endDate'>, now = new Date()): MarketStatus {
  if (market.status === 'Resolved') return 'resolved';
  return market.endDate.getTime() <= now.getTime() ? 'closed' : 'open';
}

export function toMarketRef(market: Market): MarketRef {
  return {
    id: market.id,
    slug: market.slug,
    title: market.title,
    category: market.category,
    imageUrl: market.imageUrl,
    status: marketStatus(market),
    resolution: market.resolution ? toOutcome(market.resolution) : null,
  };
}

export function toOrderDTO(order: Order & { market: Market }): OrderDTO {
  return {
    id: order.id,
    market: toMarketRef(order.market),
    outcome: toOutcome(order.outcome),
    side: lower(order.side) as OrderSide,
    price: order.price,
    quantity: order.quantity,
    filledQuantity: order.filledQuantity,
    status: lower(order.status) as OrderStatus,
    timeInForce: order.timeInForce as TimeInForce,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toTradeDTO(trade: Trade): TradeDTO {
  return {
    id: trade.id,
    price: trade.yesPrice,
    quantity: trade.quantity,
    takerOutcome: toOutcome(trade.takerOutcome),
    takerSide: lower(trade.takerSide) as OrderSide,
    createdAt: trade.createdAt.toISOString(),
  };
}

export function toActivityDTO(activity: Activity & { market: Market | null }): ActivityDTO {
  return {
    id: activity.id,
    type: lower(activity.type) as ActivityType,
    market: activity.market ? toMarketRef(activity.market) : null,
    outcome: activity.outcome ? toOutcome(activity.outcome) : null,
    quantity: activity.quantity,
    price: activity.price,
    amount: activity.amount,
    createdAt: activity.createdAt.toISOString(),
  };
}
