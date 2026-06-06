import { prisma } from './index';

async function run() {
  try {
    console.log('Testing raw query connectivity...');
    const tables = await prisma.$queryRawUnsafe<string[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`);
    console.log('Tables in schema:', tables);

    console.log('Calling prisma.market.findMany...');
    // Try a minimal findMany first
    const markets = await prisma.market.findMany();
    console.log('OK, received:', markets.length);
    console.dir(markets, { depth: 2 });
  } catch (err: any) {
    console.error('Prisma error details:');
    console.error('message:', err?.message);
    console.error('code:', err?.code);
    console.error('meta:', err?.meta);
    console.error('clientVersion:', err?.clientVersion);
    console.error('stack:', err?.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
