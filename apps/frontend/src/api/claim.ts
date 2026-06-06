import { api } from './axios';

export async function claimDaily(token?: string) {
  const { data } = await api.post<{ message: string }>('/claim-daily', {}, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
