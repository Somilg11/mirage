import { useCallback } from 'react';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, ListOrdersQuery, MarketListQuery, PriceHistoryQuery } from '@repo/shared';
import { api } from '../api/endpoints';
import { useAuth } from '../providers/AuthProvider';
import { preload } from '../app/preload';

/** User-scoped keys all start with 'user' so they can be dropped together on sign-out. */
export const queryKeys = {
  markets: (params: MarketListQuery) => ['markets', 'list', params] as const,
  marketsInfinite: (params: MarketListQuery) => ['markets', 'list', 'infinite', params] as const,
  categories: ['markets', 'categories'] as const,
  market: (idOrSlug: string) => ['markets', 'detail', idOrSlug] as const,
  orderBook: (id: string) => ['markets', 'orderbook', id] as const,
  trades: (id: string) => ['markets', 'trades', id] as const,
  tradesInfinite: (id: string) => ['markets', 'trades', id, 'infinite'] as const,
  prices: (id: string, interval: PriceHistoryQuery['interval']) => ['markets', 'prices', id, interval] as const,
  me: (userId: string | null) => ['user', userId, 'me'] as const,
  portfolio: (userId: string | null) => ['user', userId, 'portfolio'] as const,
  orders: (userId: string | null, params: object) => ['user', userId, 'orders', params] as const,
  activity: (userId: string | null) => ['user', userId, 'activity'] as const,
};

/** First page of markets (used for overviews such as the ticker and movers). */
export function useMarkets(params: MarketListQuery) {
  return useQuery({
    queryKey: queryKeys.markets(params),
    queryFn: () => api.markets.list({ limit: 50, ...params }),
    select: data => data.markets,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

/** Cursor-paginated market list for browsing. */
export function useInfiniteMarkets(params: MarketListQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.marketsInfinite(params),
    queryFn: ({ pageParam }) => api.markets.list({ limit: 24, ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: api.markets.categories, staleTime: 60_000 });
}

export function useMarket(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.market(idOrSlug ?? ''),
    queryFn: () => api.markets.get(idOrSlug!),
    enabled: Boolean(idOrSlug),
    refetchInterval: 10_000,
  });
}

/**
 * Returns a handler that warms a market's data and page chunk before the user clicks,
 * so opening a market renders immediately instead of showing a skeleton.
 */
export function usePrefetchMarket() {
  const qc = useQueryClient();
  return useCallback(
    (market: { id: string; slug: string }) => {
      preload.market();
      void qc.prefetchQuery({
        queryKey: queryKeys.market(market.slug),
        queryFn: () => api.markets.get(market.slug),
        staleTime: 10_000,
      });
      void qc.prefetchQuery({
        queryKey: queryKeys.orderBook(market.id),
        queryFn: () => api.markets.orderBook(market.id),
        staleTime: 4_000,
      });
    },
    [qc],
  );
}

export function useOrderBook(marketId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orderBook(marketId ?? ''),
    queryFn: () => api.markets.orderBook(marketId!),
    enabled: Boolean(marketId),
    refetchInterval: 4_000,
  });
}

/** Most recent trades (first page only). */
export function useTrades(marketId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trades(marketId ?? ''),
    queryFn: () => api.markets.trades(marketId!, { limit: 30 }),
    select: data => data.trades,
    enabled: Boolean(marketId),
    refetchInterval: 8_000,
  });
}

export function useInfiniteTrades(marketId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.tradesInfinite(marketId ?? ''),
    queryFn: ({ pageParam }) => api.markets.trades(marketId!, { limit: 30, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    enabled: Boolean(marketId),
    refetchInterval: 8_000,
  });
}

export function usePriceHistory(marketId: string | undefined, interval: PriceHistoryQuery['interval']) {
  return useQuery({
    queryKey: queryKeys.prices(marketId ?? '', interval),
    queryFn: () => api.markets.prices(marketId!, { interval }),
    enabled: Boolean(marketId),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useMe() {
  const { status, userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.me(userId),
    queryFn: api.me.get,
    enabled: status === 'authenticated',
    refetchInterval: 30_000,
  });
}

export function usePortfolio() {
  const { status, userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.portfolio(userId),
    queryFn: api.portfolio.get,
    enabled: status === 'authenticated',
    refetchInterval: 15_000,
  });
}

/** First page of orders (up to 100), e.g. open orders on a market. */
export function useOrders(params: ListOrdersQuery = {}) {
  const { status, userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders(userId, params),
    queryFn: () => api.orders.list({ limit: 100, ...params }),
    select: data => data.orders,
    enabled: status === 'authenticated',
    refetchInterval: 10_000,
  });
}

export function useInfiniteOrders(params: ListOrdersQuery = {}) {
  const { status, userId } = useAuth();
  return useInfiniteQuery({
    queryKey: [...queryKeys.orders(userId, params), 'infinite'] as const,
    queryFn: ({ pageParam }) => api.orders.list({ limit: 25, ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    enabled: status === 'authenticated',
    refetchInterval: 15_000,
  });
}

export function useActivity() {
  const { status, userId } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.activity(userId),
    queryFn: ({ pageParam }) => api.activity.list({ limit: 30, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    enabled: status === 'authenticated',
  });
}

/** Refresh everything that a balance- or book-changing action can affect. */
function useInvalidateTradingState() {
  const qc = useQueryClient();
  return (marketId?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['user'] }),
      marketId
        ? qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'markets' && q.queryKey.includes(marketId) })
        : Promise.resolve(),
      qc.invalidateQueries({ queryKey: ['markets', 'list'] }),
      qc.invalidateQueries({ queryKey: ['markets', 'detail'] }),
    ]);
}

export function usePlaceOrder() {
  const invalidate = useInvalidateTradingState();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.orders.place(input),
    onSettled: (_data, _err, input) => invalidate(input.marketId),
  });
}

export function useCancelOrder() {
  const invalidate = useInvalidateTradingState();
  return useMutation({
    mutationFn: (orderId: string) => api.orders.cancel(orderId),
    onSettled: order => invalidate(order?.market.id),
  });
}

export function useClaimDaily() {
  const invalidate = useInvalidateTradingState();
  return useMutation({ mutationFn: api.me.claim, onSettled: () => invalidate() });
}

export function useSplitMerge() {
  const invalidate = useInvalidateTradingState();
  return useMutation({
    mutationFn: ({ action, marketId, quantity }: { action: 'split' | 'merge'; marketId: string; quantity: number }) =>
      action === 'split' ? api.markets.split(marketId, quantity) : api.markets.merge(marketId, quantity),
    onSettled: (_d, _e, vars) => invalidate(vars.marketId),
  });
}
