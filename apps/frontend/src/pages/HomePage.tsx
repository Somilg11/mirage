import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, SearchX } from 'lucide-react';
import type { MarketListQuery } from '@repo/shared';
import { useInfiniteMarkets, useMarkets } from '../hooks/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { cn } from '../lib/cn';
import { formatProbability, formatRelative, formatUsdCompact } from '../lib/format';
import { MarketCard, MarketCardSkeleton, MarketTable } from '../components/market/MarketCard';
import { FeaturedMarket, MarketList } from '../components/market/FeaturedMarket';
import { MarketTicker } from '../components/market/MarketTicker';
import { PriceChange } from '../components/market/MarketBits';
import { EmptyState, ErrorState, SegmentedControl, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { LoadMore } from '../components/ui/LoadMore';
import { SectionBoundary } from '../components/errors/ErrorBoundary';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

type Sort = NonNullable<MarketListQuery['sort']>;
type Status = 'open' | 'resolved';
type View = 'grid' | 'list';

const SORT_LABELS: Record<Sort, string> = {
  volume: 'Trending',
  newest: 'Newest',
  ending: 'Ending soon',
};

const VIEW_KEY = 'mirage-market-view';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function HomePage() {
  useDocumentTitle(undefined);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const sort = (params.get('sort') as Sort | null) ?? 'volume';
  const status = (params.get('status') as Status | null) ?? 'open';
  const view: View = (params.get('view') as View | null) ?? readView();
  const q = useDebouncedValue(params.get('q') ?? '', 200);

  const markets = useInfiniteMarkets({ category, sort, status, q: q || undefined });
  const items = useMemo(() => markets.data?.pages.flatMap(p => p.markets) ?? [], [markets.data]);
  // Unfiltered snapshot powers the ticker, featured market and movers.
  const overview = useMarkets({ sort: 'volume', status: 'open' });

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const setView = (next: View) => {
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Preference is best-effort.
    }
    setParam('view', next === 'grid' ? undefined : next);
  };

  const showOverview = !category && !q && status === 'open' && sort === 'volume';
  const featured = overview.data?.[0];
  const movers = useMemo(
    () =>
      [...(overview.data ?? [])]
        .filter(m => m.change24h)
        .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
        .slice(0, 6),
    [overview.data],
  );
  const endingSoon = useMemo(
    () => [...(overview.data ?? [])].sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 4),
    [overview.data],
  );

  const totals = useMemo(() => {
    const list = overview.data ?? [];
    const volume = list.reduce((sum, m) => sum + m.volume, 0);
    const categories = new Set(list.map(m => m.category)).size;
    const top = movers[0];
    return { volume, count: list.length, categories, top };
  }, [overview.data, movers]);

  const heading = q ? `Results for “${q}”` : (category ?? (status === 'resolved' ? 'Resolved' : SORT_LABELS[sort]));

  return (
    <div className="space-y-6">
      <MarketTicker markets={overview.data ?? []} />

      {showOverview && (
        <section className="relative overflow-hidden rounded-lg border border-border bg-surface">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="relative grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
            {[
              { label: 'Total volume', value: overview.data ? formatUsdCompact(totals.volume) : '—' },
              { label: 'Active markets', value: overview.data ? String(totals.count) : '—' },
              { label: 'Categories', value: overview.data ? String(totals.categories) : '—' },
              {
                label: 'Top mover 24h',
                value: totals.top
                  ? `${totals.top.change24h! > 0 ? '+' : '−'}${Math.abs(totals.top.change24h!)} pts`
                  : '—',
                sub: totals.top?.title,
              },
            ].map(stat => (
              <div key={stat.label} className="min-w-0 px-4 py-4 sm:px-5">
                <div className="label-mono">{stat.label}</div>
                <div className="num mt-1.5 text-xl font-semibold tracking-tight text-fg">{stat.value}</div>
                {stat.sub && <div className="mt-0.5 truncate text-xs text-muted">{stat.sub}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {showOverview && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {overview.isPending ? (
            <>
              <Skeleton className="h-[380px] rounded-lg" />
              <Skeleton className="hidden h-[380px] rounded-lg lg:block" />
            </>
          ) : featured ? (
            <>
              <SectionBoundary label="Featured market">
                <FeaturedMarket market={featured} />
              </SectionBoundary>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <MarketList
                  title="Biggest movers"
                  action={<span className="text-xs text-muted">24h</span>}
                  markets={movers.slice(0, 4)}
                  metric={m => (
                    <div className="flex flex-col items-end">
                      <span className="num text-[13px] font-semibold">{formatProbability(m.yesPrice)}</span>
                      <PriceChange change={m.change24h} className="text-xs" />
                    </div>
                  )}
                />
                <MarketList
                  className="lg:hidden xl:flex"
                  title="Closing soon"
                  markets={endingSoon.slice(0, 3)}
                  metric={m => <span className="text-xs text-muted">{formatRelative(m.endDate)}</span>}
                />
              </div>
            </>
          ) : null}
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{heading}</h1>
            {markets.data && (
              <span className="num text-sm text-muted">
                {items.length}
                {markets.hasNextPage ? '+' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={v => setParam('sort', v === 'volume' ? undefined : v)}>
              <SelectTrigger
                size="sm"
                aria-label="Sort markets"
                className="h-8 min-w-[128px] border-border text-[13px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" position="popper" className="border-border">
                {(Object.keys(SORT_LABELS) as Sort[]).map(s => (
                  <SelectItem key={s} value={s}>
                    {s === 'volume' ? 'Top volume' : SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl
              ariaLabel="Market status"
              value={status}
              onChange={v => setParam('status', v === 'open' ? undefined : v)}
              options={[
                { value: 'open', label: 'Active' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
            <div
              className="hidden rounded-md border border-border bg-surface p-0.5 sm:flex"
              role="group"
              aria-label="Layout"
            >
              {(
                [
                  ['grid', LayoutGrid],
                  ['list', List],
                ] as const
              ).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  aria-label={`${v} view`}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'grid size-7 place-items-center rounded transition-colors',
                    view === v ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          {markets.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : markets.isError ? (
            <ErrorState title="Couldn't load markets" error={markets.error} onRetry={() => markets.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No markets found"
              description={
                q || category ? 'Try a different search or category.' : 'Markets will appear here once they are listed.'
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
            <div className={cn('transition-opacity', markets.isPlaceholderData && 'opacity-60')}>
              {view === 'list' ? (
                <MarketTable markets={items} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map(m => (
                    <MarketCard key={m.id} market={m} />
                  ))}
                </div>
              )}
              <LoadMore
                hasNextPage={markets.hasNextPage}
                isFetchingNextPage={markets.isFetchingNextPage}
                fetchNextPage={markets.fetchNextPage}
                label="Load more markets"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
