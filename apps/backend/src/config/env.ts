import { z } from 'zod';
import { DAILY_CLAIM_CENTS } from '@repo/shared';

const flag = z
  .enum(['0', '1', 'true', 'false'])
  .default('0')
  .transform(v => v === '1' || v === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform(v =>
        v
          .split(',')
          .map(o => o.trim())
          .filter(Boolean),
      ),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    SUPABASE_URL: z
      .url({
        protocol: /^https?$/,
        error: 'must be the Supabase project URL (https://<ref>.supabase.co), not a database connection string',
      })
      .optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    ADMIN_API_KEY: z.string().min(32, 'ADMIN_API_KEY must be at least 32 characters').optional(),
    STARTING_BALANCE_CENTS: z.coerce.number().int().min(0).default(1_000),
    DAILY_CLAIM_CENTS: z.coerce.number().int().min(0).default(DAILY_CLAIM_CENTS),
    AUTH_DEV_BYPASS: flag,
    RATE_LIMIT_ENABLED: z
      .enum(['0', '1', 'true', 'false'])
      .optional()
      .transform(v => (v === undefined ? undefined : v === '1' || v === 'true')),
  })
  .superRefine((env, ctx) => {
    if (env.AUTH_DEV_BYPASS && env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['AUTH_DEV_BYPASS'], message: 'must not be enabled in production' });
    }
    if (!env.AUTH_DEV_BYPASS) {
      if (!env.SUPABASE_URL) ctx.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'is required' });
      if (!env.SUPABASE_SECRET_KEY) {
        ctx.addIssue({ code: 'custom', path: ['SUPABASE_SECRET_KEY'], message: 'is required' });
      }
    }
  })
  .transform(env => ({
    ...env,
    LOG_LEVEL: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
    RATE_LIMIT_ENABLED: env.RATE_LIMIT_ENABLED ?? env.NODE_ENV !== 'test',
  }));

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  // Treat `KEY=` lines in .env files as unset so optional values and defaults apply.
  const normalized = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const problems = result.error.issues.map(i => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
