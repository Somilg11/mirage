import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env';
import { notFound, unauthorized } from '../lib/errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const expected = getEnv().ADMIN_API_KEY;
  // Hide admin routes entirely when no key is configured.
  if (!expected) throw notFound();

  const provided = Buffer.from(req.header('x-admin-key') ?? '');
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !timingSafeEqual(provided, target)) {
    throw unauthorized('Invalid admin key');
  }
  next();
}
