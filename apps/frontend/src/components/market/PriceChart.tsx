import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketDetail, PriceHistoryQuery } from '@repo/shared';
import { usePriceHistory } from '../../hooks/queries';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatProbability } from '../../lib/format';
import { SegmentedControl, Skeleton } from '../ui/primitives';
import { PriceChange } from './MarketBits';

type Interval = NonNullable<PriceHistoryQuery['interval']>;

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'all', label: 'All' },
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
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-pop">
      <div className="num text-sm font-semibold text-fg">{formatProbability(point.price)} Yes</div>
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
  const trendUp = (periodChange ?? 0) >= 0;
  const stroke = trendUp ? colors.yes : colors.no;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="num text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              {formatProbability(current)}
            </span>
            <span className="text-sm font-medium text-muted">chance</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <PriceChange change={periodChange} />
            {periodChange != null && periodChange !== 0 && (
              <span className="text-muted">
                {interval === 'all' ? 'all time' : `past ${INTERVALS.find(i => i.value === interval)?.label}`}
              </span>
            )}
          </div>
        </div>
        <SegmentedControl ariaLabel="Chart range" size="xs" value={interval} onChange={setRange} options={INTERVALS} />
      </div>

      <div className="mt-4 h-56 sm:h-72">
        {prices.isPending ? (
          <Skeleton className="size-full rounded-xl" />
        ) : data.length < 2 ? (
          <div className="grid size-full place-items-center rounded-xl border border-dashed border-border text-sm text-muted">
            No trades in this period yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 4" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tickFormatter(interval)}
                tick={{ fontSize: 11, fill: colors['fg-subtle'] }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: colors['fg-subtle'] }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={props => <ChartTooltip active={props.active} payload={props.payload} />}
                cursor={{ stroke: colors['fg-subtle'], strokeDasharray: '3 3' }}
              />
              <Area
                type="stepAfter"
                dataKey="price"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface, fill: stroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
