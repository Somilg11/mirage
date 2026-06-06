import { api } from './axios';
import type { MarketListResponse, MarketResponse } from '../types/api';

export async function getMarketList() {
  const { data } = await api.get<MarketListResponse>('/api/market-list');
  return data;
}

export async function getMarket(id: string) {
  const { data } = await api.get<MarketResponse>(`/market`, { params: { marketId: id } });
  return data;
}
