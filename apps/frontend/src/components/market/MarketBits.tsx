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
  const box = size === 'lg' ? 'size-12 rounded-md' : size === 'sm' ? 'size-7 rounded' : 'size-10 rounded-md';
  const glyph = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-3.5' : 'size-5';
  if (imageUrl) {
    return <img src={imageUrl} alt="" className={cn(box, 'shrink-0 object-cover', className)} loading="lazy" />;
  }
  const { icon: Icon, tile } = categoryMeta(category);
  return (
    <div className={cn(box, 'grid shrink-0 place-items-center bg-surface-3', tile, className)} aria-hidden>
      <Icon className={glyph} strokeWidth={1.75} />
    </div>
  );
}

/** Thin YES/NO split bar. */
export function ProbabilityBar({ value, className }: { value: number | null; className?: string }) {
  const pct = value == null ? 50 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex h-1 overflow-hidden rounded-full bg-surface-3', className)} aria-hidden>
      {value != null && (
        <>
          <div className="bg-yes" style={{ width: `${pct}%` }} />
          <div className="ml-px flex-1 bg-no" />
        </>
      )}
    </div>
  );
}

/** Price change in cents, which equals percentage points of probability. */
export function PriceChange({ change, className }: { change: number | null; className?: string }) {
  if (change == null || change === 0) return null;
  const up = change > 0;
  return (
    <span className={cn('num inline-flex items-center font-medium', up ? 'text-yes' : 'text-no', className)}>
      {up ? '▲' : '▼'}
      <span className="ml-0.5">{Math.abs(change)}</span>
    </span>
  );
}

export function MarketStatusBadge({ market }: { market: Pick<MarketSummary, 'status' | 'resolution'> }) {
  if (market.status === 'resolved') {
    return (
      <Badge tone={market.resolution === 'yes' ? 'yes' : 'no'}>
        Resolved {market.resolution === 'yes' ? 'Yes' : 'No'}
      </Badge>
    );
  }
  if (market.status === 'closed') return <Badge tone="warn">Pending resolution</Badge>;
  return null;
}

export function EndsLabel({ endDate, ended = false }: { endDate: string; ended?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      {ended ? 'Ended' : 'Ends'} {formatDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}
