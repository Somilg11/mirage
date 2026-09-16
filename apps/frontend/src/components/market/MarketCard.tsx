import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MarketSummary, Outcome } from '@repo/shared';
import { cn } from '../../lib/cn';
import { formatCents, formatProbability, formatUsdCompact } from '../../lib/format';
import { isTradable } from '../../lib/market';
import { usePrefetchMarket } from '../../hooks/queries';
import { Skeleton } from '../ui/primitives';
import { EndsLabel, MarketIcon, MarketStatusBadge, PriceChange, ProbabilityBar } from './MarketBits';

function displayPrice(market: MarketSummary) {
  if (market.status === 'resolved') return market.resolution === 'yes' ? 100 : 0;
  return market.yesPrice;
}

function OutcomeButton({
  outcome,
  price,
  onClick,
  compact,
}: {
  outcome: Outcome;
  price: number | null;
  onClick: () => void;
  compact?: boolean;
}) {
  const yes = outcome === 'yes';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative z-10 flex items-center justify-between rounded-md px-3 text-[13px] font-semibold transition-colors',
        compact ? 'h-8 min-w-[92px] gap-3' : 'h-9',
        yes ? 'bg-yes-soft text-yes hover:bg-yes hover:text-white' : 'bg-no-soft text-no hover:bg-no hover:text-white',
      )}
    >
      <span>{yes ? 'Yes' : 'No'}</span>
      <span className="num">{formatCents(price)}</span>
    </button>
  );
}

export const MarketCard = memo(function MarketCard({ market }: { market: MarketSummary }) {
  const navigate = useNavigate();
  const prefetch = usePrefetchMarket();
  const warm = () => prefetch(market);
  const href = `/markets/${market.slug}`;
  const price = displayPrice(market);

  return (
    <article
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className="group relative flex flex-col rounded-lg border border-border bg-surface p-3.5 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_190px] hover:border-border-strong"
    >
      <div className="flex items-start gap-3">
        <MarketIcon category={market.category} imageUrl={market.imageUrl} />
        <h3 className="line-clamp-2 min-h-10 flex-1 text-sm font-semibold leading-5 text-fg">
          <Link to={href} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {market.title}
          </Link>
        </h3>
        <div className="shrink-0 text-right">
          <div className="num text-lg font-semibold leading-5 text-fg">{formatProbability(price)}</div>
          <div className="mt-0.5 text-[11px] text-muted">chance</div>
        </div>
      </div>

      <ProbabilityBar value={price} className="mt-3" />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {isTradable(market) ? (
          <>
            <OutcomeButton outcome="yes" price={market.yesPrice} onClick={() => navigate(`${href}?outcome=yes`)} />
            <OutcomeButton outcome="no" price={market.noPrice} onClick={() => navigate(`${href}?outcome=no`)} />
          </>
        ) : (
          <div className="col-span-2 flex h-9 items-center justify-center rounded-md bg-surface-2">
            <MarketStatusBadge market={market} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5 text-xs text-muted">
        <div className="flex min-w-0 items-center gap-2">
          <span className="num">{formatUsdCompact(market.volume)} Vol.</span>
          <PriceChange change={market.change24h} />
        </div>
        <span className="truncate">
          <EndsLabel endDate={market.endDate} ended={market.status !== 'open'} />
        </span>
      </div>
    </article>
  );
});

export function MarketCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <Skeleton className="h-8 w-10" />
      </div>
      <Skeleton className="mt-3 h-1" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Skeleton className="h-9 rounded-md" />
        <Skeleton className="h-9 rounded-md" />
      </div>
      <div className="mt-3 flex justify-between border-t border-border pt-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

const MarketRow = memo(function MarketRow({ market: m }: { market: MarketSummary }) {
  const navigate = useNavigate();
  const prefetch = usePrefetchMarket();
  const href = `/markets/${m.slug}`;
  const price = displayPrice(m);
  const warm = () => prefetch(m);
  return (
    <li
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-2 lg:grid-cols-[minmax(0,1fr)_120px_64px_96px_110px_200px]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <MarketIcon category={m.category} imageUrl={m.imageUrl} size="sm" />
        <div className="min-w-0">
          <Link
            to={href}
            className="line-clamp-1 text-sm font-medium text-fg after:absolute after:inset-0 focus-visible:outline-none"
          >
            {m.title}
          </Link>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted lg:hidden">
            <span>{m.category}</span>
            <span className="num">{formatUsdCompact(m.volume)} Vol.</span>
            <PriceChange change={m.change24h} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <span className="num w-10 text-right text-sm font-semibold lg:w-9 lg:text-left">
          {formatProbability(price)}
        </span>
        <ProbabilityBar value={price} className="hidden w-16 lg:flex" />
      </div>
      <span className="hidden text-right lg:block">
        <PriceChange change={m.change24h} className="text-[13px]" />
      </span>
      <span className="num hidden text-right text-[13px] text-fg/90 lg:block">{formatUsdCompact(m.volume)}</span>
      <span className="hidden text-right text-[13px] text-muted lg:block">
        <EndsLabel endDate={m.endDate} ended={m.status !== 'open'} />
      </span>
      <div className="col-span-2 flex justify-end gap-2 lg:col-span-1">
        {isTradable(m) ? (
          <>
            <OutcomeButton compact outcome="yes" price={m.yesPrice} onClick={() => navigate(`${href}?outcome=yes`)} />
            <OutcomeButton compact outcome="no" price={m.noPrice} onClick={() => navigate(`${href}?outcome=no`)} />
          </>
        ) : (
          <MarketStatusBadge market={m} />
        )}
      </div>
    </li>
  );
});

/** Dense table layout for the market list. */
export function MarketTable({ markets }: { markets: MarketSummary[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_64px_96px_110px_200px] items-center gap-4 border-b border-border bg-surface-2 px-4 py-2 label-mono lg:grid">
        <span>Market</span>
        <span>Chance</span>
        <span className="text-right">24h</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Ends</span>
        <span className="text-right">Trade</span>
      </div>
      <ul className="divide-y divide-border">
        {markets.map(m => (
          <MarketRow key={m.id} market={m} />
        ))}
      </ul>
    </div>
  );
}
