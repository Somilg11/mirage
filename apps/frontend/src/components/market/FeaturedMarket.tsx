import { useId, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketSummary } from '@repo/shared';
import { usePriceHistory } from '../../hooks/queries';
import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../lib/cn';
import { formatCents, formatProbability, formatUsdCompact } from '../../lib/format';
import { Card, Skeleton } from '../ui/primitives';
import { EndsLabel, MarketIcon, PriceChange } from './MarketBits';

export function FeaturedMarket({ market }: { market: MarketSummary }) {
  const prices = usePriceHistory(market.id, '1m');
  const colors = useThemeColors();
  const gradientId = `featured-${useId().replace(/[^\w-]/g, '')}`;
  const data = useMemo(
    () => (prices.data ?? []).map(p => ({ t: new Date(p.t).getTime(), price: p.price })),
    [prices.data],
  );
  const href = `/markets/${market.slug}`;

  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-medium text-fg/80">{market.category}</span>
        <span aria-hidden>·</span>
        <EndsLabel endDate={market.endDate} />
      </div>

      <div className="mt-3 flex items-start gap-3">
        <MarketIcon category={market.category} imageUrl={market.imageUrl} size="lg" />
        <Link
          to={href}
          className="text-lg font-semibold leading-snug tracking-tight text-fg hover:underline sm:text-xl"
        >
          {market.title}
        </Link>
      </div>

      <div className="mt-4 grid flex-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="num text-3xl font-semibold tracking-tight">{formatProbability(market.yesPrice)}</span>
            <span className="text-sm text-muted">chance</span>
            <PriceChange change={market.change24h} className="text-sm" />
          </div>
          <div className="mt-4 space-y-2">
            <Link
              to={`${href}?outcome=yes`}
              className="flex h-10 items-center justify-between rounded-md bg-yes-soft px-3 text-sm font-semibold text-yes transition-colors hover:bg-yes hover:text-white"
            >
              <span>Buy Yes</span>
              <span className="num">{formatCents(market.yesPrice)}</span>
            </Link>
            <Link
              to={`${href}?outcome=no`}
              className="flex h-10 items-center justify-between rounded-md bg-no-soft px-3 text-sm font-semibold text-no transition-colors hover:bg-no hover:text-white"
            >
              <span>Buy No</span>
              <span className="num">{formatCents(market.noPrice)}</span>
            </Link>
          </div>
          <dl className="mt-auto grid grid-cols-2 gap-3 pt-4 text-xs">
            <div>
              <dt className="text-muted">Volume</dt>
              <dd className="num mt-0.5 font-semibold text-fg">{formatUsdCompact(market.volume)}</dd>
            </div>
            <div>
              <dt className="text-muted">Spread</dt>
              <dd className="num mt-0.5 font-semibold text-fg">
                {market.bestAsk != null && market.bestBid != null ? formatCents(market.bestAsk - market.bestBid) : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative h-48 md:h-auto md:min-h-56">
          <div className="absolute inset-0">
            {prices.isPending ? (
              <Skeleton className="size-full" />
            ) : data.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.primary} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
                  <YAxis
                    orientation="right"
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: colors['fg-subtle'] }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ stroke: colors.border }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as { t: number; price: number } | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-pop">
                          <span className="num font-semibold">{p.price}%</span>{' '}
                          <span className="text-muted">
                            {new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="price"
                    stroke={colors.primary}
                    strokeWidth={1.75}
                    fill={`url(#${gradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid size-full place-items-center rounded-md border border-dashed border-border text-sm text-muted">
                No price history yet
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function MarketList({
  title,
  action,
  markets,
  metric,
  className,
}: {
  title: string;
  action?: ReactNode;
  markets: MarketSummary[];
  metric: (m: MarketSummary) => ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <ul className="flex-1 divide-y divide-border">
        {markets.map(m => (
          <li key={m.id}>
            <Link to={`/markets/${m.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
              <MarketIcon category={m.category} imageUrl={m.imageUrl} size="sm" />
              <span className="line-clamp-2 flex-1 text-[13px] font-medium leading-snug">{m.title}</span>
              <span className="shrink-0 text-right">{metric(m)}</span>
            </Link>
          </li>
        ))}
        {!markets.length && <li className="px-4 py-6 text-center text-sm text-muted">Nothing here yet</li>}
      </ul>
    </Card>
  );
}
