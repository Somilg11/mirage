import 'dotenv/config';
import { prisma } from 'db';
import { createApp } from './app';
import { getEnv } from './config/env';
import { logger } from './lib/logger';

const env = getEnv();
const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening');
  if (env.AUTH_DEV_BYPASS) logger.warn('AUTH_DEV_BYPASS is enabled: requests are authenticated by x-dev-address');
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async err => {
    await prisma.$disconnect();
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', reason => logger.error({ err: reason }, 'unhandled rejection'));
