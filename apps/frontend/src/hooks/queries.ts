import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, MarketListQuery, PriceHistoryQuery } from '@repo/shared';
import { api } from '../api/endpoints';
import { useAuth } from '../providers/AuthProvider';

/** User-scoped keys all start with 'user' so they can be dropped together on sign-out. */
export const queryKeys = {
  markets: (params: MarketListQuery) => ['markets', 'list', params] as const,
  categories: ['markets', 'categories'] as const,
  market: (idOrSlug: string) => ['markets', 'detail', idOrSlug] as const,
  orderBook: (id: string) => ['markets', 'orderbook', id] as const,
  trades: (id: string) => ['markets', 'trades', id] as const,
  prices: (id: string, interval: PriceHistoryQuery['interval']) => ['markets', 'prices', id, interval] as const,
  me: (userId: string | null) => ['user', userId, 'me'] as const,
  portfolio: (userId: string | null) => ['user', userId, 'portfolio'] as const,
  orders: (userId: string | null, params: object) => ['user', userId, 'orders', params] as const,
  activity: (userId: string | null) => ['user', userId, 'activity'] as const,
};

export function useMarkets(params: MarketListQuery) {
  return useQuery({
    queryKey: queryKeys.markets(params),
    queryFn: () => api.markets.list(params),
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

export function useOrderBook(marketId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orderBook(marketId ?? ''),
    queryFn: () => api.markets.orderBook(marketId!),
    enabled: Boolean(marketId),
    refetchInterval: 4_000,
  });
}

export function useTrades(marketId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trades(marketId ?? ''),
    queryFn: () => api.markets.trades(marketId!),
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

export function useOrders(params: { status?: 'open' | 'all'; marketId?: string } = {}) {
  const { status, userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders(userId, params),
    queryFn: () => api.orders.list(params),
    enabled: status === 'authenticated',
    refetchInterval: 10_000,
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
