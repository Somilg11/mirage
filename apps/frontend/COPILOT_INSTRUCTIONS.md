# POLYMARKET FRONTEND IMPLEMENTATION GUIDE

## Objective

Build a production-grade frontend for my prediction market platform that closely matches the Polymarket UI and user experience.

This is NOT a demo application.

This is NOT a UI prototype.

This is a real application connected to a real backend and a real database.

---

# Project Structure

Monorepo:

```txt
apps/
 ├── frontend/
 └── backend/

packages/
```

Frontend:

```txt
React
Vite
TypeScript
React Router
TanStack Query
Axios
TailwindCSS
shadcn/ui
Zustand
Recharts
Lucide React
```

Backend already exists.

Database already exists.

Seeded data already exists.

---

# CRITICAL RULES

## Rule #1

Never create mock data.

Forbidden:

```ts
const fakeMarkets = [...]
const dummyMarkets = [...]
const sampleData = [...]
```

---

## Rule #2

Never hardcode:

- probabilities
- prices
- market volumes
- liquidity
- balances
- positions
- order counts

Everything must come from backend APIs.

---

## Rule #3

If backend returns empty arrays:

Show empty states.

Do NOT generate fake content.

---

## Rule #4

Use API response types as source of truth.

Before implementation:

1. Inspect every API response.
2. Create TypeScript interfaces.
3. Use actual backend fields.

Never guess field names.

---

# Existing Backend APIs

```http
GET    /api/market-list

GET    /market/:id

POST   /buy

POST   /sell

POST   /split

POST   /merge

GET    /positions

GET    /balance

GET    /orders

POST   /order
```

---

# Required Pages

## Home

Route:

```txt
/
```

Fetch:

```txt
GET /api/market-list
```

Display market cards.

Polymyrkytrkatrket-style grid.

Desktop:

```txt
3 columns
```

Tablet:

```txt
2 columns
```

Mobile:

```txt
1 column
```

Each card displays:

- market image
- market title
- probability
- volume
- liquidity
- expiry
- buy yes
- buy no

Click card:

```txt
/market/:id
```

---

## Market Detail

Route:

```txt
/market/:id
```

Fetch:

```txt
GET /market/:id
```

Layout should closely resemble Mirage.

### Left Section

Display:

- image
- title
- volume
- liquidity
- status
- end date

### Probability Chart

Use Recharts.

Support:

```txt
1H
6H
1D
1W
1M
ALL
```

Only display backend historical data.

No generated chart values.

### Outcomes Table

Display all outcomes returned by backend.

Show:

- outcome
- probability
- buy yes
- buy no

---

## Trading Panel

Right side sticky panel.

Tabs:

```txt
Buy
Sell
```

### Buy

Submit:

```txt
POST /buy
```

### Sell

Submit:

```txt
POST /sell
```

After mutation:

- invalidate market query
- invalidate balance query
- invalidate positions query
- show success toast

---

## Portfolio

Route:

```txt
/portfolio
```

Fetch:

```txt
GET /positions
```

Display:

- market
- outcome
- shares
- average entry
- pnl
- current value

---

## Orders

Route:

```txt
/orders
```

Fetch:

```txt
GET /orders
```

Use TanStack Table.

Features:

- sorting
- filtering
- pagination

Columns:

- type
- market
- outcome
- price
- amount
- status
- createdAt

---

## Activity

Route:

```txt
/activity
```

Display trading activity from backend data.

---

# Layout Requirements

## Sidebar

Contains:

- logo
- search
- trending
- politics
- crypto
- sports
- technology
- economy
- bookmarks
- portfolio
- orders

Collapsible sidebar.

---

## Navbar

Contains:

- search
- balance
- notifications
- profile menu
- theme switch

Balance source:

```txt
GET /balance
```

---

# State Management

Use Zustand only for:

- theme
- sidebar
- filters

Do NOT store server data in Zustand.

Use TanStack Query for server state.

---

# API Layer

Create:

```txt
src/api/
```

Structure:

```txt
api/
 ├── axios.ts
 ├── markets.ts
 ├── orders.ts
 ├── positions.ts
 ├── balance.ts
```

Requirements:

- Axios instance
- interceptors
- typed responses
- error handling

---

# React Query

Create hooks:

```txt
useMarkets()
useMarket()
useBalance()
useOrders()
usePositions()
useBuyMarket()
useSellMarket()
```

Use query keys.

Invalidate correctly after mutations.

---

# Components

Structure:

```txt
components/
├── layout/
├── market/
├── trading/
├── portfolio/
├── orders/
└── shared/
```

Reusable components only.

Avoid duplicated code.

---

# Design System

Target:

Mirage UI

Characteristics:

- dark theme
- navy background
- soft borders
- subtle shadows
- rounded cards
- hover animations
- premium trading feel

Use Tailwind.

Use shadcn/ui components.

Avoid inline CSS.

---

# Loading States

Every page requires skeleton loaders.

Never use generic loading text.

Never use spinners as primary loading state.

---

# Error States

Display:

- error card
- retry button
- useful message

---

# Empty States

Create dedicated empty states for:

- portfolio
- orders
- markets
- activity

---

# Performance

Required:

- React.lazy
- code splitting
- memoization
- query caching
- virtualization when needed

---

# Folder Structure

```txt
src/
├── api/
├── assets/
├── components/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── store/
├── types/
├── utils/
├── lib/
└── App.tsx
```

---

# Implementation Process

Follow this order:

1. Analyze backend contracts
2. Generate TypeScript types
3. Create API layer
4. Configure React Query
5. Configure Router
6. Create Layout
7. Build Home page
8. Build Market page
9. Build Trading panel
10. Build Portfolio page
11. Build Orders page
12. Build Activity page
13. Add loading states
14. Add error states
15. Add responsive behavior
16. Optimize performance

Do not stop after scaffolding.

Generate actual implementation code.

Continue until the frontend is fully connected to backend APIs and production-ready.

---

# Success Criteria

The application should:

- look very similar to Mirage
- use only backend data
- contain zero mock data
- be fully typed
- be fully responsive
- be production ready
- be maintainable and scalable
