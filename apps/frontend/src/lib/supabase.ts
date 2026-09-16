import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isAuthConfigured } from './env';

/** Single shared client; null when auth env vars are not configured. */
export const supabase: SupabaseClient | null = isAuthConfigured
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!)
  : null;
