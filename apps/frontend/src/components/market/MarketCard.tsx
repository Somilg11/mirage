import { Link, useNavigate } from 'react-router-dom';
import type { MarketSummary, Outcome } from '@repo/shared';
import { formatCents, formatUsdCompact } from '../../lib/format';
import { isTradable } from '../../lib/market';
import { Skeleton } from '../ui/primitives';
import { EndsLabel, MarketIcon, MarketStatusBadge, PriceChange, ProbabilityGauge } from './MarketBits';

export function MarketCard({ market }: { market: MarketSummary }) {
  const navigate = useNavigate();
  const href = `/markets/${market.slug}`;
  const tradable = isTradable(market);

  const quickTrade = (outcome: Outcome) => navigate(`${href}?outcome=${outcome}`);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop">
      <div className="flex items-start gap-3">
        <MarketIcon category={market.category} imageUrl={market.imageUrl} />
        <h3 className="line-clamp-2 min-h-[2.5rem] flex-1 text-[15px] font-semibold leading-5 text-fg">
          <Link to={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
            {market.title}
          </Link>
        </h3>
        <ProbabilityGauge
          value={market.status === 'resolved' ? (market.resolution === 'yes' ? 100 : 0) : market.yesPrice}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {tradable ? (
          <>
            <button
              type="button"
              onClick={() => quickTrade('yes')}
              className="relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-yes-soft text-sm font-semibold text-yes transition-colors hover:bg-yes hover:text-white"
            >
              Yes <span className="num opacity-80">{formatCents(market.yesPrice)}</span>
            </button>
            <button
              type="button"
              onClick={() => quickTrade('no')}
              className="relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-no-soft text-sm font-semibold text-no transition-colors hover:bg-no hover:text-white"
            >
              No <span className="num opacity-80">{formatCents(market.noPrice)}</span>
            </button>
          </>
        ) : (
          <div className="col-span-2 flex h-10 items-center justify-center rounded-xl bg-surface-2">
            <MarketStatusBadge market={market} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <div className="flex min-w-0 items-center gap-2">
          <span className="num font-medium text-fg/80">{formatUsdCompact(market.volume)} Vol.</span>
          <PriceChange change={market.change24h} className="text-xs" />
        </div>
        <span className="truncate">
          <EndsLabel endDate={market.endDate} ended={market.status !== 'open'} />
        </span>
      </div>
    </article>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-9 w-16 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
