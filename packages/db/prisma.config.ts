import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` does not need a database; migrate/studio commands fail
    // with a clear connection error if this is empty.
    url: process.env.DATABASE_URL ?? '',
  },
});
