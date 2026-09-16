# API reference

REST API served by `apps/backend` (Express 5). Every route is mounted under `/api`. Request and response types are defined once in `packages/shared` (zod schemas in `schemas.ts`, DTOs in `types.ts`) and shared by the backend and the web app.

Related documents: [Core exchange logic](./core.md) · [Architecture](./architecture.md) · [Roadmap](./plan.md)

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Rate limits, CORS, headers](#rate-limits-cors-and-headers)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Markets](#markets)
  - [Account](#account)
  - [Orders](#orders)
  - [Admin](#admin)
- [DTO reference](#dto-reference)

---

## Conventions

| Topic         | Convention                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Base URL      | `https://<api-host>/api` (local: `http://localhost:3000/api`; the web dev server proxies `/api`)        |
| Format        | JSON request and response bodies, `Content-Type: application/json`, max body 100 KB                     |
| Money         | Integer **cents**. `balance: 12345` is $123.45                                                          |
| Prices        | Integer cents per share, `1`–`99`. Fields documented as "YES price" are in YES terms (see [core.md §3](./core.md#3-the-unified-book-yes-terms)) |
| Dates         | ISO-8601 UTC strings                                                                                    |
| Enums         | Lowercase in the API (`yes`, `buy`, `open`); `timeInForce` is `GTC` or `IOC`                            |
| Identifiers   | Market routes accept either the market `id` (UUID) or its `slug` in `:id`                               |
| Request ids   | Send `X-Request-Id` (≤128 chars) to correlate logs; the response always echoes/assigns `X-Request-Id`   |

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "formErrors": [], "fieldErrors": { "price": ["Too big: expected number to be <=99"] } }
  }
}
```

`details` is present for validation errors (zod `flattenError` output). The full list of codes is in [core.md §17](./core.md#17-error-codes).

### Pagination

List endpoints that can grow unbounded use opaque cursor pagination:

| Query param | Type   | Notes                                                           |
| ----------- | ------ | --------------------------------------------------------------- |
| `limit`     | int    | Page size, `1`–`100`. Default varies per endpoint.              |
| `cursor`    | string | Value of `nextCursor` from the previous page. Omit for page one. |

The response carries `nextCursor: string | null`; `null` means there are no more pages. Cursors are opaque (currently the id of the last item) and are only valid with the same filters and sort. Applies to `GET /markets`, `GET /markets/:id/trades`, `GET /orders`, `GET /activity`.

```bash
# page 1
curl "http://localhost:3000/api/markets?limit=24"
# page 2
curl "http://localhost:3000/api/markets?limit=24&cursor=5d41effa-525e-4688-b9c3-e078f9f1754e"
```

---

## Authentication

| Mode             | How to authenticate                                 | Used for                                   |
| ---------------- | --------------------------------------------------- | ------------------------------------------ |
| Public           | nothing                                             | health, market data                        |
| User             | `Authorization: Bearer <Supabase access token>`     | account, orders, split/merge               |
| Dev bypass       | `X-Dev-Address: <any address>` (no token)           | local development and tests only           |
| Admin            | `X-Admin-Key: <ADMIN_API_KEY>`                      | market creation and resolution             |

### User flow

1. The web app signs in with **Supabase Web3 (Solana)**: `supabase.auth.signInWithWeb3({ chain: 'solana' })`. The wallet signs a message; Supabase issues a session.
2. Every API call sends the session's access token as a bearer token.
3. `requireAuth` validates the token server-side with `supabase.auth.getUser(token)` using `SUPABASE_URL` + `SUPABASE_SECRET_KEY`.
4. The wallet address is read from `user.user_metadata.custom_claims.address`. Missing claim → `403 FORBIDDEN`; address longer than 128 chars → `403`.
5. The user row is upserted by address. A new row starts with `STARTING_BALANCE_CENTS` (default 1000 = $10).

Failures: no/invalid `Authorization` header → `401 UNAUTHORIZED` (`Missing bearer token`); rejected token → `401` (`Invalid or expired session`).

### Dev bypass

With `AUTH_DEV_BYPASS=1` the server skips Supabase and authenticates every protected request as the address in `X-Dev-Address` (default `dev-address` when the header is absent). Startup fails if this flag is combined with `NODE_ENV=production`.

```bash
curl -H "X-Dev-Address: alice" http://localhost:3000/api/me
```

### Admin key

Admin routes require `X-Admin-Key` to equal `ADMIN_API_KEY` (≥32 chars, compared in constant time). When `ADMIN_API_KEY` is not configured every admin route returns `404`, hiding the surface entirely. A wrong key returns `401`.

> Routing note: the account router is mounted at the API root with `requireAuth`, so an unknown path under `/api` is authenticated before it can 404. Without credentials (and without dev bypass) an unknown `/api/*` path returns `401`, not `404`.

---

## Rate limits, CORS and headers

| Limiter  | Scope                                               | Limit                 | Key                 |
| -------- | --------------------------------------------------- | --------------------- | ------------------- |
| Global   | every `/api/*` route except `/api/health`           | 300 requests / minute | client IP           |
| Orders   | `POST /api/orders` (applied after authentication)   | 30 requests / minute  | user id (IP fallback) |

- Exceeding a limit returns `429 RATE_LIMITED`.
- Standard IETF draft-8 `RateLimit` and `RateLimit-Policy` headers are sent; legacy `X-RateLimit-*` headers are not.
- Limits are on by default and off when `NODE_ENV=test`; override with `RATE_LIMIT_ENABLED`.
- Behind a proxy set `TRUST_PROXY` to the number of hops so client IPs are correct.

**CORS**: origins come from `CORS_ORIGINS` (comma-separated; `*` reflects any origin). Allowed request headers: `Authorization`, `Content-Type`, `X-Request-Id`, `X-Dev-Address`. Exposed: `X-Request-Id`. Preflight cache: 600 s.

**Security headers**: Helmet defaults (CSP for API responses, `X-Content-Type-Options`, `Strict-Transport-Security`, frame protections, etc.). `X-Powered-By` is disabled. Logs redact `Authorization`, `Cookie` and `X-Admin-Key`.

---

## Endpoints

### Summary

| Method | Path                                   | Auth  | Description                                  |
| ------ | -------------------------------------- | ----- | -------------------------------------------- |
| GET    | `/api/health`                          | –     | Liveness and database probe                  |
| GET    | `/api/markets`                         | –     | Paginated, filterable market list            |
| GET    | `/api/markets/categories`              | –     | Categories with open-market counts           |
| GET    | `/api/markets/:id`                     | –     | Market detail                                |
| GET    | `/api/markets/:id/orderbook`           | –     | Aggregated YES and NO order books            |
| GET    | `/api/markets/:id/trades`              | –     | Paginated trade tape                         |
| GET    | `/api/markets/:id/prices`              | –     | Bucketed YES price history                   |
| POST   | `/api/markets/:id/split`               | User  | Convert cash into YES + NO pairs             |
| POST   | `/api/markets/:id/merge`               | User  | Convert YES + NO pairs into cash             |
| GET    | `/api/me`                              | User  | Current account and balances                 |
| POST   | `/api/me/claim`                        | User  | Claim the daily reward                       |
| GET    | `/api/portfolio`                       | User  | Cash, positions, valuation and P&L           |
| GET    | `/api/activity`                        | User  | Paginated balance ledger                     |
| GET    | `/api/orders`                          | User  | Paginated order history                      |
| POST   | `/api/orders`                          | User  | Place an order                               |
| DELETE | `/api/orders/:id`                      | User  | Cancel an open order                         |
| POST   | `/api/admin/markets`                   | Admin | Create a market                              |
| POST   | `/api/admin/markets/:id/resolve`       | Admin | Resolve a market and pay winners             |

---

### Health

#### `GET /api/health`

Not rate limited, not request-logged.

```json
{ "status": "ok", "uptime": 5321.42, "db": "ok" }
```

Returns `503` with `{ "status": "degraded", "uptime": …, "db": "error" }` when `SELECT 1` fails.

---

### Markets

#### `GET /api/markets`

Public. Paginated list of markets with live pricing.

| Query      | Type                                   | Default   | Constraints / behaviour                                             |
| ---------- | -------------------------------------- | --------- | ------------------------------------------------------------------- |
| `status`   | `open` \| `resolved` \| `all`          | `open`    | `open` = stored `Open` **and** `endDate > now`                      |
| `sort`     | `volume` \| `newest` \| `ending`       | `volume`  | `volume` desc; `createdAt` desc; `endDate` asc (ties by id)         |
| `category` | string                                 | –         | 1–50 chars, case-insensitive exact match                             |
| `q`        | string                                 | –         | ≤100 chars, case-insensitive substring of the title                 |
| `limit`    | int                                    | `24`      | 1–100                                                                |
| `cursor`   | string                                 | –         | ≤100 chars                                                            |

```bash
curl "http://localhost:3000/api/markets?category=Crypto&sort=volume&limit=2"
```

```json
{
  "markets": [
    {
      "id": "0b7c1e4a-3f8e-4a61-9d2b-6f1c2d9b7a10",
      "slug": "bitcoin-above-150k",
      "title": "Will Bitcoin trade above $150,000 by April 2027?",
      "category": "Crypto",
      "imageUrl": null,
      "status": "open",
      "resolution": null,
      "endDate": "2027-04-04T18:23:51.053Z",
      "createdAt": "2026-08-15T18:23:51.053Z",
      "yesPrice": 48,
      "noPrice": 52,
      "bestBid": 47,
      "bestAsk": 49,
      "lastPrice": 47,
      "change24h": 1,
      "volume": 790412
    }
  ],
  "nextCursor": "0b7c1e4a-3f8e-4a61-9d2b-6f1c2d9b7a10"
}
```

Errors: `400 VALIDATION_ERROR` (e.g. `sort=bogus`).

#### `GET /api/markets/categories`

Public. Categories of currently tradable markets, sorted by count desc then name.

```json
{ "categories": [{ "name": "Crypto", "count": 2 }, { "name": "Politics", "count": 2 }] }
```

#### `GET /api/markets/:id`

Public. `:id` is an id or slug. Returns `MarketDetail`.

```json
{
  "market": {
    "id": "0b7c1e4a-3f8e-4a61-9d2b-6f1c2d9b7a10",
    "slug": "bitcoin-above-150k",
    "title": "Will Bitcoin trade above $150,000 by April 2027?",
    "category": "Crypto",
    "imageUrl": null,
    "status": "open",
    "resolution": null,
    "endDate": "2027-04-04T18:23:51.053Z",
    "createdAt": "2026-08-15T18:23:51.053Z",
    "yesPrice": 48,
    "noPrice": 52,
    "bestBid": 47,
    "bestAsk": 49,
    "lastPrice": 47,
    "change24h": 1,
    "volume": 790412,
    "description": "Tracks whether BTC/USD prints above $150,000 on a major spot exchange before the market closes.",
    "rules": "Resolves YES if ...",
    "resolvedAt": null,
    "openInterest": 15804,
    "traders": 3
  }
}
```

`openInterest` is the total YES shares held (equals outstanding pairs). `traders` counts distinct users with a position or order in the market. Errors: `404 NOT_FOUND`.

#### `GET /api/markets/:id/orderbook`

Public. Aggregated remaining size per price level, ≤50 levels per side. See [core.md §14](./core.md#14-order-book-aggregation).

```json
{
  "marketId": "0b7c1e4a-3f8e-4a61-9d2b-6f1c2d9b7a10",
  "yes": {
    "bids": [{ "price": 47, "quantity": 54 }, { "price": 46, "quantity": 116 }],
    "asks": [{ "price": 49, "quantity": 118 }, { "price": 50, "quantity": 552 }]
  },
  "no": {
    "bids": [{ "price": 51, "quantity": 118 }, { "price": 50, "quantity": 552 }],
    "asks": [{ "price": 53, "quantity": 54 }, { "price": 54, "quantity": 116 }]
  }
}
```

Errors: `404`.

#### `GET /api/markets/:id/trades`

Public. Newest first.

| Query    | Type   | Default | Constraints |
| -------- | ------ | ------- | ----------- |
| `limit`  | int    | `50`    | 1–100       |
| `cursor` | string | –       | ≤100 chars  |

```json
{
  "trades": [
    {
      "id": "7f2b0c61-8f3a-4f55-a0a1-2f4f5b1c9e22",
      "price": 47,
      "quantity": 30,
      "takerOutcome": "no",
      "takerSide": "buy",
      "createdAt": "2026-09-17T00:40:12.331Z"
    }
  ],
  "nextCursor": null
}
```

`price` is the execution price in YES terms. The taker's own price is `price` for YES trades and `100 − price` for NO trades. Errors: `400`, `404`.

#### `GET /api/markets/:id/prices`

Public. Bucketed YES price series (see [core.md §13.4](./core.md#134-price-history)).

| Query      | Type                              | Default |
| ---------- | --------------------------------- | ------- |
| `interval` | `1d` \| `1w` \| `1m` \| `all`     | `1m`    |

```json
{
  "points": [
    { "t": "2026-08-18T00:40:00.000Z", "price": 36 },
    { "t": "2026-08-18T06:00:00.000Z", "price": 38 },
    { "t": "2026-09-17T00:41:03.120Z", "price": 47 }
  ]
}
```

Empty `points` when the market has never traded. Errors: `400`, `404`.

#### `POST /api/markets/:id/split`

User. Converts `100 × quantity` cents into `quantity` YES and `quantity` NO shares.

| Body field | Type | Constraints   |
| ---------- | ---- | ------------- |
| `quantity` | int  | 1–100,000     |

```bash
curl -X POST http://localhost:3000/api/markets/bitcoin-above-150k/split \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity": 5}'
```

Response: `{ "user": MeDTO }`. Errors: `400 VALIDATION_ERROR`, `400 INSUFFICIENT_BALANCE`, `401`, `404`, `409 MARKET_CLOSED`.

#### `POST /api/markets/:id/merge`

User. Converts `quantity` unlocked YES + `quantity` unlocked NO into `100 × quantity` cents. Allowed after `endDate` until resolution.

Body and response as split. Errors: `400 INSUFFICIENT_SHARES`, `401`, `404`, `409 MARKET_CLOSED` (resolved).

---

### Account

All routes require user authentication.

#### `GET /api/me`

```json
{
  "user": {
    "id": "c751f26a-a0c2-4a40-bb57-02c3a21730ed",
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "balance": 4615,
    "lockedBalance": 800,
    "lastClaimAt": "2026-09-16T18:31:30.169Z",
    "nextClaimAt": "2026-09-17T00:00:00.000Z",
    "createdAt": "2026-09-16T18:30:02.004Z"
  }
}
```

`balance` is spendable cash; `lockedBalance` is cash escrowed by open buy orders. `nextClaimAt` is `null` when the daily reward can be claimed now.

#### `POST /api/me/claim`

Credits `DAILY_CLAIM_CENTS` (default 10000) once per UTC day. No body.

Response: `{ "user": MeDTO }`. Errors: `409 ALREADY_CLAIMED`.

#### `GET /api/portfolio`

```json
{
  "cash": 4615,
  "lockedCash": 800,
  "positionsValue": 5510,
  "totalValue": 10925,
  "unrealizedPnl": -75,
  "positions": [
    {
      "market": {
        "id": "80620289-fef5-4410-bdca-05d2bf5038d7",
        "slug": "sequel-tops-box-office",
        "title": "Will a sequel be this year's highest-grossing film worldwide?",
        "category": "Culture",
        "imageUrl": null,
        "status": "open",
        "resolution": null
      },
      "outcome": "yes",
      "quantity": 20,
      "lockedQuantity": 10,
      "avgPrice": 86,
      "costBasis": 1720,
      "currentPrice": 85,
      "value": 1700,
      "pnl": -20
    }
  ]
}
```

Only positions with `quantity > 0`, most recently updated first. Formulas in [core.md §10](./core.md#10-cost-basis-average-price-and-pl).

#### `GET /api/activity`

Paginated ledger, newest first.

| Query    | Type   | Default | Constraints |
| -------- | ------ | ------- | ----------- |
| `limit`  | int    | `50`    | 1–100       |
| `cursor` | string | –       | ≤100 chars  |

```json
{
  "items": [
    {
      "id": "d3a8a3d4-9c1b-44a9-8a7a-3b4c4f0b2c11",
      "type": "buy",
      "market": { "id": "…", "slug": "fed-rate-cut-next-meeting", "title": "…", "category": "Economy", "imageUrl": null, "status": "open", "resolution": null },
      "outcome": "yes",
      "quantity": 25,
      "price": 71,
      "amount": -1775,
      "createdAt": "2026-09-17T00:40:21.114Z"
    },
    {
      "id": "0e7f9d27-8f0a-4bb2-9ad4-3ffb2e3d7a01",
      "type": "claim",
      "market": null,
      "outcome": null,
      "quantity": null,
      "price": null,
      "amount": 10000,
      "createdAt": "2026-09-17T00:01:05.000Z"
    }
  ],
  "nextCursor": null
}
```

Activity types: `claim`, `buy`, `sell` (one row per fill), `split`, `merge`, `payout`. `amount` is the signed cash delta of the event.

---

### Orders

All routes require user authentication.

#### `GET /api/orders`

| Query      | Type                              | Default | Behaviour                                                |
| ---------- | --------------------------------- | ------- | -------------------------------------------------------- |
| `status`   | `open` \| `closed` \| `all`       | `all`   | `closed` = `filled` or `cancelled`                       |
| `marketId` | string                            | –       | Market **id** (slugs are not resolved on this filter)    |
| `limit`    | int                               | `50`    | 1–100                                                    |
| `cursor`   | string                            | –       | ≤100 chars                                               |

```json
{
  "orders": [
    {
      "id": "7ce23106-0e90-4a66-ace9-11030a853f4e",
      "market": { "id": "…", "slug": "ai-imo-gold", "title": "…", "category": "Tech", "imageUrl": null, "status": "open", "resolution": null },
      "outcome": "yes",
      "side": "buy",
      "price": 40,
      "quantity": 20,
      "filledQuantity": 0,
      "status": "open",
      "timeInForce": "GTC",
      "createdAt": "2026-09-17T00:40:22.009Z",
      "updatedAt": "2026-09-17T00:40:22.009Z"
    }
  ],
  "nextCursor": null
}
```

#### `POST /api/orders`

Places a limit order (GTC) or a marketable order (IOC). Additional per-user limit of 30/minute.

| Body field    | Type                 | Default | Constraints                                   |
| ------------- | -------------------- | ------- | --------------------------------------------- |
| `marketId`    | string               | –       | Market id **or slug**                         |
| `outcome`     | `yes` \| `no`        | –       |                                               |
| `side`        | `buy` \| `sell`      | –       |                                               |
| `price`       | int                  | –       | 1–99, limit price in the outcome's own terms  |
| `quantity`    | int                  | –       | 1–100,000 shares                              |
| `timeInForce` | `GTC` \| `IOC`       | `GTC`   |                                               |

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"marketId":"bitcoin-above-150k","outcome":"yes","side":"buy","price":50,"quantity":100,"timeInForce":"GTC"}'
```

`201 Created`:

```json
{
  "order": {
    "id": "a1d6a1b4-3a57-4a1d-9f53-1c5e0b1f2e70",
    "market": { "id": "…", "slug": "bitcoin-above-150k", "title": "…", "category": "Crypto", "imageUrl": null, "status": "open", "resolution": null },
    "outcome": "yes",
    "side": "buy",
    "price": 50,
    "quantity": 100,
    "filledQuantity": 64,
    "status": "open",
    "timeInForce": "GTC",
    "createdAt": "2026-09-17T01:02:03.004Z",
    "updatedAt": "2026-09-17T01:02:03.004Z"
  },
  "fills": [
    { "price": 49, "quantity": 18 },
    { "price": 50, "quantity": 46 }
  ],
  "averagePrice": 49.72
}
```

`fills[].price` and `averagePrice` are in the order's own outcome terms.

| Status | Code                   | When                                                  |
| ------ | ---------------------- | ----------------------------------------------------- |
| 400    | `VALIDATION_ERROR`     | Schema violation                                      |
| 400    | `INSUFFICIENT_BALANCE` | Buy cost exceeds spendable cash                       |
| 400    | `INSUFFICIENT_SHARES`  | Sell quantity exceeds unlocked shares                 |
| 404    | `NOT_FOUND`            | Unknown market                                        |
| 409    | `MARKET_CLOSED`        | Market resolved or past `endDate`                     |
| 409    | `NO_LIQUIDITY`         | IOC with nothing to match                             |
| 429    | `RATE_LIMITED`         | Order limit exceeded                                  |

#### `DELETE /api/orders/:id`

Cancels an open order and refunds its unfilled escrow.

Response: `{ "order": OrderDTO }` with `status: "cancelled"`. Errors: `404 NOT_FOUND` (unknown or not owned), `409 ORDER_NOT_OPEN`.

---

### Admin

Requires `X-Admin-Key`. Returns `404` for every route when `ADMIN_API_KEY` is unset.

#### `POST /api/admin/markets`

| Body field    | Type     | Constraints                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `title`       | string   | 10–200 chars (trimmed)                                                       |
| `description` | string   | 1–5000 chars                                                                 |
| `rules`       | string   | 1–5000 chars; resolution criteria shown to traders                          |
| `category`    | string   | 1–50 chars                                                                   |
| `endDate`     | string   | ISO-8601 datetime, must be in the future                                     |
| `slug`        | string?  | kebab-case, ≤120 chars. Default: slugified title; a random suffix is appended on collision |
| `imageUrl`    | string?  | absolute URL                                                                 |

```bash
curl -X POST http://localhost:3000/api/admin/markets \
  -H "X-Admin-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Will it rain in London tomorrow?","description":"Daily weather market.","rules":"Resolves YES if the Met Office records measurable rain at Heathrow.","category":"Science","endDate":"2026-12-31T00:00:00Z"}'
```

`201 Created`: `{ "market": MarketDetail }`. Errors: `400 VALIDATION_ERROR`, `401`, `404`, `409 CONFLICT` (explicit slug taken).

#### `POST /api/admin/markets/:id/resolve`

| Body field | Type          |
| ---------- | ------------- |
| `outcome`  | `yes` \| `no` |

Cancels open orders with refunds, pays 100¢ per winning share, zeroes positions and marks the market resolved (see [core.md §12](./core.md#12-market-lifecycle-and-resolution)).

Response: `{ "market": MarketDetail }` with `status: "resolved"`. Errors: `400`, `401`, `404`, `409 MARKET_CLOSED` (already resolved).

---

## DTO reference

Mirrors `packages/shared/src/types.ts`.

```ts
type Outcome = 'yes' | 'no';
type OrderSide = 'buy' | 'sell';
type TimeInForce = 'GTC' | 'IOC';
type MarketStatus = 'open' | 'closed' | 'resolved';
type OrderStatus = 'open' | 'filled' | 'cancelled';
type ActivityType = 'claim' | 'buy' | 'sell' | 'split' | 'merge' | 'payout';

interface MarketRef {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  status: MarketStatus;
  resolution: Outcome | null;
}

interface MarketSummary extends MarketRef {
  endDate: string;
  createdAt: string;
  yesPrice: number | null; // implied YES probability in cents
  noPrice: number | null;
  bestBid: number | null; // YES terms
  bestAsk: number | null; // YES terms
  lastPrice: number | null; // last trade, YES terms
  change24h: number | null; // cents / percentage points
  volume: number; // cents, taker-side notional
}

interface MarketDetail extends MarketSummary {
  description: string;
  rules: string;
  resolvedAt: string | null;
  openInterest: number;
  traders: number;
}

interface BookLevel { price: number; quantity: number }
interface OutcomeBook { bids: BookLevel[]; asks: BookLevel[] }
interface OrderBookResponse { marketId: string; yes: OutcomeBook; no: OutcomeBook }

interface PricePoint { t: string; price: number } // YES cents

interface TradeDTO {
  id: string;
  price: number; // YES terms
  quantity: number;
  takerOutcome: Outcome;
  takerSide: OrderSide;
  createdAt: string;
}

interface MeDTO {
  id: string;
  address: string;
  balance: number;
  lockedBalance: number;
  lastClaimAt: string | null;
  nextClaimAt: string | null;
  createdAt: string;
}

interface PositionDTO {
  market: MarketRef;
  outcome: Outcome;
  quantity: number; // includes lockedQuantity
  lockedQuantity: number;
  avgPrice: number | null;
  costBasis: number;
  currentPrice: number | null;
  value: number;
  pnl: number;
}

interface PortfolioDTO {
  cash: number;
  lockedCash: number;
  positionsValue: number;
  totalValue: number;
  unrealizedPnl: number;
  positions: PositionDTO[];
}

interface OrderDTO {
  id: string;
  market: MarketRef;
  outcome: Outcome;
  side: OrderSide;
  price: number; // own terms
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: string;
  updatedAt: string;
}

interface FillDTO { price: number; quantity: number } // own terms
interface PlaceOrderResponse { order: OrderDTO; fills: FillDTO[]; averagePrice: number | null }

interface ActivityDTO {
  id: string;
  type: ActivityType;
  market: MarketRef | null;
  outcome: Outcome | null;
  quantity: number | null;
  price: number | null;
  amount: number; // signed cents
  createdAt: string;
}

interface Paginated<T> { items: T[]; nextCursor: string | null }

interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }
```

List endpoints other than `/activity` wrap their items under a named key (`markets`, `trades`, `orders`) next to `nextCursor` instead of using `Paginated<T>`.
