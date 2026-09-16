import { useState } from 'react';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
import type { MarketDetail } from '@repo/shared';
import { useAuth } from '../../providers/AuthProvider';
import { useOrders, usePortfolio, useSplitMerge } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { cn } from '../../lib/cn';
import { formatCents, formatShares, formatSignedUsd, formatUsd } from '../../lib/format';
import { isTradable } from '../../lib/market';
import { Button } from '../ui/Button';
import { CardHeader, SegmentedControl } from '../ui/primitives';
import { OrderRow, OutcomeBadge } from '../portfolio/OrderRow';

function SplitMerge({ market, maxMerge }: { market: MarketDetail; maxMerge: number }) {
  const [action, setAction] = useState<'split' | 'merge'>('split');
  const [qty, setQty] = useState('');
  const mutation = useSplitMerge();
  const quantity = Math.floor(Number(qty) || 0);

  async function submit() {
    try {
      await mutation.mutateAsync({ action, marketId: market.id, quantity });
      toast.success(
        action === 'split'
          ? `Split ${formatUsd(quantity * 100)} into ${quantity} Yes + ${quantity} No`
          : `Merged ${quantity} pairs into ${formatUsd(quantity * 100)}`,
      );
      setQty('');
    } catch (err) {
      toast.error(`${action === 'split' ? 'Split' : 'Merge'} failed`, { description: errorMessage(err) });
    }
  }

  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="size-4 text-muted" /> Split & merge
        </div>
        <SegmentedControl
          size="xs"
          value={action}
          onChange={setAction}
          options={[
            { value: 'split', label: 'Split' },
            { value: 'merge', label: 'Merge' },
          ]}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {action === 'split'
          ? 'Convert $1.00 into 1 Yes + 1 No share. Useful for providing liquidity on both sides.'
          : `Redeem pairs of 1 Yes + 1 No for $1.00 each. You can merge up to ${formatShares(maxMerge)}.`}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          placeholder={action === 'split' ? 'Pairs to mint' : 'Pairs to merge'}
          value={qty}
          onChange={e => setQty(e.target.value.replace(/\D/g, ''))}
          className="num h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/60"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={quantity <= 0 || (action === 'merge' && quantity > maxMerge)}
          loading={mutation.isPending}
          onClick={submit}
        >
          {action === 'split' ? 'Split' : 'Merge'}
        </Button>
      </div>
    </div>
  );
}

export function YourPosition({ market }: { market: MarketDetail }) {
  const { status } = useAuth();
  const portfolio = usePortfolio();
  const orders = useOrders({ status: 'open', marketId: market.id });

  if (status !== 'authenticated') return null;

  const positions = portfolio.data?.positions.filter(p => p.market.id === market.id) ?? [];
  const openOrders = orders.data ?? [];
  const available = (o: 'yes' | 'no') => {
    const p = positions.find(x => x.outcome === o);
    return p ? p.quantity - p.lockedQuantity : 0;
  };
  const maxMerge = Math.min(available('yes'), available('no'));

  if (!positions.length && !openOrders.length && !isTradable(market)) return null;

  return (
    <section>
      <CardHeader title="Your position" />
      <div className="space-y-3 p-4 pt-3 sm:px-5">
        {positions.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {positions.map(p => (
              <li key={p.outcome} className="grid grid-cols-2 gap-3 p-3.5 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-muted">Outcome</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <OutcomeBadge outcome={p.outcome} />
                    <span className="num text-sm font-semibold">{formatShares(p.quantity)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Avg → Now</div>
                  <div className="num mt-1 text-sm font-semibold">
                    {formatCents(p.avgPrice == null ? null : Math.round(p.avgPrice * 10) / 10)} →{' '}
                    {formatCents(p.currentPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Value</div>
                  <div className="num mt-1 text-sm font-semibold">{formatUsd(p.value)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">P&L</div>
                  <div
                    className={cn(
                      'num mt-1 text-sm font-semibold',
                      p.pnl > 0 ? 'text-yes' : p.pnl < 0 ? 'text-no' : 'text-fg',
                    )}
                  >
                    {formatSignedUsd(p.pnl)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">You don't hold any shares in this market yet.</p>
        )}

        {openOrders.length > 0 && (
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle sm:px-5">
              Open orders ({openOrders.length})
            </div>
            <ul className="divide-y divide-border">
              {openOrders.map(o => (
                <OrderRow key={o.id} order={o} showMarket={false} />
              ))}
            </ul>
          </div>
        )}

        {isTradable(market) && <SplitMerge market={market} maxMerge={maxMerge} />}
      </div>
    </section>
  );
}
