import type { Order, PrismaTransaction } from 'db';
import { badRequest } from '../lib/errors';

type OutcomeValue = 'Yes' | 'No';

export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

/** Atomically debits spendable cash, failing if the balance would go negative. */
export async function debitCash(tx: PrismaTransaction, userId: string, amount: number) {
  if (amount <= 0) return;
  const updated = await tx.$executeRaw`
    UPDATE "User" SET "usdBalance" = "usdBalance" - ${amount}
    WHERE id = ${userId} AND "usdBalance" >= ${amount}`;
  if (updated === 0) throw badRequest('INSUFFICIENT_BALANCE', 'Insufficient balance');
}

export async function creditCash(tx: PrismaTransaction, userId: string, amount: number) {
  if (amount <= 0) return;
  await tx.user.update({ where: { id: userId }, data: { usdBalance: { increment: amount } } });
}

/** Atomically escrows shares for a sell order, failing if not enough unlocked shares are held. */
export async function lockShares(
  tx: PrismaTransaction,
  userId: string,
  marketId: string,
  outcome: OutcomeValue,
  quantity: number,
) {
  const updated = await tx.$executeRaw`
    UPDATE "Position" SET "lockedQty" = "lockedQty" + ${quantity}, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "marketId" = ${marketId} AND "outcome" = ${outcome}::"Outcome"
      AND "qty" - "lockedQty" >= ${quantity}`;
  if (updated === 0) throw badRequest('INSUFFICIENT_SHARES', 'Insufficient shares');
}

export async function unlockShares(
  tx: PrismaTransaction,
  userId: string,
  marketId: string,
  outcome: OutcomeValue,
  quantity: number,
) {
  if (quantity <= 0) return;
  await tx.position.update({
    where: { userId_marketId_outcome: { userId, marketId, outcome } },
    data: { lockedQty: { decrement: quantity } },
  });
}

/** Cancels an open order and returns its unfilled escrow to the owner. */
export async function cancelWithRefund(tx: PrismaTransaction, order: Order) {
  const remaining = order.quantity - order.filledQuantity;
  if (order.side === 'Buy') {
    await creditCash(tx, order.userId, order.price * remaining);
  } else {
    await unlockShares(tx, order.userId, order.marketId, order.outcome, remaining);
  }
  return tx.order.update({ where: { id: order.id }, data: { status: 'Cancelled' } });
}
