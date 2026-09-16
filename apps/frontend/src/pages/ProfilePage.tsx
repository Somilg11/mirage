import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Gift, Moon, Sun } from 'lucide-react';
import { useClaimDaily, useMe, usePortfolio } from '../hooks/queries';
import { useTheme } from '../providers/ThemeProvider';
import { errorMessage } from '../api/client';
import { cn } from '../lib/cn';
import { formatCountdown, formatDate, formatSignedUsd, formatUsd, shortAddress } from '../lib/format';
import { Card, CardHeader, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/layout/AuthControls';
import { RequireAuth } from '../components/portfolio/SignInPrompt';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function AccountCard() {
  const me = useMe();
  const portfolio = usePortfolio();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!me.data) return;
    await navigator.clipboard.writeText(me.data.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (me.isPending) return <Skeleton className="h-40 rounded-lg" />;
  if (!me.data) return null;

  const stats = [
    { label: 'Cash', value: formatUsd(me.data.balance) },
    { label: 'In orders', value: formatUsd(me.data.lockedBalance) },
    { label: 'Portfolio', value: portfolio.data ? formatUsd(portfolio.data.totalValue) : '—' },
    {
      label: 'Unrealized P&L',
      value: portfolio.data ? formatSignedUsd(portfolio.data.unrealizedPnl) : '—',
      tone: portfolio.data ? portfolio.data.unrealizedPnl : 0,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="relative flex items-center gap-4 border-b border-border px-5 py-5">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <Avatar seed={me.data.address} className="relative size-14" />
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2 font-mono text-base font-medium hover:text-primary"
            title="Copy wallet address"
          >
            {shortAddress(me.data.address, 6)}
            {copied ? <Check className="size-3.5 text-yes" /> : <Copy className="size-3.5 text-muted" />}
          </button>
          <div className="mt-1 text-xs text-muted">Solana wallet · Member since {formatDate(me.data.createdAt)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-border">
        {stats.map(s => (
          <div key={s.label} className="px-5 py-3.5">
            <div className="label-mono">{s.label}</div>
            <div
              className={cn(
                'num mt-1 text-base font-semibold',
                s.tone ? (s.tone > 0 ? 'text-yes' : 'text-no') : 'text-fg',
              )}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DailyReward() {
  const me = useMe();
  const claim = useClaimDaily();
  const now = useNow();

  const nextClaimAt = me.data?.nextClaimAt ? new Date(me.data.nextClaimAt).getTime() : null;
  const waiting = nextClaimAt != null && nextClaimAt > now;

  async function onClaim() {
    try {
      await claim.mutateAsync();
      toast.success('Daily reward claimed', { description: '$100.00 added to your cash balance.' });
    } catch (err) {
      toast.error('Could not claim reward', { description: errorMessage(err) });
    }
  }

  return (
    <Card>
      <CardHeader title="Daily reward" description="Top up your balance once per UTC day." />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-border bg-surface-2 text-warn">
            <Gift className="size-5" />
          </div>
          <div>
            <div className="num text-lg font-semibold">+$100.00</div>
            <div className="text-xs text-muted">
              {waiting ? (
                <>
                  Next reward in <span className="num text-fg">{formatCountdown(nextClaimAt - now)}</span>
                </>
              ) : (
                'Available now'
              )}
            </div>
          </div>
        </div>
        <Button className="sm:w-40" disabled={waiting || !me.data} loading={claim.isPending} onClick={onClaim}>
          {waiting ? 'Claimed today' : 'Claim reward'}
        </Button>
      </div>
    </Card>
  );
}

function Preferences() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader title="Preferences" />
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-medium">Appearance</div>
          <div className="text-xs text-muted">Stored on this device.</div>
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium capitalize',
                theme === t ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {t === 'light' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {t}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ProfilePage() {
  useDocumentTitle('Profile');
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-sm text-muted">Account, rewards and preferences.</p>
      </div>
      <RequireAuth
        title="Connect a wallet to view your profile"
        description="Sign in with a Solana wallet and claim $100 of trading credit every day."
      >
        <AccountCard />
        <DailyReward />
      </RequireAuth>
      <Preferences />
      <p className="px-1 text-xs leading-relaxed text-subtle">
        Mirage is a simulated venue. Balances have no monetary value and cannot be withdrawn. Markets are resolved by
        administrators according to each market's published rules.
      </p>
    </div>
  );
}
