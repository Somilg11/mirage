import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Activity, BarChart3, ChevronDown, Gift, LogOut, Moon, Sun, User, Wallet } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { useMe, usePortfolio } from '../../hooks/queries';
import { errorMessage } from '../../api/client';
import { formatUsd, shortAddress } from '../../lib/format';
import { Button, type ButtonProps } from '../ui/Button';
import { Menu, MenuItem } from '../ui/Menu';
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

export function Avatar({ seed, className = 'size-8' }: { seed: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return (
    <span
      aria-hidden
      className={`${className} inline-block shrink-0 rounded-full ring-1 ring-border`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 85% 62%), hsl(${(hue + 60) % 360} 80% 45%))`,
      }}
    />
  );
}

export function AccountSummary() {
  const portfolio = usePortfolio();
  if (portfolio.isPending) {
    return (
      <div className="hidden items-center gap-5 lg:flex">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }
  if (!portfolio.data) return null;
  return (
    <div className="hidden items-center gap-1 lg:flex">
      <Link to="/portfolio" className="rounded-lg px-2.5 py-1 text-right hover:bg-surface-2">
        <div className="text-[11px] font-medium leading-tight text-muted">Portfolio</div>
        <div className="num text-sm font-semibold leading-tight text-yes">{formatUsd(portfolio.data.totalValue)}</div>
      </Link>
      <Link to="/profile" className="rounded-lg px-2.5 py-1 text-right hover:bg-surface-2">
        <div className="text-[11px] font-medium leading-tight text-muted">Cash</div>
        <div className="num text-sm font-semibold leading-tight text-yes">{formatUsd(portfolio.data.cash)}</div>
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
    <Menu
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-surface-2"
        >
          <Avatar seed={address || 'mirage'} />
          <ChevronDown className="hidden size-4 text-muted sm:block" />
        </button>
      )}
    >
      {close => (
        <>
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar seed={address || 'mirage'} className="size-9" />
            <div className="min-w-0">
              <div className="truncate font-mono text-sm font-medium">{address ? shortAddress(address, 6) : '—'}</div>
              <div className="num text-xs text-muted">
                {me.data ? `${formatUsd(me.data.balance)} cash` : 'Loading…'}
              </div>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<User />}
            onClick={() => {
              close();
              navigate('/profile');
            }}
          >
            Profile
          </MenuItem>
          <MenuItem
            icon={<BarChart3 />}
            onClick={() => {
              close();
              navigate('/portfolio');
            }}
          >
            Portfolio
          </MenuItem>
          <MenuItem
            icon={<Activity />}
            onClick={() => {
              close();
              navigate('/activity');
            }}
          >
            Activity
          </MenuItem>
          <MenuItem
            icon={<Gift />}
            onClick={() => {
              close();
              navigate('/profile');
            }}
          >
            Daily reward
          </MenuItem>
          <MenuItem icon={theme === 'dark' ? <Sun /> : <Moon />} onClick={toggleTheme}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </MenuItem>
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<LogOut />}
            className="text-no"
            onClick={async () => {
              close();
              await signOut();
              toast.success('Signed out');
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  );
}

export function CashPill() {
  const me = useMe();
  if (!me.data) return null;
  return (
    <Link
      to="/profile"
      className="num inline-flex h-8 items-center gap-1.5 rounded-full bg-yes-soft px-2.5 text-[13px] font-semibold text-yes lg:hidden"
    >
      <Wallet className="size-3.5" />
      {formatUsd(me.data.balance)}
    </Link>
  );
}
