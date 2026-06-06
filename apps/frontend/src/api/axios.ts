import Axios from 'axios';

// NOTE: backend runs on 3000 in dev. Vite can proxy /api to the backend if configured.
export const api = Axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 15000,
});

api.interceptors.response.use(
  res => res,
  err => {
    // normalize error shape
    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Request failed';
    err.message = msg;
    return Promise.reject(err);
  }
);
