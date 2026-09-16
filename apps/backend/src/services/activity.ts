import type { ActivityDTO, Paginated } from '@repo/shared';
import { prisma } from 'db';
import { toActivityDTO } from '../mappers';

export async function listActivity(
  userId: string,
  { limit, cursor }: { limit: number; cursor?: string },
): Promise<Paginated<ActivityDTO>> {
  const rows = await prisma.activity.findMany({
    where: { userId },
    include: { market: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  return {
    items: page.map(toActivityDTO),
    nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
  };
}
