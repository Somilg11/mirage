import { api } from './axios';
import type { BalanceResponse } from '../types/api';

export async function getBalance(token?: string) {
  const { data } = await api.get<BalanceResponse>('/balance', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
