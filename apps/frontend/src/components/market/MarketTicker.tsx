import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { MarketSummary } from '@repo/shared';
import { cn } from '../../lib/cn';
import { formatProbability } from '../../lib/format';

function TickerItem({ market, rank }: { market: MarketSummary; rank: number }) {
  const change = market.change24h ?? 0;
  return (
    <Link
      to={`/markets/${market.slug}`}
      className="flex shrink-0 items-center gap-2 px-3 text-xs text-muted hover:text-fg"
      tabIndex={-1}
    >
      <span className="num font-mono text-[11px] text-subtle">#{rank}</span>
      <span className="max-w-[200px] truncate">{market.title}</span>
      <span className="num font-semibold text-fg">{formatProbability(market.yesPrice)}</span>
      {change !== 0 && (
        <span className={cn('num', change > 0 ? 'text-yes' : 'text-no')}>
          {change > 0 ? '+' : '−'}
          {Math.abs(change)}
        </span>
      )}
    </Link>
  );
}

/** Ranked "trending" strip of live prices. Pauses on hover; static when reduced motion is preferred. */
export function MarketTicker({ markets }: { markets: MarketSummary[] }) {
  if (markets.length < 3) return null;
  const ranked = markets.slice(0, 12);
  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex shrink-0 items-center gap-1.5 border-r border-border bg-surface-2 px-3">
        <Flame className="size-3.5 text-warn" />
        <span className="label-mono text-fg">Trending</span>
      </div>
      <div className="group relative min-w-0 flex-1 overflow-hidden" aria-hidden>
        <div className="flex h-full w-max animate-ticker items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...ranked, ...ranked].map((m, i) => (
            <TickerItem key={`${m.id}-${i}`} market={m} rank={(i % ranked.length) + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
