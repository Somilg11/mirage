import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Gift, History, LayoutGrid, LogOut, Moon, Sun, User, Wallet } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { useClaimDaily, useMe, usePortfolio } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { formatUsd, shortAddress } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button, type ButtonProps } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Skeleton } from '../ui/primitives';

export function SignInButton(props: Omit<ButtonProps, 'onClick'>) {
  const { signIn, isConfigured } = useAuth();

  async function handleClick() {
    try {
      await signIn();
    } catch (err) {
      toast.error('Sign in failed', { description: errorMessage(err) });
    }
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={!isConfigured || props.disabled}
      title={isConfigured ? undefined : 'Authentication is not configured'}
    >
      {props.children ?? 'Log in'}
    </Button>
  );
}

/** Deterministic identicon-style avatar derived from the wallet address. */
export function Avatar({ seed, className = 'size-8' }: { seed: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const cells = Array.from({ length: 9 }, (_, i) => (i === 4 ? 1 : (hash >> i) & 1));
  return (
    <span
      aria-hidden
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-border', className)}
      style={{ background: `hsl(${hue} 35% 18%)` }}
    >
      {/* Inset via absolute positioning: percentage padding would resolve against the parent's width. */}
      <span className="absolute inset-[24%] grid grid-cols-3 grid-rows-3 gap-[8%]">
        {cells.map((on, i) => (
          <span key={i} className="rounded-[1px]" style={{ background: on ? `hsl(${hue} 75% 60%)` : 'transparent' }} />
        ))}
      </span>
    </span>
  );
}

export function ClaimButton() {
  const me = useMe();
  const claim = useClaimDaily();
  // The API only sets nextClaimAt while today's reward has already been claimed.
  if (!me.data || me.data.nextClaimAt) return null;

  return (
    <Button
      size="sm"
      className="hidden sm:inline-flex"
      loading={claim.isPending}
      onClick={async () => {
        try {
          await claim.mutateAsync();
          toast.success('Daily reward claimed', { description: '$100.00 added to your cash balance.' });
        } catch (err) {
          toast.error('Could not claim reward', { description: errorMessage(err) });
        }
      }}
    >
      <Gift className="size-3.5" /> Claim $100
    </Button>
  );
}

export function AccountSummary() {
  const portfolio = usePortfolio();
  if (portfolio.isPending) {
    return (
      <div className="hidden items-center gap-4 lg:flex">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }
  if (!portfolio.data) return null;
  return (
    <div className="hidden items-center lg:flex">
      <Link to="/portfolio" className="rounded-md px-2.5 py-1 hover:bg-surface-2">
        <div className="text-[11px] leading-tight text-muted">Portfolio</div>
        <div className="num text-[13px] font-semibold leading-tight text-fg">
          {formatUsd(portfolio.data.totalValue)}
        </div>
      </Link>
      <Link to="/profile" className="rounded-md px-2.5 py-1 hover:bg-surface-2">
        <div className="text-[11px] leading-tight text-muted">Cash</div>
        <div className="num text-[13px] font-semibold leading-tight text-fg">{formatUsd(portfolio.data.cash)}</div>
      </Link>
    </div>
  );
}

export function UserMenu() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const me = useMe();
  const navigate = useNavigate();
  const address = me.data?.address ?? '';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-1 rounded-full p-0.5 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/50 sm:pr-1"
        >
          <Avatar seed={address || 'mirage'} className="size-7" />
          <ChevronDown className="hidden size-3.5 text-muted sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 border-border">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
          <Avatar seed={address || 'mirage'} className="size-8" />
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] font-medium text-fg">
              {address ? shortAddress(address, 5) : '—'}
            </div>
            <div className="num text-xs text-muted">{me.data ? `${formatUsd(me.data.balance)} cash` : '…'}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/portfolio')}>
          <LayoutGrid /> Portfolio
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/activity')}>
          <History /> Activity
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <User /> Profile & rewards
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={e => {
            e.preventDefault();
            toggleTheme();
          }}
        >
          {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await signOut();
            toast.success('Signed out');
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function CashPill() {
  const me = useMe();
  if (!me.data) return null;
  return (
    <Link
      to="/profile"
      className="num inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-[13px] font-semibold text-fg lg:hidden"
    >
      <Wallet className="size-3.5 text-muted" />
      {formatUsd(me.data.balance)}
    </Link>
  );
}
