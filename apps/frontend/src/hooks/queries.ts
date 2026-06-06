import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderRequest } from '../types/api';
import { getMarketList, getMarket } from '../api/markets';
import { getBalance } from '../api/balance';
import { getPositions } from '../api/positions';
import { buy, sell } from '../api/orders';

export const queryKeys = {
  markets: ['markets'] as const,
  market: (id: string) => ['market', id] as const,
  balance: ['balance'] as const,
  positions: ['positions'] as const,
};

export function useMarkets() {
  return useQuery({ queryKey: queryKeys.markets, queryFn: getMarketList });
}

export function useMarket(id: string) {
  return useQuery({ queryKey: queryKeys.market(id), queryFn: () => getMarket(id), enabled: !!id });
}

export function useBalance(token?: string) {
  return useQuery({ queryKey: queryKeys.balance, queryFn: () => getBalance(token), enabled: !!token });
}

export function usePositions(token?: string) {
  return useQuery({ queryKey: queryKeys.positions, queryFn: () => getPositions(token), enabled: !!token });
}

export function useBuyMarket(token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateOrderRequest) => buy(req, token),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.markets }),
        qc.invalidateQueries({ queryKey: queryKeys.market(vars.marketId) }),
        qc.invalidateQueries({ queryKey: queryKeys.balance }),
        qc.invalidateQueries({ queryKey: queryKeys.positions }),
      ]);
    },
  });
}

export function useSellMarket(token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateOrderRequest) => sell(req, token),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.markets }),
        qc.invalidateQueries({ queryKey: queryKeys.market(vars.marketId) }),
        qc.invalidateQueries({ queryKey: queryKeys.balance }),
        qc.invalidateQueries({ queryKey: queryKeys.positions }),
      ]);
    },
  });
}
