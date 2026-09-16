import type { MarketDetail } from '@repo/shared';
import { useTrades } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { formatCents, formatRelative, formatShares } from '../../lib/format';
import { CardHeader, EmptyState, Skeleton } from '../ui/primitives';

export function RecentTrades({ market }: { market: MarketDetail }) {
  const trades = useTrades(market.id);

  return (
    <section>
      <CardHeader title="Recent trades" />
      <div className="mt-3 pb-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle sm:px-5">
          <span>Side</span>
          <span className="text-right">Price</span>
          <span className="text-right">Shares</span>
          <span className="w-20 text-right">Time</span>
        </div>
        {trades.isPending ? (
          <div className="space-y-1.5 px-4 pb-3 sm:px-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : !trades.data?.length ? (
          <EmptyState title="No trades yet" description="Be the first to trade this market." className="py-8" />
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {trades.data.map(trade => {
              // Present every trade from the YES perspective: YES buys and NO sells push the price up.
              const bullish = (trade.takerOutcome === 'yes') === (trade.takerSide === 'buy');
              return (
                <li
                  key={trade.id}
                  className="grid h-8 grid-cols-[1fr_1fr_1fr_auto] items-center px-4 text-[13px] sm:px-5"
                >
                  <span className={cn('font-semibold', bullish ? 'text-yes' : 'text-no')}>
                    {trade.takerSide === 'buy' ? 'Buy' : 'Sell'} {trade.takerOutcome === 'yes' ? 'Yes' : 'No'}
                  </span>
                  <span className="num text-right text-fg/90">
                    {formatCents(trade.takerOutcome === 'yes' ? trade.price : 100 - trade.price)}
                  </span>
                  <span className="num text-right text-fg/90">{formatShares(trade.quantity)}</span>
                  <span className="w-20 text-right text-xs text-muted">{formatRelative(trade.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
