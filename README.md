# Mirage - Prediction Market Platform

A decentralized prediction market platform built with modern web technologies, allowing users to trade positions on various outcomes using Web3 authentication.

## 🚀 What is Mirage?

Mirage is a prediction market platform where users can:
- **Buy and sell positions** on binary outcomes (Yes/No)
- **Trade with real-time order matching** using an in-memory orderbook
- **Authenticate with Web3** (Solana) via Supabase Auth
- **Track portfolio and activity** with comprehensive dashboards
- **Claim daily bonuses** to start trading

![](./docs/images/home.png)
![](./docs/images/market.png)

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │         │   Database      │
│   (React/Vite)  │◄────────►│  (Express.js)   │◄────────►│  (PostgreSQL)   │
│                 │  HTTP    │                 │  Prisma  │                 │
│  - React Router │         │  - Order Match  │         │  - Users        │
│  - TanStack Q   │         │  - Auth Middleware│       │  - Markets      │
│  - Tailwind CSS │         │  - REST API     │         │  - Positions    │
└─────────────────┘         └─────────────────┘         │  - Orders       │
       │                            │                   └─────────────────┘
       │                            │
       └────────────┬───────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │   Supabase      │
         │   Auth          │
         │  (Web3/Solana)  │
         └─────────────────┘
```

### Data Flow

1. **User Authentication**: Frontend authenticates with Supabase Auth using Solana Web3
2. **Order Placement**: User submits buy/sell order via REST API
3. **Order Matching**: Backend matches orders against orderbook using price-time priority
4. **Position Updates**: Database updates user positions and balances atomically
5. **Real-time Updates**: Frontend polls for market data and user state

### Order Matching Logic

The platform uses a continuous double auction with:
- **Price-time priority**: Orders matched at best price first
- **Immediate or cancel**: Unfilled portions become resting orders
- **Atomic transactions**: All updates occur in database transactions

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite 8** - Build tool and dev server
- **React Router 7** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS 4** - Utility-first CSS
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **Zustand** - State management

### Backend
- **Express.js** - REST API server
- **Prisma** - ORM for database operations
- **PostgreSQL** - Primary database
- **Supabase Auth** - Web3 authentication
- **Zod** - Runtime type validation
- **CORS** - Cross-origin resource sharing

### Infrastructure
- **Turborepo** - Monorepo build system
- **Bun** - Package manager and runtime
- **TypeScript** - Type safety across the codebase

### Database Schema

```prisma
model User {
  id           String   @id @default(uuid())
  address      String   @unique
  usdBalance   Int      @default(0)  // Stored in cents
  lastClaimDate DateTime?
  positions    Position[]
  order        OrderHistory[]
}

model Market {
  id                   String   @id @default(uuid())
  title                String
  description          String
  resolutionDescription String
  yesOrderBook         Json     // Yes side orderbook
  noOrderBook          Json     // No side orderbook
  totalQty             Int
  positions            Position[]
  order                OrderHistory[]
  resolution           PositionType?
}

model Position {
  userId   String
  marketId String
  type     PositionType  // Yes | No
  qty      Int
  @@unique([userId, marketId, type])
}

model OrderHistory {
  id        String   @id @default(uuid())
  orderType OrderType  // Buy | Sell | Split | Merge
  qty       Int
  price     Int
  userId    String
  marketId  String
  createdAt DateTime @default(now())
}
```

## 📋 Setup Guide

### Prerequisites

- **Node.js** >= 18
- **Bun** >= 1.3.10
- **PostgreSQL** database
- **Supabase** project with Web3 auth enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd perdiction-market
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/prediction_market"
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SECRET_KEY="your-service-role-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

4. **Run database migrations**
   ```bash
   cd packages/db
   bun prisma migrate dev
   cd ../..
   ```

5. **Generate Prisma client**
   ```bash
   cd packages/db
   bun prisma generate
   cd ../..
   ```

6. **Start development servers**
   ```bash
   bun run dev
   ```
   
   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

### Building for Production

```bash
bun run build
```

### Running Tests

```bash
# Backend tests
cd apps/backend
bun test

# Linting
bun run lint

# Type checking
bun run check-types
```

## 📁 Project Structure

```
perdiction-market/
├── apps/
│   ├── backend/           # Express.js API server
│   │   ├── index.ts       # Main server entry point
│   │   ├── middleware.ts # Auth middleware
│   │   ├── lib/          # Order matching logic
│   │   └── types.ts      # TypeScript types
│   └── frontend/         # React application
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── pages/       # Page components
│       │   ├── hooks/        # Custom React hooks
│       │   ├── layouts/      # Layout components
│       │   └── routes/       # Route configuration
│       └── package.json
├── packages/
│   ├── db/               # Database package (Prisma)
│   │   ├── prisma/       # Schema and migrations
│   │   └── index.ts      # Prisma client export
│   ├── eslint-config/    # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
├── turbo.json            # Turborepo configuration
├── package.json          # Root package.json
└── .env.example          # Environment variables template
```

## 🔐 Security Considerations

### Fixed Security Issues

During the security audit, the following vulnerabilities were identified and fixed:

1. **Hardcoded Supabase URL in backend** (`apps/backend/middleware.ts`)
   - **Issue**: Supabase project URL was hardcoded in source code
   - **Fix**: Moved to `SUPABASE_URL` environment variable

2. **Hardcoded Supabase credentials in frontend** (`apps/frontend/src/hooks/useSupabase.ts`)
   - **Issue**: Both Supabase URL and anon key were hardcoded
   - **Fix**: Moved to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables

### Security Best Practices

- **Never commit `.env` files** - Use `.env.example` as a template
- **Rotate secrets regularly** - Update Supabase keys periodically
- **Use environment-specific configs** - Separate dev/staging/prod environments
- **Enable audit logging** - Monitor authentication and trading activity
- **Validate all inputs** - Use Zod schemas for API validation
- **Use database transactions** - Ensure atomic updates for balances and positions

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   bun run lint
   bun run check-types
   ```
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push and create a pull request**

### Code Style

- **TypeScript** for all new code
- **ESLint** configuration is provided
- **Prettier** for formatting
- **Conventional commits** for commit messages

### Testing

- Write unit tests for business logic
- Test order matching edge cases
- Validate authentication flows
- Ensure database migrations are reversible

## 📄 API Endpoints

### Authentication
- `POST /buy` - Place a buy order (protected)
- `POST /sell` - Place a sell order (protected)
- `POST /order` - Generic order endpoint (protected)

### Market Data
- `GET /market?marketId={id}` - Get market details
- `GET /api/market-list` - Get all markets with orderbook data

### User Data (protected)
- `GET /balance` - Get user balance
- `GET /positions` - Get user positions
- `GET /orders` - Get order history
- `GET /history` - Get activity history
- `POST /claim-daily` - Claim daily bonus
- `POST /split` - Split positions
- `POST /merge` - Merge positions

## 🐛 Troubleshooting

### Common Issues

**Database connection errors**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials

**Supabase authentication errors**
- Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
- Check Supabase project settings
- Ensure Web3 auth is enabled

**Build errors**
- Clear node_modules: `rm -rf node_modules && bun install`
- Clear Turborepo cache: `rm -rf .turbo`
- Check TypeScript version compatibility

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Turborepo](https://turbo.build/)
- Authentication powered by [Supabase](https://supabase.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
