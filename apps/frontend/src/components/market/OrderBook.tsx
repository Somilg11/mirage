import { useMemo } from 'react';
import type { BookLevel, MarketDetail, OrderBookResponse, Outcome } from '@repo/shared';
import { cn } from '../../lib/cn';
import { formatCents, formatShares, formatUsd } from '../../lib/format';
import { SegmentedControl, Skeleton } from '../ui/primitives';

const MAX_LEVELS = 8;

interface Row extends BookLevel {
  total: number;
  cumulative: number;
}

function withTotals(levels: BookLevel[]): Row[] {
  let cumulative = 0;
  return levels.slice(0, MAX_LEVELS).map(level => {
    cumulative += level.quantity;
    return { ...level, total: level.price * level.quantity, cumulative };
  });
}

function BookRow({ row, max, kind, onSelect }: { row: Row; max: number; kind: 'bid' | 'ask'; onSelect?: () => void }) {
  const width = max ? `${Math.max(2, (row.cumulative / max) * 100)}%` : '0%';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative grid h-8 w-full grid-cols-[1fr_1fr_1fr] items-center px-4 text-left text-[13px] hover:bg-surface-2 sm:px-5"
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0.5 left-0 rounded-r-md transition-[width] duration-300',
          kind === 'bid' ? 'bg-yes-soft' : 'bg-no-soft',
        )}
        style={{ width }}
      />
      <span className={cn('num relative font-semibold', kind === 'bid' ? 'text-yes' : 'text-no')}>
        {formatCents(row.price)}
      </span>
      <span className="num relative text-right text-fg/90">{formatShares(row.quantity)}</span>
      <span className="num relative text-right text-muted">{formatUsd(row.total)}</span>
    </button>
  );
}

export function OrderBook({
  market,
  book,
  isLoading,
  outcome,
  onOutcomeChange,
  onSelectPrice,
}: {
  market: MarketDetail;
  book: OrderBookResponse | undefined;
  isLoading: boolean;
  outcome: Outcome;
  onOutcomeChange: (outcome: Outcome) => void;
  onSelectPrice: (price: number, outcome: Outcome) => void;
}) {
  const view = book?.[outcome];
  const asks = useMemo(() => withTotals(view?.asks ?? []), [view]);
  const bids = useMemo(() => withTotals(view?.bids ?? []), [view]);
  const max = Math.max(asks.at(-1)?.cumulative ?? 0, bids.at(-1)?.cumulative ?? 0);

  const bestAsk = asks[0]?.price;
  const bestBid = bids[0]?.price;
  const spread = bestAsk != null && bestBid != null ? bestAsk - bestBid : null;
  const last = market.lastPrice == null ? null : outcome === 'yes' ? market.lastPrice : 100 - market.lastPrice;

  return (
    <section aria-label="Order book">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <h2 className="text-[15px] font-semibold">Order book</h2>
        <SegmentedControl
          ariaLabel="Order book outcome"
          size="xs"
          value={outcome}
          onChange={onOutcomeChange}
          options={[
            { value: 'yes', label: 'Trade Yes' },
            { value: 'no', label: 'Trade No' },
          ]}
        />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle sm:px-5">
        <span>Price</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 px-4 pb-4 sm:px-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      ) : (
        <div className="pb-2">
          <div className="flex flex-col-reverse">
            {asks.length ? (
              asks.map(row => (
                <BookRow
                  key={`a${row.price}`}
                  row={row}
                  max={max}
                  kind="ask"
                  onSelect={() => onSelectPrice(row.price, outcome)}
                />
              ))
            ) : (
              <div className="px-5 py-3 text-center text-xs text-subtle">No asks</div>
            )}
          </div>

          <div className="my-1 flex items-center justify-between border-y border-border bg-surface-2/60 px-4 py-2 text-xs sm:px-5">
            <span className="text-muted">
              Last <span className="num font-semibold text-fg">{formatCents(last)}</span>
            </span>
            <span className="text-muted">
              Spread <span className="num font-semibold text-fg">{formatCents(spread)}</span>
            </span>
          </div>

          <div>
            {bids.length ? (
              bids.map(row => (
                <BookRow
                  key={`b${row.price}`}
                  row={row}
                  max={max}
                  kind="bid"
                  onSelect={() => onSelectPrice(row.price, outcome)}
                />
              ))
            ) : (
              <div className="px-5 py-3 text-center text-xs text-subtle">No bids</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
