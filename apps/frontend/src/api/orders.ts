import { api } from './axios';
import type { CreateOrderRequest, OrderOkResponse } from '../types/api';

export async function postOrder(req: CreateOrderRequest, token?: string) {
  const { data } = await api.post<OrderOkResponse>('/order', req, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}

export async function buy(req: CreateOrderRequest, token?: string) {
  const { data } = await api.post<OrderOkResponse>('/buy', req, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}

export async function sell(req: CreateOrderRequest, token?: string) {
  const { data } = await api.post<OrderOkResponse>('/sell', req, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}

export async function getOrders(token?: string) {
  const { data } = await api.get<{ orders: Array<{ id: string; orderType: string; qty: number; price: number; createdAt: Date }> }>('/orders', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
