import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Flame } from 'lucide-react';
import type { MarketSummary } from '@repo/shared';
import { usePriceHistory } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCents, formatProbability, formatUsdCompact } from '../../lib/format';
import { Badge, Card, Skeleton } from '../ui/primitives';
import { EndsLabel, MarketIcon, PriceChange } from './MarketBits';

export function FeaturedMarket({ market }: { market: MarketSummary }) {
  const prices = usePriceHistory(market.id, '1m');
  const colors = useThemeColors();
  const gradientId = `featured-${useId().replace(/[^\w-]/g, '')}`;
  const data = useMemo(
    () => (prices.data ?? []).map(p => ({ t: new Date(p.t).getTime(), price: p.price })),
    [prices.data],
  );
  const up = (data.at(-1)?.price ?? 0) >= (data[0]?.price ?? 0);
  const stroke = up ? colors.yes : colors.no;
  const href = `/markets/${market.slug}`;

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="warn">
                <Flame className="size-3" /> Top market
              </Badge>
              <span className="font-medium text-muted">{market.category}</span>
            </div>
            <div className="mt-4 flex items-start gap-3.5">
              <MarketIcon category={market.category} imageUrl={market.imageUrl} size="lg" />
              <Link
                to={href}
                className="text-xl font-bold leading-tight tracking-tight text-fg hover:underline sm:text-2xl"
              >
                {market.title}
              </Link>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="num text-4xl font-bold tracking-tight">{formatProbability(market.yesPrice)}</span>
              <span className="text-sm text-muted">chance</span>
              <PriceChange change={market.change24h} className="text-sm" />
            </div>
          </div>
          <div className="w-full shrink-0 md:w-72">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`${href}?outcome=yes`}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-yes-soft font-semibold text-yes transition-colors hover:bg-yes hover:text-white"
              >
                Buy Yes <span className="num">{formatCents(market.yesPrice)}</span>
              </Link>
              <Link
                to={`${href}?outcome=no`}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-no-soft font-semibold text-no transition-colors hover:bg-no hover:text-white"
              >
                Buy No <span className="num">{formatCents(market.noPrice)}</span>
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted md:justify-end">
              <span className="num font-medium text-fg/80">{formatUsdCompact(market.volume)} Vol.</span>
              <EndsLabel endDate={market.endDate} />
            </div>
          </div>
        </div>
        <div className="h-44 min-h-44 flex-1 sm:h-56">
          {prices.isPending ? (
            <Skeleton className="size-full rounded-xl" />
          ) : data.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, 100]} />
                <Area
                  type="stepAfter"
                  dataKey="price"
                  stroke={stroke}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid size-full place-items-center rounded-xl border border-dashed border-border text-sm text-muted">
              No price history yet
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MarketList({
  title,
  icon,
  markets,
  metric,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  markets: MarketSummary[];
  metric: (m: MarketSummary) => React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 px-5 pt-5 text-[15px] font-semibold">
        {icon}
        {title}
      </div>
      <ul className="mt-2 flex-1 px-2 pb-2">
        {markets.map((m, i) => (
          <li key={m.id}>
            <Link
              to={`/markets/${m.slug}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2"
            >
              <span className="num w-4 text-xs font-semibold text-subtle">{i + 1}</span>
              <MarketIcon category={m.category} imageUrl={m.imageUrl} size="sm" />
              <span className="line-clamp-2 flex-1 text-sm font-medium leading-snug">{m.title}</span>
              <span className="shrink-0 text-right">{metric(m)}</span>
            </Link>
          </li>
        ))}
        {!markets.length && <li className="px-3 py-6 text-center text-sm text-muted">Nothing here yet</li>}
      </ul>
    </Card>
  );
}
