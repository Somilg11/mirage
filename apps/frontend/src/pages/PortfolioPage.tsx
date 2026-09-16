import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, ListOrdered } from 'lucide-react';
import type { PositionDTO } from '@repo/shared';
import { useOrders, usePortfolio } from '../hooks/queries';
import { cn } from '../lib/cn';
import { formatCents, formatShares, formatSignedUsd, formatUsd } from '../lib/format';
import { Card, EmptyState, ErrorState, SegmentedControl, Skeleton, Stat } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { MarketIcon, MarketStatusBadge } from '../components/market/MarketBits';
import { OrderRow, OutcomeBadge } from '../components/portfolio/OrderRow';
import { RequireAuth } from '../components/portfolio/SignInPrompt';

type Tab = 'positions' | 'orders' | 'history';

function pnlClass(value: number) {
  return value > 0 ? 'text-yes' : value < 0 ? 'text-no' : 'text-fg';
}

function PositionRow({ position: p }: { position: PositionDTO }) {
  const pnlPct = p.costBasis > 0 ? (p.pnl / p.costBasis) * 100 : null;
  return (
    <li>
      <Link
        to={`/markets/${p.market.slug}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 hover:bg-surface-2 sm:px-5 md:grid-cols-[auto_minmax(0,1fr)_110px_110px_110px_120px]"
      >
        <MarketIcon category={p.market.category} imageUrl={p.market.imageUrl} size="sm" />
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-medium">{p.market.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <OutcomeBadge outcome={p.outcome} />
            <span className="num">{formatShares(p.quantity)} shares</span>
            {p.lockedQuantity > 0 && <span className="num">· {formatShares(p.lockedQuantity)} in orders</span>}
            <MarketStatusBadge market={p.market} />
          </div>
        </div>
        <div className="num hidden text-right text-sm md:block">
          {formatCents(p.avgPrice == null ? null : Math.round(p.avgPrice * 10) / 10)}
        </div>
        <div className="num hidden text-right text-sm md:block">{formatCents(p.currentPrice)}</div>
        <div className="num hidden text-right text-sm font-semibold md:block">{formatUsd(p.value)}</div>
        <div className="text-right">
          <div className="num text-sm font-semibold md:hidden">{formatUsd(p.value)}</div>
          <div className={cn('num text-xs font-semibold md:text-sm', pnlClass(p.pnl))}>
            {formatSignedUsd(p.pnl)}
            {pnlPct != null && (
              <span className="ml-1 hidden text-xs font-medium opacity-80 sm:inline">({pnlPct.toFixed(1)}%)</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function Positions() {
  const portfolio = usePortfolio();
  if (portfolio.isPending) return <ListSkeleton />;
  if (portfolio.isError) return <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} />;
  if (!portfolio.data.positions.length) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-5" />}
        title="No positions yet"
        description="Buy Yes or No shares on any market and they'll show up here."
        action={
          <Link to="/">
            <Button size="sm">Explore markets</Button>
          </Link>
        }
      />
    );
  }
  return (
    <>
      <div className="hidden grid-cols-[auto_minmax(0,1fr)_110px_110px_110px_120px] gap-3 border-b border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-subtle md:grid">
        <span className="w-8" />
        <span>Market</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Current</span>
        <span className="text-right">Value</span>
        <span className="text-right">P&L</span>
      </div>
      <ul className="divide-y divide-border">
        {portfolio.data.positions.map(p => (
          <PositionRow key={`${p.market.id}-${p.outcome}`} position={p} />
        ))}
      </ul>
    </>
  );
}

function Orders({ status }: { status: 'open' | 'all' }) {
  const orders = useOrders({ status });
  if (orders.isPending) return <ListSkeleton />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />;
  const list = status === 'all' ? orders.data.filter(o => o.status !== 'open') : orders.data;
  if (!list.length) {
    return (
      <EmptyState
        icon={<ListOrdered className="size-5" />}
        title={status === 'open' ? 'No open orders' : 'No order history'}
        description={
          status === 'open'
            ? 'Limit orders waiting to be filled appear here.'
            : 'Filled and cancelled orders appear here.'
        }
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {list.map(o => (
        <OrderRow key={o.id} order={o} />
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

function Summary() {
  const portfolio = usePortfolio();
  const d = portfolio.data;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { label: 'Portfolio value', value: d && formatUsd(d.totalValue), hint: 'Cash + positions' },
        {
          label: 'Cash',
          value: d && formatUsd(d.cash),
          hint: d && d.lockedCash > 0 ? `${formatUsd(d.lockedCash)} in open orders` : 'Available to trade',
        },
        { label: 'Positions', value: d && formatUsd(d.positionsValue), hint: d && `${d.positions.length} open` },
        {
          label: 'Unrealized P&L',
          value: d && <span className={pnlClass(d.unrealizedPnl)}>{formatSignedUsd(d.unrealizedPnl)}</span>,
          hint: 'At current prices',
        },
      ].map(s => (
        <Card key={s.label} className="p-4 sm:p-5">
          {s.value == null ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ) : (
            <Stat label={s.label} value={s.value} hint={s.hint} />
          )}
        </Card>
      ))}
    </div>
  );
}

export function PortfolioPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'positions';

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
      <RequireAuth
        title="Sign in to view your portfolio"
        description="Track positions, open orders and P&L across every market."
      >
        <Summary />
        <Card className="overflow-hidden">
          <div className="border-b border-border p-3 sm:px-5">
            <SegmentedControl
              ariaLabel="Portfolio section"
              className="w-full sm:w-auto"
              value={tab}
              onChange={v => setParams(v === 'positions' ? {} : { tab: v }, { replace: true })}
              options={[
                { value: 'positions', label: 'Positions' },
                { value: 'orders', label: 'Open orders' },
                { value: 'history', label: 'History' },
              ]}
            />
          </div>
          {tab === 'positions' && <Positions />}
          {tab === 'orders' && <Orders status="open" />}
          {tab === 'history' && <Orders status="all" />}
        </Card>
      </RequireAuth>
    </div>
  );
}
