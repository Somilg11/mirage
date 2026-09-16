import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, SearchX, TrendingUp } from 'lucide-react';
import type { MarketListQuery } from '@repo/shared';
import { useCategories, useMarkets } from '../hooks/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { cn } from '../lib/cn';
import { formatProbability, formatRelative } from '../lib/format';
import { MarketCard, MarketCardSkeleton } from '../components/market/MarketCard';
import { FeaturedMarket, MarketList } from '../components/market/FeaturedMarket';
import { PriceChange } from '../components/market/MarketBits';
import { EmptyState, ErrorState, SegmentedControl, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';

type Sort = NonNullable<MarketListQuery['sort']>;
type Status = 'open' | 'resolved';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'volume', label: 'Trending' },
  { value: 'newest', label: 'New' },
  { value: 'ending', label: 'Ending soon' },
];

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const sort = (params.get('sort') as Sort | null) ?? 'volume';
  const status = (params.get('status') as Status | null) ?? 'open';
  const q = useDebouncedValue(params.get('q') ?? '', 200);

  const markets = useMarkets({ category, sort, status, q: q || undefined });
  const categories = useCategories();
  // Unfiltered snapshot powers the featured hero and side lists.
  const overview = useMarkets({ sort: 'volume', status: 'open' });

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const showHero = !category && !q && status === 'open';
  const featured = overview.data?.[0];
  const movers = useMemo(
    () =>
      [...(overview.data ?? [])]
        .filter(m => m.change24h)
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 5),
    [overview.data],
  );
  const endingSoon = useMemo(
    () => [...(overview.data ?? [])].sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 5),
    [overview.data],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {showHero && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {overview.isPending ? (
            <>
              <Skeleton className="h-80 rounded-2xl" />
              <Skeleton className="hidden h-80 rounded-2xl xl:block" />
            </>
          ) : featured ? (
            <>
              <FeaturedMarket market={featured} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <MarketList
                  title="Top movers · 24h"
                  icon={<TrendingUp className="size-4 text-primary" />}
                  markets={movers}
                  metric={m => (
                    <div>
                      <div className="num text-sm font-semibold">{formatProbability(m.yesPrice)}</div>
                      <PriceChange change={m.change24h} className="text-xs" />
                    </div>
                  )}
                />
                <MarketList
                  className="hidden md:flex"
                  title="Ending soon"
                  icon={<Clock className="size-4 text-warn" />}
                  markets={endingSoon.slice(0, movers.length ? 3 : 5)}
                  metric={m => <span className="text-xs text-muted">{formatRelative(m.endDate)}</span>}
                />
              </div>
            </>
          ) : null}
        </section>
      )}

      <section>
        <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-bg/90 px-4 backdrop-blur-xl sm:top-16 sm:-mx-6 sm:px-6">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-3" role="tablist" aria-label="Categories">
            {[{ name: 'All', count: undefined as number | undefined }, ...(categories.data ?? [])].map(c => {
              const value = c.name === 'All' ? undefined : c.name;
              const active = category === value;
              return (
                <button
                  key={c.name}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam('category', value)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                    active ? 'bg-fg text-bg' : 'bg-surface-3 text-muted hover:text-fg',
                  )}
                >
                  {c.name}
                  {c.count != null && (
                    <span className={cn('num text-[11px]', active ? 'opacity-70' : 'text-subtle')}>{c.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {q
              ? `Results for “${q}”`
              : category
                ? category
                : status === 'resolved'
                  ? 'Resolved markets'
                  : 'All markets'}
          </h1>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SegmentedControl
              ariaLabel="Sort markets"
              className="flex-1 sm:flex-none"
              value={sort}
              onChange={v => setParam('sort', v === 'volume' ? undefined : v)}
              options={SORTS}
            />
            <SegmentedControl
              ariaLabel="Market status"
              value={status}
              onChange={v => setParam('status', v === 'open' ? undefined : v)}
              options={[
                { value: 'open', label: 'Live' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          {markets.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : markets.isError ? (
            <ErrorState title="Couldn't load markets" error={markets.error} onRetry={() => markets.refetch()} />
          ) : markets.data.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="No markets found"
              description={
                q || category
                  ? 'Try a different search or category.'
                  : 'Markets will appear here once they are created.'
              }
              action={
                (q || category) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <div
              className={cn(
                'grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
                markets.isPlaceholderData && 'opacity-60',
              )}
            >
              {markets.data.map(m => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
