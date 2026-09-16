import { useMemo } from 'react';
import type { MarketDetail, OrderBookResponse } from '@repo/shared';
import { useTrades } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { formatCents, formatShares, formatUsdCompact } from '../../lib/format';
import { Card } from '../ui/primitives';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

function Tile({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  const body = (
    <div className={cn('bg-surface px-3 py-2.5 text-center', className)}>
      <div className="label-mono">{label}</div>
      <div className="num mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
  if (!hint) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

function bookDepthCents(book: OrderBookResponse | undefined) {
  if (!book) return null;
  const side = (levels: { price: number; quantity: number }[]) => levels.reduce((s, l) => s + l.price * l.quantity, 0);
  return side(book.yes.bids) + side(book.yes.asks);
}

/** Exchange-style stat grid plus YES/NO trade-flow split from recent trades. */
export function MarketStats({ market, book }: { market: MarketDetail; book: OrderBookResponse | undefined }) {
  const trades = useTrades(market.id);

  const flow = useMemo(() => {
    let yes = 0;
    let no = 0;
    for (const t of trades.data ?? []) {
      // YES buys and NO sells push the YES price up.
      if ((t.takerOutcome === 'yes') === (t.takerSide === 'buy')) yes += t.quantity;
      else no += t.quantity;
    }
    const total = yes + no;
    return { yes, no, total, yesPct: total ? Math.round((yes / total) * 100) : 50 };
  }, [trades.data]);

  const spread = market.bestAsk != null && market.bestBid != null ? market.bestAsk - market.bestBid : null;
  const depth = bookDepthCents(book);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-3 gap-px bg-border">
        <Tile label="Yes" value={formatCents(market.yesPrice)} />
        <Tile label="No" value={formatCents(market.noPrice)} />
        <Tile label="Spread" value={formatCents(spread)} hint="Best ask minus best bid (YES)" />
        <Tile label="Volume" value={formatUsdCompact(market.volume)} />
        <Tile label="Liquidity" value={depth == null ? '—' : formatUsdCompact(depth)} hint="Value of resting orders" />
        <Tile label="Holders" value={formatShares(market.traders)} />
      </div>
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="label-mono">Trade flow</span>
          <span className="text-[11px] text-subtle">last {trades.data?.length ?? 0} trades</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="num text-yes">Yes {formatShares(flow.yes)}</span>
          <span className="num text-no">No {formatShares(flow.no)}</span>
        </div>
        <div className="mt-1.5 flex h-1.5 gap-px overflow-hidden rounded-sm bg-surface-3">
          {flow.total > 0 && (
            <>
              <div className="bg-yes" style={{ width: `${flow.yesPct}%` }} />
              <div className="flex-1 bg-no" />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
