import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Gift, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useClaimDaily, useMe, usePortfolio } from '../hooks/queries';
import { useTheme } from '../providers/ThemeProvider';
import { errorMessage } from '../api/client';
import { formatCountdown, formatDate, formatUsd, shortAddress } from '../lib/format';
import { Card, CardHeader, Skeleton, Stat } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/layout/AuthControls';
import { RequireAuth } from '../components/portfolio/SignInPrompt';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
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
      toast.success('Daily reward claimed', { description: 'Your balance has been topped up.' });
    } catch (err) {
      toast.error('Could not claim reward', { description: errorMessage(err) });
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-warn/10 blur-3xl"
      />
      <CardHeader title="Daily reward" description="Top up your paper balance once per day (UTC)." />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn">
            <Gift className="size-6" />
          </div>
          <div>
            <div className="num text-2xl font-bold">+$100.00</div>
            <div className="text-xs text-muted">
              {waiting ? `Next reward in ${formatCountdown(nextClaimAt - now)}` : 'Available now'}
            </div>
          </div>
        </div>
        <Button
          size="lg"
          className="sm:w-44"
          disabled={waiting || !me.data}
          loading={claim.isPending}
          onClick={onClaim}
        >
          {waiting ? 'Claimed today' : 'Claim reward'}
        </Button>
      </div>
    </Card>
  );
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

  return (
    <Card className="p-5 sm:p-6">
      {me.isPending ? (
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ) : me.data ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar seed={me.data.address} className="size-16" />
            <div className="min-w-0">
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-2 font-mono text-lg font-semibold hover:text-primary"
                title="Copy wallet address"
              >
                {shortAddress(me.data.address, 6)}
                {copied ? <Check className="size-4 text-yes" /> : <Copy className="size-4 text-muted" />}
              </button>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="size-3.5 text-yes" /> Solana wallet · Joined {formatDate(me.data.createdAt)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:flex sm:gap-10">
            <Stat label="Cash" value={formatUsd(me.data.balance)} />
            <Stat label="Portfolio" value={portfolio.data ? formatUsd(portfolio.data.totalValue) : '—'} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Preferences() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader title="Preferences" />
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <div className="text-sm font-medium">Appearance</div>
          <div className="text-xs text-muted">Choose how Mirage looks on this device.</div>
        </div>
        <div className="inline-flex rounded-lg bg-surface-3 p-0.5">
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold capitalize ${theme === t ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
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
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <RequireAuth
        title="Sign in to view your profile"
        description="Connect a Solana wallet to start paper trading with $100 of free credit every day."
      >
        <AccountCard />
        <DailyReward />
      </RequireAuth>
      <Preferences />
      <Card className="p-4 text-sm leading-relaxed text-muted sm:p-5">
        <span className="font-semibold text-fg">About paper trading.</span> Mirage is a simulation. Balances have no
        monetary value and cannot be withdrawn. Markets are resolved by administrators according to each market's
        published rules.
      </Card>
    </div>
  );
}
