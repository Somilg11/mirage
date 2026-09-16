import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import type { ActivityDTO, ActivityType } from '@repo/shared';
import { useActivity } from '../hooks/queries';
import { cn } from '../lib/cn';
import { formatCents, formatDateTime, formatShares, formatSignedUsd } from '../lib/format';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/primitives';
import { LoadMore } from '../components/ui/LoadMore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { OutcomeBadge } from '../components/portfolio/OrderRow';
import { RequireAuth } from '../components/portfolio/SignInPrompt';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TYPE_LABEL: Record<ActivityType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  split: 'Split',
  merge: 'Merge',
  claim: 'Reward',
  payout: 'Payout',
};

const TYPE_TONE: Record<ActivityType, string> = {
  buy: 'text-yes',
  sell: 'text-no',
  split: 'text-primary',
  merge: 'text-primary',
  claim: 'text-warn',
  payout: 'text-yes',
};

type Filter = 'all' | 'trades' | 'claim' | 'payout' | 'splitmerge';

const FILTERS: { value: Filter; label: string; match: (t: ActivityType) => boolean }[] = [
  { value: 'all', label: 'All activity', match: () => true },
  { value: 'trades', label: 'Trades', match: t => t === 'buy' || t === 'sell' },
  { value: 'splitmerge', label: 'Splits & merges', match: t => t === 'split' || t === 'merge' },
  { value: 'payout', label: 'Payouts', match: t => t === 'payout' },
  { value: 'claim', label: 'Rewards', match: t => t === 'claim' },
];

const COLS = 'lg:grid-cols-[150px_80px_minmax(0,1fr)_110px_80px_110px]';

function Quantity({ item }: { item: ActivityDTO }) {
  if (item.quantity == null) return <span className="text-subtle">—</span>;
  return (
    <span className="num">
      {formatShares(item.quantity)}
      <span className="ml-1 text-muted">{item.type === 'split' || item.type === 'merge' ? 'pairs' : 'sh'}</span>
    </span>
  );
}

function ActivityRow({ item }: { item: ActivityDTO }) {
  const amountClass = item.amount > 0 ? 'text-yes' : item.amount < 0 ? 'text-fg' : 'text-muted';
  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px] hover:bg-surface-2',
        COLS,
      )}
    >
      <span className="hidden text-xs text-muted lg:block">{formatDateTime(item.createdAt)}</span>
      <span className={cn('hidden font-semibold lg:block', TYPE_TONE[item.type])}>{TYPE_LABEL[item.type]}</span>

      <div className="min-w-0">
        <div className="flex items-center gap-2 lg:hidden">
          <span className={cn('font-semibold', TYPE_TONE[item.type])}>{TYPE_LABEL[item.type]}</span>
          {item.outcome && <OutcomeBadge outcome={item.outcome} />}
          <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {item.outcome && (
            <span className="hidden lg:inline">
              <OutcomeBadge outcome={item.outcome} />
            </span>
          )}
          {item.market ? (
            <Link to={`/markets/${item.market.slug}`} className="line-clamp-1 text-muted hover:text-fg lg:text-fg">
              {item.market.title}
            </Link>
          ) : (
            <span className="text-muted">Account</span>
          )}
        </div>
      </div>

      <span className="hidden text-right lg:block">
        <Quantity item={item} />
      </span>
      <span className="num hidden text-right lg:block">
        {item.price != null && item.price > 0 ? formatCents(item.price) : <span className="text-subtle">—</span>}
      </span>
      <span className={cn('num text-right font-semibold', amountClass)}>
        {item.amount === 0 ? '—' : formatSignedUsd(item.amount)}
      </span>
    </li>
  );
}

function ActivityFeed() {
  const activity = useActivity();
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const all = activity.data?.pages.flatMap(p => p.items) ?? [];
    const match = FILTERS.find(f => f.value === filter)!.match;
    return all.filter(i => match(i.type));
  }, [activity.data, filter]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">Ledger</span>
        <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
          <SelectTrigger size="sm" aria-label="Filter activity" className="h-8 min-w-[150px] border-border text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" position="popper" className="border-border">
            {FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn('hidden gap-4 border-b border-border bg-surface-2 px-4 py-2 label-mono lg:grid', COLS)}>
        <span>Time</span>
        <span>Type</span>
        <span>Market</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
      </div>

      {activity.isPending ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={<History />}
          title={filter === 'all' ? 'No activity yet' : 'Nothing matches this filter'}
          description="Trades, rewards, splits, merges and payouts are recorded here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map(item => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <div className="border-t border-border empty:hidden">
        <LoadMore
          hasNextPage={activity.hasNextPage}
          isFetchingNextPage={activity.isFetchingNextPage}
          fetchNextPage={activity.fetchNextPage}
          label="Load older activity"
        />
      </div>
    </Card>
  );
}

export function ActivityPage() {
  useDocumentTitle('Activity');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-0.5 text-sm text-muted">Every balance change on your account, newest first.</p>
      </div>
      <RequireAuth title="Connect a wallet to view activity" description="Your full trading and rewards ledger.">
        <ActivityFeed />
      </RequireAuth>
    </div>
  );
}
