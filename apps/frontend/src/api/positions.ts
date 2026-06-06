import { api } from './axios';
import type { PositionsResponse } from '../types/api';

export async function getPositions(token?: string) {
  const { data } = await api.get<PositionsResponse>('/positions', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
