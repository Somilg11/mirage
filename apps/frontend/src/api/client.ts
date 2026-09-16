import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@repo/shared';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use(async config => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  res => res,
  (err: AxiosError<ApiErrorBody>) => {
    const body = err.response?.data?.error;
    if (err.response) {
      return Promise.reject(
        new ApiError(
          err.response.status,
          body?.code ?? 'HTTP_ERROR',
          body?.message ?? `Request failed with status ${err.response.status}`,
          body?.details,
        ),
      );
    }
    const message = err.code === 'ECONNABORTED' ? 'The request timed out' : 'Unable to reach the server';
    return Promise.reject(new ApiError(0, 'NETWORK_ERROR', message));
  },
);

export function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
