import type { MeDTO } from '@repo/shared';
import { prisma, type User } from 'db';
import { getEnv } from '../config/env';
import { conflict, notFound } from '../lib/errors';
import { DAY_MS, startOfUtcDay } from '../lib/time';

export async function findOrCreateUser(address: string): Promise<User> {
  return prisma.user.upsert({
    where: { address },
    update: {},
    create: { address, usdBalance: getEnv().STARTING_BALANCE_CENTS },
  });
}

function nextClaimAt(lastClaimDate: Date | null, now = new Date()): Date | null {
  if (!lastClaimDate) return null;
  const today = startOfUtcDay(now);
  return lastClaimDate >= today ? new Date(today.getTime() + DAY_MS) : null;
}

export async function getMe(userId: string): Promise<MeDTO> {
  const [user, locked] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.$queryRaw<{ amount: number }[]>`
      SELECT COALESCE(SUM("price" * ("quantity" - "filledQuantity")), 0)::int AS amount
      FROM "Order" WHERE "userId" = ${userId} AND "status" = 'Open' AND "side" = 'Buy'`,
  ]);
  if (!user) throw notFound('User not found');
  return {
    id: user.id,
    address: user.address,
    balance: user.usdBalance,
    lockedBalance: locked[0]?.amount ?? 0,
    lastClaimAt: user.lastClaimDate?.toISOString() ?? null,
    nextClaimAt: nextClaimAt(user.lastClaimDate)?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Credits the daily paper-money allowance at most once per UTC day. */
export async function claimDaily(userId: string): Promise<MeDTO> {
  const now = new Date();
  const amount = getEnv().DAILY_CLAIM_CENTS;

  // Single statement: concurrent claims re-check the WHERE clause after the row lock,
  // so exactly one succeeds without an interactive transaction.
  const inserted = await prisma.$executeRaw`
    WITH claimed AS (
      UPDATE "User"
      SET "usdBalance" = "usdBalance" + ${amount}, "lastClaimDate" = ${now}
      WHERE id = ${userId} AND ("lastClaimDate" IS NULL OR "lastClaimDate" < ${startOfUtcDay(now)})
      RETURNING id
    )
    INSERT INTO "Activity" ("id", "userId", "type", "amount", "createdAt")
    SELECT gen_random_uuid()::text, id, 'Claim'::"ActivityType", ${amount}, ${now} FROM claimed`;
  if (inserted === 0) throw conflict('ALREADY_CLAIMED', 'Daily claim already used today');

  return getMe(userId);
}
