import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, ListOrdered } from 'lucide-react';
import type { PortfolioDTO, PositionDTO } from '@repo/shared';
import { useInfiniteOrders, useOrders, usePortfolio } from '../hooks/queries';
import { cn } from '../lib/cn';
import { formatCents, formatShares, formatSignedUsd, formatUsd } from '../lib/format';
import { Card, EmptyState, ErrorState, Skeleton, Tabs } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { LoadMore } from '../components/ui/LoadMore';
import { MarketIcon, MarketStatusBadge } from '../components/market/MarketBits';
import { OrdersTable, OutcomeBadge } from '../components/portfolio/OrderRow';
import { RequireAuth } from '../components/portfolio/SignInPrompt';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type Tab = 'positions' | 'orders' | 'history';

const pnlClass = (value: number) => (value > 0 ? 'text-yes' : value < 0 ? 'text-no' : 'text-fg');
const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
const COLS = 'lg:grid-cols-[minmax(0,1fr)_90px_90px_90px_110px_130px]';

function PositionsTable({ positions }: { positions: PositionDTO[] }) {
  return (
    <>
      <div
        className={cn(
          'hidden items-center gap-4 border-b border-border bg-surface-2 px-4 py-2 label-mono lg:grid',
          COLS,
        )}
      >
        <span>Market</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Current</span>
        <span className="text-right">Value</span>
        <span className="text-right">P&amp;L</span>
      </div>
      <ul className="divide-y divide-border">
        {positions.map(p => {
          const pnlPct = p.costBasis > 0 ? (p.pnl / p.costBasis) * 100 : null;
          return (
            <li key={`${p.market.id}-${p.outcome}`}>
              <Link
                to={`/markets/${p.market.slug}`}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2',
                  COLS,
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MarketIcon category={p.market.category} imageUrl={p.market.imageUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-[13px] font-medium">{p.market.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <OutcomeBadge outcome={p.outcome} />
                      <span className="num lg:hidden">
                        {formatShares(p.quantity)} @ {formatCents(round1(p.avgPrice))}
                      </span>
                      {p.lockedQuantity > 0 && <span className="num">{formatShares(p.lockedQuantity)} in orders</span>}
                      <MarketStatusBadge market={p.market} />
                    </div>
                  </div>
                </div>
                <span className="num hidden text-right text-[13px] lg:block">{formatShares(p.quantity)}</span>
                <span className="num hidden text-right text-[13px] lg:block">{formatCents(round1(p.avgPrice))}</span>
                <span className="num hidden text-right text-[13px] lg:block">{formatCents(p.currentPrice)}</span>
                <span className="num hidden text-right text-[13px] font-semibold lg:block">{formatUsd(p.value)}</span>
                <div className="text-right">
                  <div className="num text-[13px] font-semibold lg:hidden">{formatUsd(p.value)}</div>
                  <div className={cn('num text-xs font-semibold lg:text-[13px]', pnlClass(p.pnl))}>
                    {formatSignedUsd(p.pnl)}
                    {pnlPct != null && <span className="ml-1 font-normal opacity-80">({pnlPct.toFixed(1)}%)</span>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Positions() {
  const portfolio = usePortfolio();
  if (portfolio.isPending) return <ListSkeleton />;
  if (portfolio.isError) return <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} />;
  if (!portfolio.data.positions.length) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="No open positions"
        description="Buy Yes or No shares on any market and they will appear here."
        action={
          <Link to="/">
            <Button size="sm">Browse markets</Button>
          </Link>
        }
      />
    );
  }
  return <PositionsTable positions={portfolio.data.positions} />;
}

function Orders({ status }: { status: 'open' | 'closed' }) {
  const orders = useInfiniteOrders({ status });
  if (orders.isPending) return <ListSkeleton />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />;
  const list = orders.data.pages.flatMap(p => p.orders);
  if (!list.length) {
    return (
      <EmptyState
        icon={<ListOrdered />}
        title={status === 'open' ? 'No open orders' : 'No order history'}
        description={
          status === 'open'
            ? 'Limit orders waiting to fill will appear here.'
            : 'Filled and cancelled orders appear here.'
        }
      />
    );
  }
  return (
    <>
      <OrdersTable orders={list} />
      <div className="border-t border-border">
        <LoadMore
          hasNextPage={orders.hasNextPage}
          isFetchingNextPage={orders.isFetchingNextPage}
          fetchNextPage={orders.fetchNextPage}
          auto={false}
          label="Load older orders"
        />
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  );
}

function SummaryBand({ data }: { data: PortfolioDTO | undefined }) {
  const stats = [
    { label: 'Portfolio value', value: data && formatUsd(data.totalValue), hint: 'Cash + positions' },
    {
      label: 'Cash',
      value: data && formatUsd(data.cash),
      hint: data && data.lockedCash > 0 ? `${formatUsd(data.lockedCash)} in open orders` : 'Available to trade',
    },
    {
      label: 'Positions',
      value: data && formatUsd(data.positionsValue),
      hint: data && `${data.positions.length} open`,
    },
    {
      label: 'Unrealized P&L',
      value: data && <span className={pnlClass(data.unrealizedPnl)}>{formatSignedUsd(data.unrealizedPnl)}</span>,
      hint: 'Marked at current prices',
    },
  ];
  return (
    <Card className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
        {stats.map(s => (
          <div key={s.label} className="px-4 py-4 sm:px-5">
            <div className="label-mono">{s.label}</div>
            {s.value == null ? (
              <Skeleton className="mt-2 h-6 w-24" />
            ) : (
              <div className="num mt-1.5 text-xl font-semibold tracking-tight">{s.value}</div>
            )}
            <div className="mt-0.5 text-xs text-muted">{s.hint ?? ' '}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PortfolioContent() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'positions';
  const portfolio = usePortfolio();
  const openOrders = useOrders({ status: 'open' });

  return (
    <div className="space-y-4">
      <SummaryBand data={portfolio.data} />
      <Card className="overflow-hidden">
        <Tabs
          ariaLabel="Portfolio section"
          value={tab}
          onChange={v => setParams(v === 'positions' ? {} : { tab: v }, { replace: true })}
          options={[
            {
              value: 'positions',
              label: (
                <>
                  Positions
                  {portfolio.data && (
                    <span className="num ml-1.5 text-xs text-subtle">{portfolio.data.positions.length}</span>
                  )}
                </>
              ),
            },
            {
              value: 'orders',
              label: (
                <>
                  Open orders
                  {openOrders.data && <span className="num ml-1.5 text-xs text-subtle">{openOrders.data.length}</span>}
                </>
              ),
            },
            { value: 'history', label: 'Order history' },
          ]}
        />
        {tab === 'positions' && <Positions />}
        {tab === 'orders' && <Orders status="open" />}
        {tab === 'history' && <Orders status="closed" />}
      </Card>
    </div>
  );
}

export function PortfolioPage() {
  useDocumentTitle('Portfolio');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-0.5 text-sm text-muted">Positions, open orders and performance across every market.</p>
      </div>
      <RequireAuth
        title="Connect a wallet to view your portfolio"
        description="Track positions, open orders and P&L in real time."
      >
        <PortfolioContent />
      </RequireAuth>
    </div>
  );
}
