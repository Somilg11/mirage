import type {
  ActivityDTO,
  CreateOrderInput,
  ListOrdersQuery,
  MarketDetail,
  MarketListQuery,
  MarketSummary,
  MeDTO,
  OrderBookResponse,
  OrderDTO,
  Paginated,
  PlaceOrderResponse,
  PortfolioDTO,
  PriceHistoryQuery,
  PricePoint,
  TradeDTO,
} from '@repo/shared';
import { http } from './client';

export interface CategoryCount {
  name: string;
  count: number;
}

export const api = {
  markets: {
    list: (params: MarketListQuery) =>
      http.get<{ markets: MarketSummary[]; nextCursor: string | null }>('/markets', { params }).then(r => r.data),
    categories: () => http.get<{ categories: CategoryCount[] }>('/markets/categories').then(r => r.data.categories),
    get: (idOrSlug: string) =>
      http.get<{ market: MarketDetail }>(`/markets/${encodeURIComponent(idOrSlug)}`).then(r => r.data.market),
    orderBook: (id: string) => http.get<OrderBookResponse>(`/markets/${id}/orderbook`).then(r => r.data),
    trades: (id: string, params: { limit?: number; cursor?: string } = {}) =>
      http
        .get<{ trades: TradeDTO[]; nextCursor: string | null }>(`/markets/${id}/trades`, { params })
        .then(r => r.data),
    prices: (id: string, params: PriceHistoryQuery) =>
      http.get<{ points: PricePoint[] }>(`/markets/${id}/prices`, { params }).then(r => r.data.points),
    split: (id: string, quantity: number) =>
      http.post<{ user: MeDTO }>(`/markets/${id}/split`, { quantity }).then(r => r.data.user),
    merge: (id: string, quantity: number) =>
      http.post<{ user: MeDTO }>(`/markets/${id}/merge`, { quantity }).then(r => r.data.user),
  },
  me: {
    get: () => http.get<{ user: MeDTO }>('/me').then(r => r.data.user),
    claim: () => http.post<{ user: MeDTO }>('/me/claim').then(r => r.data.user),
  },
  portfolio: {
    get: () => http.get<PortfolioDTO>('/portfolio').then(r => r.data),
  },
  orders: {
    list: (params: ListOrdersQuery = {}) =>
      http.get<{ orders: OrderDTO[]; nextCursor: string | null }>('/orders', { params }).then(r => r.data),
    place: (input: CreateOrderInput) => http.post<PlaceOrderResponse>('/orders', input).then(r => r.data),
    cancel: (id: string) => http.delete<{ order: OrderDTO }>(`/orders/${id}`).then(r => r.data.order),
  },
  activity: {
    list: (params: { limit?: number; cursor?: string }) =>
      http.get<Paginated<ActivityDTO>>('/activity', { params }).then(r => r.data),
  },
};
