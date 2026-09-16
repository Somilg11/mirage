# backend

Express 5 REST API for Mirage: central limit order book, portfolio, activity ledger and market administration.

## Scripts

| Command                                | Description                                                       |
| -------------------------------------- | ----------------------------------------------------------------- |
| `bun run dev`                          | Start with file watching                                          |
| `bun run start`                        | Start without watching                                            |
| `bun run test`                         | Unit tests; integration tests too when `TEST_DATABASE_URL` is set |
| `bun run lint` / `bun run check-types` | Static checks                                                     |
| `bun run db:seed`                      | Seed demo markets, price history and liquidity (idempotent)       |

Copy `.env.example` to `.env`. The Prisma client must be generated first (`bun run db:generate` in `packages/db`).

## Layout

```
src/
  index.ts          process bootstrap and graceful shutdown
  app.ts            express app factory (security, logging, routes)
  config/env.ts     validated environment
  engine/           pure matching and settlement math (no I/O)
  services/         database-backed use cases
  routes/           thin HTTP handlers
  middleware/       auth, admin, rate limiting, errors
scripts/seed.ts     demo data
tests/              unit (engine) and integration (HTTP + Postgres)
```

## Order book model

Every order is projected onto one book quoted in YES terms: Buy YES and Sell NO are bids,
Sell YES and Buy NO are asks (NO prices become `100 - price`). A crossing bid and ask can
transfer YES, transfer NO, mint a new YES/NO pair or merge a pair back into cash; execution
is at the maker's price with price-time priority and self-trade prevention.

Buy orders escrow cash at their limit; sell orders escrow shares. Each placement runs in one
transaction holding a row lock on the market, so matching is serialized per market.

## API

All routes live under `/api`. Errors use `{ "error": { "code", "message", "details?" } }`.

| Method | Path                                                                         | Auth          |
| ------ | ---------------------------------------------------------------------------- | ------------- |
| GET    | `/health`                                                                    | –             |
| GET    | `/markets?category&status=open\|resolved\|all&sort=volume\|newest\|ending&q` | –             |
| GET    | `/markets/categories`                                                        | –             |
| GET    | `/markets/:idOrSlug`                                                         | –             |
| GET    | `/markets/:idOrSlug/orderbook`                                               | –             |
| GET    | `/markets/:idOrSlug/trades?limit`                                            | –             |
| GET    | `/markets/:idOrSlug/prices?interval=1d\|1w\|1m\|all`                         | –             |
| POST   | `/markets/:idOrSlug/split` `{ quantity }`                                    | user          |
| POST   | `/markets/:idOrSlug/merge` `{ quantity }`                                    | user          |
| GET    | `/me`                                                                        | user          |
| POST   | `/me/claim`                                                                  | user          |
| GET    | `/portfolio`                                                                 | user          |
| GET    | `/activity?limit&cursor`                                                     | user          |
| GET    | `/orders?status=open\|all&marketId`                                          | user          |
| POST   | `/orders` `{ marketId, outcome, side, price, quantity, timeInForce }`        | user          |
| DELETE | `/orders/:id`                                                                | user          |
| POST   | `/admin/markets`                                                             | `x-admin-key` |
| POST   | `/admin/markets/:idOrSlug/resolve` `{ outcome }`                             | `x-admin-key` |

User routes expect `Authorization: Bearer <supabase access token>`.
