import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../types/express';
import { getEnv } from '../config/env';
import { forbidden, unauthorized } from '../lib/errors';
import { logger } from '../lib/logger';
import { findOrCreateUser } from '../services/users';

const DEV_ADDRESS_HEADER = 'x-dev-address';
const MAX_ADDRESS_LENGTH = 128;

let supabase: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error('Supabase is not configured');
  supabase ??= createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

async function resolveAddress(req: Request): Promise<string> {
  if (getEnv().AUTH_DEV_BYPASS) {
    return req.header(DEV_ADDRESS_HEADER)?.trim() || 'dev-address';
  }

  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) throw unauthorized('Missing bearer token');

  const { data, error } = await getSupabase().auth.getUser(token);
  if (error || !data.user) {
    logger.debug({ err: error }, 'supabase token rejected');
    throw unauthorized('Invalid or expired session');
  }

  // Supabase Web3 (Solana) sign-in stores the wallet address in custom claims.
  const address: unknown = data.user.user_metadata?.custom_claims?.address;
  if (typeof address !== 'string' || address.length === 0) {
    throw forbidden('Wallet address claim missing');
  }
  return address;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const address = await resolveAddress(req);
  if (address.length > MAX_ADDRESS_LENGTH) throw forbidden('Invalid wallet address');
  const user = await findOrCreateUser(address);
  req.user = { id: user.id, address: user.address };
  next();
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
