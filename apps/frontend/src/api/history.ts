import { api } from './axios';

export async function getHistory(token?: string) {
  const { data } = await api.get<{ history: Array<{ id: string; orderType: string; qty: number; price: number; createdAt: Date }> }>('/history', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
