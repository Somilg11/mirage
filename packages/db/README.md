# db

Prisma schema, migrations and a shared `PrismaClient` (Postgres via `@prisma/adapter-pg`).

```ts
import { prisma, type Market } from 'db';
```

| Command               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `bun run db:generate` | Generate the client into `generated/prisma` (no database needed) |
| `bun run db:migrate`  | Create and apply a migration in development                      |
| `bun run db:deploy`   | Apply pending migrations (CI / production)                       |
| `bun run db:studio`   | Open Prisma Studio                                               |

`DATABASE_URL` is read from the environment, falling back to `packages/db/.env`.
Seed data lives in `apps/backend/scripts/seed.ts` because it uses the order service.
