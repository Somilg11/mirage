import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Info, Minus, Plus } from 'lucide-react';
import {
  PRICE_MAX,
  PRICE_MIN,
  type MarketDetail,
  type OrderBookResponse,
  type OrderSide,
  type Outcome,
} from '@repo/shared';
import { useAuth } from '../../providers/AuthProvider';
import { useMe, usePlaceOrder, usePortfolio } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { cn } from '../../lib/cn';
import { bestAsk, bestBid, estimateBuy, estimateSell, isTradable, outcomePrice } from '../../lib/market';
import { formatCents, formatShares, formatUsd } from '../../lib/format';
import { Button } from '../ui/Button';
import { SignInButton } from '../layout/AuthControls';

export type OrderMode = 'market' | 'limit';

export interface TicketState {
  side: OrderSide;
  outcome: Outcome;
  mode: OrderMode;
  limitPrice: number | null;
}

const clampPrice = (p: number) => Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(p)));
const parseNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'yes' | 'no' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn('num font-semibold', tone === 'yes' ? 'text-yes' : tone === 'no' ? 'text-no' : 'text-fg')}>
        {value}
      </span>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-medium text-fg">{children}</span>
      {hint && <span className="num text-xs text-muted">{hint}</span>}
    </div>
  );
}

function QuickChips({ chips, onPick }: { chips: { label: string; apply: () => void }[]; onPick?: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <button
          key={chip.label}
          type="button"
          onClick={() => {
            chip.apply();
            onPick?.();
          }}
          className="num h-7 rounded-md bg-surface-3 px-2.5 text-xs font-semibold text-muted transition-colors hover:bg-border hover:text-fg"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function TradePanel({
  market,
  book,
  ticket,
  onTicketChange,
  onSubmitted,
}: {
  market: MarketDetail;
  book: OrderBookResponse | undefined;
  ticket: TicketState;
  onTicketChange: (next: TicketState) => void;
  onSubmitted?: () => void;
}) {
  const { status } = useAuth();
  const me = useMe();
  const portfolio = usePortfolio();
  const placeOrder = usePlaceOrder();

  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');

  const { side, outcome, mode } = ticket;
  const isBuy = side === 'buy';
  const tradable = isTradable(market);

  const quote = (o: Outcome) => (isBuy ? bestAsk(book, o) : bestBid(book, o)) ?? outcomePrice(market, o);

  const limitPrice = ticket.limitPrice ?? clampPrice(quote(outcome) ?? 50);
  const balance = me.data?.balance ?? 0;
  const position = portfolio.data?.positions.find(p => p.market.id === market.id && p.outcome === outcome);
  const availableShares = position ? position.quantity - position.lockedQuantity : 0;

  const update = (patch: Partial<TicketState>) => onTicketChange({ ...ticket, ...patch });

  const estimate = useMemo(() => {
    const levels = book?.[outcome];
    if (mode === 'market') {
      if (isBuy) return estimateBuy(levels?.asks ?? [], Math.round(parseNumber(amount) * 100));
      return estimateSell(levels?.bids ?? [], Math.floor(parseNumber(shares)));
    }
    const qty = Math.floor(parseNumber(shares));
    return {
      shares: qty,
      total: qty * limitPrice,
      avgPrice: qty ? limitPrice : null,
      worstPrice: limitPrice,
      complete: true,
    };
  }, [book, outcome, mode, isBuy, amount, shares, limitPrice]);

  const validation = (() => {
    if (!tradable) return 'Trading is closed for this market';
    if (mode === 'market' && isBuy && parseNumber(amount) > 0 && estimate.shares === 0)
      return 'No sellers at this price';
    if (mode === 'market' && !isBuy && parseNumber(shares) > 0 && estimate.shares === 0) return 'No buyers right now';
    if (status !== 'authenticated') return null;
    if (isBuy && (mode === 'market' ? Math.round(parseNumber(amount) * 100) : estimate.total) > balance)
      return 'Insufficient balance';
    if (!isBuy && Math.floor(parseNumber(shares)) > availableShares) return 'Insufficient shares';
    return null;
  })();

  const canSubmit =
    status === 'authenticated' && tradable && estimate.shares > 0 && !validation && estimate.worstPrice != null;

  async function submit() {
    if (!canSubmit || estimate.worstPrice == null) return;
    try {
      const res = await placeOrder.mutateAsync({
        marketId: market.id,
        outcome,
        side,
        price: clampPrice(estimate.worstPrice),
        quantity: estimate.shares,
        timeInForce: mode === 'market' ? 'IOC' : 'GTC',
      });
      const label = outcome === 'yes' ? 'Yes' : 'No';
      const filled = res.order.filledQuantity;
      const resting = res.order.quantity - filled;
      if (filled > 0) {
        toast.success(`${isBuy ? 'Bought' : 'Sold'} ${formatShares(filled)} ${label}`, {
          description: `Avg. price ${formatCents(res.averagePrice)}${resting > 0 && res.order.status === 'open' ? ` · ${formatShares(resting)} resting on the book` : ''}`,
        });
      } else {
        toast.success('Limit order placed', {
          description: `${isBuy ? 'Buy' : 'Sell'} ${formatShares(res.order.quantity)} ${label} @ ${formatCents(res.order.price)}`,
        });
      }
      setAmount('');
      setShares('');
      onSubmitted?.();
    } catch (err) {
      toast.error('Order failed', { description: errorMessage(err) });
    }
  }

  const toWin = estimate.shares * 100;
  const returnPct = isBuy && estimate.total > 0 ? ((toWin - estimate.total) / estimate.total) * 100 : null;

  return (
    <div className="flex flex-col">
      {/* Buy / Sell + order type */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex">
          {(['buy', 'sell'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => update({ side: s, limitPrice: null })}
              className={cn(
                'relative h-11 px-3 text-[15px] font-semibold capitalize transition-colors',
                side === s ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {s}
              {side === s && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-fg" />}
            </button>
          ))}
        </div>
        <select
          value={mode}
          onChange={e => update({ mode: e.target.value as OrderMode, limitPrice: null })}
          aria-label="Order type"
          className="h-8 cursor-pointer rounded-lg bg-transparent pr-1 text-sm font-medium text-muted outline-none hover:text-fg"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>

      {/* Outcome */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['yes', 'no'] as const).map(o => {
          const active = outcome === o;
          const price = quote(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => update({ outcome: o, limitPrice: null })}
              aria-pressed={active}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors',
                active
                  ? o === 'yes'
                    ? 'bg-yes text-white'
                    : 'bg-no text-white'
                  : 'bg-surface-3 text-muted hover:text-fg',
              )}
            >
              {o === 'yes' ? 'Yes' : 'No'}
              <span className="num">{formatCents(price)}</span>
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      <div className="mt-5 space-y-5">
        {mode === 'limit' && (
          <div>
            <FieldLabel>Limit price</FieldLabel>
            <div className="flex h-12 items-center rounded-xl border border-border bg-surface-2 focus-within:border-primary/60">
              <button
                type="button"
                aria-label="Decrease price"
                onClick={() => update({ limitPrice: clampPrice(limitPrice - 1) })}
                className="grid h-full w-12 place-items-center text-muted hover:text-fg"
              >
                <Minus className="size-4" />
              </button>
              <input
                inputMode="numeric"
                value={limitPrice}
                onChange={e => {
                  const n = Number(e.target.value.replace(/\D/g, ''));
                  if (Number.isFinite(n)) update({ limitPrice: clampPrice(n || PRICE_MIN) });
                }}
                aria-label="Limit price in cents"
                className="num h-full min-w-0 flex-1 bg-transparent text-center text-lg font-semibold outline-none"
              />
              <span className="-ml-6 mr-3 text-sm text-muted">¢</span>
              <button
                type="button"
                aria-label="Increase price"
                onClick={() => update({ limitPrice: clampPrice(limitPrice + 1) })}
                className="grid h-full w-12 place-items-center text-muted hover:text-fg"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {mode === 'market' && isBuy ? (
          <div>
            <FieldLabel hint={status === 'authenticated' ? `Balance ${formatUsd(balance)}` : undefined}>
              Amount
            </FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-subtle">
                $
              </span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                aria-label="Amount in dollars"
                className="num h-14 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-4 text-right text-2xl font-semibold outline-none placeholder:text-subtle focus:border-primary/60"
              />
            </div>
            <QuickChips
              chips={[
                { label: '+$1', apply: () => setAmount(a => String(+(parseNumber(a) + 1).toFixed(2))) },
                { label: '+$10', apply: () => setAmount(a => String(+(parseNumber(a) + 10).toFixed(2))) },
                { label: '+$100', apply: () => setAmount(a => String(+(parseNumber(a) + 100).toFixed(2))) },
                ...(status === 'authenticated'
                  ? [{ label: 'Max', apply: () => setAmount((balance / 100).toFixed(2)) }]
                  : []),
              ]}
            />
          </div>
        ) : (
          <div>
            <FieldLabel
              hint={!isBuy && status === 'authenticated' ? `${formatShares(availableShares)} available` : undefined}
            >
              Shares
            </FieldLabel>
            <input
              inputMode="numeric"
              placeholder="0"
              value={shares}
              onChange={e => setShares(e.target.value.replace(/\D/g, ''))}
              aria-label="Number of shares"
              className="num h-14 w-full rounded-xl border border-border bg-surface-2 px-4 text-right text-2xl font-semibold outline-none placeholder:text-subtle focus:border-primary/60"
            />
            <QuickChips
              chips={
                isBuy
                  ? [
                      { label: '+10', apply: () => setShares(s => String(Math.floor(parseNumber(s)) + 10)) },
                      { label: '+50', apply: () => setShares(s => String(Math.floor(parseNumber(s)) + 50)) },
                      { label: '+100', apply: () => setShares(s => String(Math.floor(parseNumber(s)) + 100)) },
                    ]
                  : [
                      { label: '25%', apply: () => setShares(String(Math.floor(availableShares * 0.25))) },
                      { label: '50%', apply: () => setShares(String(Math.floor(availableShares * 0.5))) },
                      { label: 'Max', apply: () => setShares(String(availableShares)) },
                    ]
              }
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-5 space-y-2 rounded-xl bg-surface-2 p-3.5">
        <SummaryRow
          label="Avg. price"
          value={formatCents(estimate.avgPrice == null ? null : Math.round(estimate.avgPrice * 10) / 10)}
        />
        <SummaryRow label="Shares" value={formatShares(estimate.shares)} />
        {isBuy ? (
          <>
            <SummaryRow label={mode === 'market' ? 'Est. cost' : 'Total cost'} value={formatUsd(estimate.total)} />
            <div className="my-1 h-px bg-border" />
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">
                To win
                {returnPct != null && <span className="num ml-1.5 text-xs text-yes">+{returnPct.toFixed(0)}%</span>}
              </span>
              <span className="num text-xl font-bold text-yes">{formatUsd(toWin)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">{mode === 'market' ? "You'll receive" : 'Proceeds if filled'}</span>
              <span className="num text-xl font-bold text-fg">{formatUsd(estimate.total)}</span>
            </div>
          </>
        )}
      </div>

      {mode === 'market' && !estimate.complete && estimate.shares > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <Info className="mt-px size-3.5 shrink-0" /> Not enough liquidity to fill the full amount. Only the available
          shares will fill.
        </p>
      )}

      <div className="mt-4">
        {status === 'authenticated' ? (
          <Button
            size="lg"
            variant={outcome === 'yes' ? 'yes' : 'no'}
            className="w-full"
            disabled={!canSubmit}
            loading={placeOrder.isPending}
            onClick={submit}
          >
            {validation ?? `${isBuy ? 'Buy' : 'Sell'} ${outcome === 'yes' ? 'Yes' : 'No'}`}
          </Button>
        ) : (
          <SignInButton size="lg" className="w-full" disabled={status === 'loading'}>
            Log in to trade
          </SignInButton>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-subtle">
        Each share pays $1.00 if the outcome is correct. Paper trading only.
      </p>
    </div>
  );
}
