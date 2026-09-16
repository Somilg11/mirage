import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketDetail, PriceHistoryQuery } from '@repo/shared';
import { usePriceHistory } from '../../hooks/queries';
import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../lib/cn';
import { formatProbability } from '../../lib/format';
import { Skeleton } from '../ui/primitives';
import { PriceChange } from './MarketBits';

type Interval = NonNullable<PriceHistoryQuery['interval']>;

const INTERVALS: { value: Interval; label: string; caption: string }[] = [
  { value: '1d', label: '1D', caption: 'past day' },
  { value: '1w', label: '1W', caption: 'past week' },
  { value: '1m', label: '1M', caption: 'past month' },
  { value: 'all', label: 'ALL', caption: 'all time' },
];

function tickFormatter(interval: Interval) {
  return (t: number) => {
    const d = new Date(t);
    if (interval === '1d') return d.toLocaleTimeString('en-US', { hour: 'numeric' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as { t: number; price: number } | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 shadow-pop">
      <div className="num text-[13px] font-semibold text-fg">Yes {formatProbability(point.price)}</div>
      <div className="text-[11px] text-muted">
        {new Date(point.t).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

export function PriceChart({ market }: { market: MarketDetail }) {
  const [interval, setRange] = useState<Interval>('1m');
  const prices = usePriceHistory(market.id, interval);
  const colors = useThemeColors();
  const gradientId = `price-fill-${useId().replace(/[^\w-]/g, '')}`;

  const data = useMemo(
    () => (prices.data ?? []).map(p => ({ t: new Date(p.t).getTime(), price: p.price })),
    [prices.data],
  );

  const current = market.status === 'resolved' ? (market.resolution === 'yes' ? 100 : 0) : market.yesPrice;
  const first = data[0]?.price;
  const periodChange = current != null && first != null ? current - first : null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className="size-2 rounded-full bg-primary" aria-hidden /> Yes
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="num text-[28px] font-semibold leading-none tracking-tight text-fg">
          {formatProbability(current)}
        </span>
        <span className="text-sm text-muted">chance</span>
        {periodChange != null && periodChange !== 0 && (
          <span className="text-xs text-muted">
            <PriceChange change={periodChange} /> {INTERVALS.find(i => i.value === interval)?.caption}
          </span>
        )}
      </div>

      <div className="mt-4 h-56 sm:h-72">
        {prices.isPending ? (
          <Skeleton className="size-full" />
        ) : data.length < 2 ? (
          <div className="grid size-full place-items-center rounded-md border border-dashed border-border text-sm text-muted">
            No trades in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
            <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.border} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tickFormatter(interval)}
                tick={{ fontSize: 11, fill: colors['fg-subtle'] }}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: colors['fg-subtle'] }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={props => <ChartTooltip active={props.active} payload={props.payload} />}
                cursor={{ stroke: colors['fg-subtle'], strokeDasharray: '3 3' }}
              />
              <Area
                type="stepAfter"
                dataKey="price"
                stroke={colors.primary}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: colors.surface, fill: colors.primary }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-1" role="tablist" aria-label="Chart range">
        {INTERVALS.map(i => (
          <button
            key={i.value}
            role="tab"
            type="button"
            aria-selected={interval === i.value}
            onClick={() => setRange(i.value)}
            className={cn(
              'h-7 rounded px-2 text-xs font-semibold transition-colors',
              interval === i.value ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
