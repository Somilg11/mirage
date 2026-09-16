import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { OrderDTO } from '@repo/shared';
import { useCancelOrder } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { cn } from '../../lib/cn';
import { formatCents, formatRelative, formatShares, formatUsd } from '../../lib/format';
import { Badge } from '../ui/primitives';
import { Button } from '../ui/Button';

export function OutcomeBadge({ outcome }: { outcome: 'yes' | 'no' }) {
  return <Badge tone={outcome === 'yes' ? 'yes' : 'no'}>{outcome === 'yes' ? 'Yes' : 'No'}</Badge>;
}

function StatusBadge({ order }: { order: OrderDTO }) {
  if (order.status === 'open') {
    return <Badge tone="primary">{order.filledQuantity > 0 ? 'Partially filled' : 'Open'}</Badge>;
  }
  if (order.status === 'filled') return <Badge tone="yes">Filled</Badge>;
  return <Badge>{order.filledQuantity > 0 ? 'Partially filled' : 'Cancelled'}</Badge>;
}

export function OrderRow({ order, showMarket = true }: { order: OrderDTO; showMarket?: boolean }) {
  const cancel = useCancelOrder();
  const progress = order.quantity ? (order.filledQuantity / order.quantity) * 100 : 0;

  async function onCancel() {
    try {
      await cancel.mutateAsync(order.id);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error('Could not cancel order', { description: errorMessage(err) });
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
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
          <span className="num hidden sm:inline">· {formatUsd(order.price * order.quantity)}</span>
          <StatusBadge order={order} />
          <span>{formatRelative(order.createdAt)}</span>
        </div>
        {order.status === 'open' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="num text-[11px] text-muted">
              {formatShares(order.filledQuantity)}/{formatShares(order.quantity)} filled
            </span>
          </div>
        )}
      </div>
      {order.status === 'open' && (
        <Button variant="outline" size="xs" onClick={onCancel} loading={cancel.isPending} aria-label="Cancel order">
          <X className="size-3.5" /> Cancel
        </Button>
      )}
    </li>
  );
}
