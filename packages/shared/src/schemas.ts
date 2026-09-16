import { z } from 'zod';
import { MAX_ORDER_QUANTITY, PRICE_MAX, PRICE_MIN } from './constants';

export const outcomeSchema = z.enum(['yes', 'no']);
export const orderSideSchema = z.enum(['buy', 'sell']);
export const timeInForceSchema = z.enum(['GTC', 'IOC']);
export const marketStatusSchema = z.enum(['open', 'closed', 'resolved']);
export const orderStatusSchema = z.enum(['open', 'filled', 'cancelled']);

const quantitySchema = z.int().min(1).max(MAX_ORDER_QUANTITY);

export const createOrderSchema = z.object({
  marketId: z.string().min(1),
  outcome: outcomeSchema,
  side: orderSideSchema,
  price: z.int().min(PRICE_MIN).max(PRICE_MAX),
  quantity: quantitySchema,
  /** GTC rests any unfilled remainder on the book; IOC cancels it (market order). */
  timeInForce: timeInForceSchema.default('GTC'),
});

export const splitMergeSchema = z.object({
  quantity: quantitySchema,
});

/** Opaque cursor pagination shared by every list endpoint. */
const pageFields = {
  cursor: z.string().min(1).max(100).optional(),
};

export const marketListQuerySchema = z.object({
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(100).default(24),
  category: z.string().trim().min(1).max(50).optional(),
  status: z.enum(['open', 'resolved', 'all']).default('open'),
  sort: z.enum(['volume', 'newest', 'ending']).default('volume'),
  q: z.string().trim().max(100).optional(),
});

export const priceHistoryQuerySchema = z.object({
  interval: z.enum(['1d', '1w', '1m', 'all']).default('1m'),
});

export const listOrdersQuerySchema = z.object({
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['open', 'all', 'closed']).default('all'),
  marketId: z.string().min(1).optional(),
});

export const paginationQuerySchema = z.object({
  ...pageFields,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createMarketSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case')
    .max(120)
    .optional(),
  title: z.string().trim().min(10).max(200),
  description: z.string().trim().min(1).max(5_000),
  rules: z.string().trim().min(1).max(5_000),
  category: z.string().trim().min(1).max(50),
  imageUrl: z.url().optional(),
  endDate: z.iso.datetime(),
});

export const resolveMarketSchema = z.object({
  outcome: outcomeSchema,
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type SplitMergeInput = z.infer<typeof splitMergeSchema>;
export type MarketListQuery = z.input<typeof marketListQuerySchema>;
export type ListOrdersQuery = z.input<typeof listOrdersQuerySchema>;
export type PriceHistoryQuery = z.input<typeof priceHistoryQuerySchema>;
export type CreateMarketInput = z.infer<typeof createMarketSchema>;
export type ResolveMarketInput = z.infer<typeof resolveMarketSchema>;
