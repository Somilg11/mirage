import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { OrderDTO } from '@repo/shared';
import { useCancelOrder } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { cn } from '../../lib/cn';
import { formatCents, formatDateTime, formatRelative, formatShares, formatUsd } from '../../lib/format';
import { Badge } from '../ui/primitives';
import { Button } from '../ui/Button';

export function OutcomeBadge({ outcome }: { outcome: 'yes' | 'no' }) {
  return <Badge tone={outcome === 'yes' ? 'yes' : 'no'}>{outcome === 'yes' ? 'Yes' : 'No'}</Badge>;
}

function StatusBadge({ order }: { order: OrderDTO }) {
  if (order.status === 'open') {
    return <Badge tone="primary">{order.filledQuantity > 0 ? 'Partial' : 'Open'}</Badge>;
  }
  if (order.status === 'filled') return <Badge tone="yes">Filled</Badge>;
  return <Badge>{order.filledQuantity > 0 ? 'Partial · cancelled' : 'Cancelled'}</Badge>;
}

function CancelButton({ order }: { order: OrderDTO }) {
  const cancel = useCancelOrder();
  if (order.status !== 'open') return null;
  return (
    <Button
      variant="outline"
      size="xs"
      loading={cancel.isPending}
      aria-label="Cancel order"
      onClick={async () => {
        try {
          await cancel.mutateAsync(order.id);
          toast.success('Order cancelled');
        } catch (err) {
          toast.error('Could not cancel order', { description: errorMessage(err) });
        }
      }}
    >
      <X className="size-3.5" /> Cancel
    </Button>
  );
}

function FillBar({ order }: { order: OrderDTO }) {
  const pct = order.quantity ? (order.filledQuantity / order.quantity) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-14 overflow-hidden rounded-sm bg-surface-3">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-xs text-muted">
        {formatShares(order.filledQuantity)}/{formatShares(order.quantity)}
      </span>
    </div>
  );
}

/** Compact order row for narrow layouts. */
export function OrderRow({ order, showMarket = true }: { order: OrderDTO; showMarket?: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {showMarket && (
          <Link
            to={`/markets/${order.market.slug}`}
            className="line-clamp-1 text-sm font-medium text-fg hover:underline"
          >
            {order.market.title}
          </Link>
        )}
        <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted', showMarket && 'mt-1')}>
          <span className={cn('font-semibold capitalize', order.side === 'buy' ? 'text-yes' : 'text-no')}>
            {order.side}
          </span>
          <OutcomeBadge outcome={order.outcome} />
          <span className="num">
            {formatShares(order.quantity)} @ {formatCents(order.price)}
          </span>
          <StatusBadge order={order} />
          <span>{formatRelative(order.createdAt)}</span>
        </div>
        {order.status === 'open' && (
          <div className="mt-2">
            <FillBar order={order} />
          </div>
        )}
      </div>
      <CancelButton order={order} />
    </li>
  );
}

const COLS = 'lg:grid-cols-[minmax(0,1fr)_64px_64px_72px_120px_96px_110px_130px_84px]';

/** Full order table on desktop; falls back to compact rows on small screens. */
export function OrdersTable({ orders }: { orders: OrderDTO[] }) {
  return (
    <>
      <div
        className={cn(
          'hidden items-center gap-3 border-b border-border bg-surface-2 px-4 py-2 label-mono lg:grid',
          COLS,
        )}
      >
        <span>Market</span>
        <span>Side</span>
        <span>Outcome</span>
        <span className="text-right">Price</span>
        <span>Filled</span>
        <span className="text-right">Total</span>
        <span>Status</span>
        <span>Placed</span>
        <span />
      </div>
      <ul className="divide-y divide-border lg:hidden">
        {orders.map(o => (
          <OrderRow key={o.id} order={o} />
        ))}
      </ul>
      <ul className="hidden divide-y divide-border lg:block">
        {orders.map(o => (
          <li key={o.id} className={cn('grid items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-surface-2', COLS)}>
            <Link to={`/markets/${o.market.slug}`} className="line-clamp-1 font-medium text-fg hover:underline">
              {o.market.title}
            </Link>
            <span className={cn('font-semibold capitalize', o.side === 'buy' ? 'text-yes' : 'text-no')}>{o.side}</span>
            <span>
              <OutcomeBadge outcome={o.outcome} />
            </span>
            <span className="num text-right">{formatCents(o.price)}</span>
            <FillBar order={o} />
            <span className="num text-right">{formatUsd(o.price * o.quantity)}</span>
            <span>
              <StatusBadge order={o} />
            </span>
            <span className="text-xs text-muted">{formatDateTime(o.createdAt)}</span>
            <span className="flex justify-end">
              <CancelButton order={o} />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
