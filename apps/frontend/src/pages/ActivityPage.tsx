import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Gift, History, Layers, Trophy, type LucideIcon } from 'lucide-react';
import type { ActivityDTO, ActivityType } from '@repo/shared';
import { useActivity } from '../hooks/queries';
import { cn } from '../lib/cn';
import { formatCents, formatDateTime, formatShares, formatSignedUsd } from '../lib/format';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { OutcomeBadge } from '../components/portfolio/OrderRow';
import { RequireAuth } from '../components/portfolio/SignInPrompt';

const TYPE_META: Record<ActivityType, { label: string; icon: LucideIcon; tile: string }> = {
  buy: { label: 'Bought', icon: ArrowDownLeft, tile: 'bg-yes-soft text-yes' },
  sell: { label: 'Sold', icon: ArrowUpRight, tile: 'bg-no-soft text-no' },
  split: { label: 'Split', icon: Layers, tile: 'bg-primary-soft text-primary' },
  merge: { label: 'Merged', icon: Layers, tile: 'bg-primary-soft text-primary' },
  claim: { label: 'Daily reward', icon: Gift, tile: 'bg-warn-soft text-warn' },
  payout: { label: 'Payout', icon: Trophy, tile: 'bg-yes-soft text-yes' },
};

function ActivityRow({ item }: { item: ActivityDTO }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', meta.tile)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{meta.label}</span>
          {item.outcome && <OutcomeBadge outcome={item.outcome} />}
          {item.quantity != null && (
            <span className="num text-muted">
              {formatShares(item.quantity)} {item.type === 'split' || item.type === 'merge' ? 'pairs' : 'shares'}
              {item.price != null && item.price > 0 && ` @ ${formatCents(item.price)}`}
            </span>
          )}
        </div>
        {item.market ? (
          <Link
            to={`/markets/${item.market.slug}`}
            className="mt-0.5 line-clamp-1 text-xs text-muted hover:text-fg hover:underline"
          >
            {item.market.title}
          </Link>
        ) : (
          <div className="mt-0.5 text-xs text-muted">Account</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div
          className={cn(
            'num text-sm font-semibold',
            item.amount > 0 ? 'text-yes' : item.amount < 0 ? 'text-fg' : 'text-muted',
          )}
        >
          {item.amount === 0 ? '—' : formatSignedUsd(item.amount)}
        </div>
        <div className="mt-0.5 text-[11px] text-subtle">{formatDateTime(item.createdAt)}</div>
      </div>
    </li>
  );
}

function ActivityFeed() {
  const activity = useActivity();

  if (activity.isPending) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (activity.isError) return <ErrorState error={activity.error} onRetry={() => activity.refetch()} />;

  const items = activity.data.pages.flatMap(p => p.items);
  if (!items.length) {
    return (
      <EmptyState
        icon={<History className="size-5" />}
        title="No activity yet"
        description="Trades, rewards, splits, merges and payouts will be listed here."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map(item => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>
      {activity.hasNextPage && (
        <div className="border-t border-border p-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            loading={activity.isFetchingNextPage}
            onClick={() => activity.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

export function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
      <RequireAuth
        title="Sign in to view activity"
        description="A full ledger of every balance change on your account."
      >
        <Card className="overflow-hidden">
          <ActivityFeed />
        </Card>
      </RequireAuth>
    </div>
  );
}
