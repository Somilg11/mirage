import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { getEnv } from '../config/env';
import { HttpError } from '../lib/errors';

function limiter(windowMs: number, limit: number, keyGenerator?: (req: Request) => string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !getEnv().RATE_LIMIT_ENABLED,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED', 'Too many requests, slow down')),
  });
}

export const apiLimiter = limiter(60_000, 300);

/** Per-user limit for order placement; runs after authentication. */
export const orderLimiter = limiter(60_000, 30, req => req.user?.id ?? ipKeyGenerator(req.ip ?? ''));
