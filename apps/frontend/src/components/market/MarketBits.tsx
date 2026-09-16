import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import type { MarketSummary } from '@repo/shared';
import { cn } from '../../lib/cn';
import { categoryMeta } from '../../lib/market';
import { formatDate } from '../../lib/format';
import { Badge } from '../ui/primitives';

export function MarketIcon({
  category,
  imageUrl,
  size = 'md',
  className,
}: {
  category: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-8 rounded-lg' : 'size-11 rounded-xl';
  const glyph = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5';
  if (imageUrl) {
    return <img src={imageUrl} alt="" className={cn(box, 'shrink-0 object-cover', className)} loading="lazy" />;
  }
  const { icon: Icon, tile } = categoryMeta(category);
  return (
    <div className={cn(box, tile, 'grid shrink-0 place-items-center', className)} aria-hidden>
      <Icon className={glyph} />
    </div>
  );
}

/** Semicircle probability gauge, Polymarket style. */
export function ProbabilityGauge({ value, className }: { value: number | null; className?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const radius = 26;
  const circumference = Math.PI * radius;
  const color = value == null ? 'var(--fg-subtle)' : pct >= 50 ? 'var(--yes)' : 'var(--no)';

  return (
    <div
      className={cn('relative h-[42px] w-[64px] shrink-0', className)}
      aria-label={value == null ? 'No price' : `${Math.round(pct)}% chance`}
    >
      <svg viewBox="0 0 64 36" className="h-9 w-16 overflow-visible">
        <path
          d="M6 32 A26 26 0 0 1 58 32"
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M6 32 A26 26 0 0 1 58 32"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-x-0 top-[15px] text-center">
        <div className="num text-[13px] font-bold leading-none text-fg">
          {value == null ? '—' : `${Math.round(pct)}%`}
        </div>
        <div className="mt-0.5 text-[9px] font-medium leading-none text-muted">chance</div>
      </div>
    </div>
  );
}

export function PriceChange({ change, className }: { change: number | null; className?: string }) {
  if (change == null || change === 0) return null;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('num inline-flex items-center gap-0.5 font-semibold', up ? 'text-yes' : 'text-no', className)}>
      <Icon className="size-3.5" />
      {Math.abs(change)}%
    </span>
  );
}

export function MarketStatusBadge({ market }: { market: Pick<MarketSummary, 'status' | 'resolution'> }) {
  if (market.status === 'resolved') {
    return (
      <Badge tone={market.resolution === 'yes' ? 'yes' : 'no'}>
        <CheckCircle2 className="size-3" /> Resolved {market.resolution === 'yes' ? 'Yes' : 'No'}
      </Badge>
    );
  }
  if (market.status === 'closed') {
    return (
      <Badge tone="warn">
        <Clock className="size-3" /> Awaiting resolution
      </Badge>
    );
  }
  return null;
}

export function EndsLabel({ endDate, ended = false }: { endDate: string; ended?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="size-3" />
      {ended ? 'Ended' : 'Ends'} {formatDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}
