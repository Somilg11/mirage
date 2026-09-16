import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { cn } from '../../lib/cn';
import { Logo, LogoMark } from '../ui/Logo';
import { Skeleton } from '../ui/primitives';
import { Button } from '../ui/Button';
import { AccountSummary, CashPill, SignInButton, ThemeToggle, UserMenu } from './AuthControls';

const NAV = [
  { to: '/', label: 'Markets', end: true },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/activity', label: 'Activity' },
];

function SearchField({
  autoFocus,
  onDone,
  className,
}: {
  autoFocus?: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const urlQuery = location.pathname === '/' ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field in sync when the URL changes (e.g. back/forward navigation).
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function apply(next: string) {
    const search = new URLSearchParams(location.pathname === '/' ? params : undefined);
    if (next.trim()) search.set('q', next.trim());
    else search.delete('q');
    navigate({ pathname: '/', search: search.toString() }, { replace: location.pathname === '/' });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    apply(value);
    inputRef.current?.blur();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} role="search" className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChange={e => {
          setValue(e.target.value);
          if (location.pathname === '/') apply(e.target.value);
        }}
        placeholder="Search markets"
        aria-label="Search markets"
        className="h-10 w-full rounded-xl border border-transparent bg-surface-3 pl-9 pr-9 text-sm text-fg outline-none placeholder:text-subtle focus:border-primary/50 focus:bg-surface"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            apply('');
          }}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border-strong px-1.5 text-[11px] text-subtle md:block">
          /
        </kbd>
      )}
    </form>
  );
}

export function Header() {
  const { status } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:h-16 sm:px-6">
        {mobileSearch ? (
          <div className="flex w-full items-center gap-2 md:hidden">
            <SearchField autoFocus onDone={() => setMobileSearch(false)} className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setMobileSearch(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Link to="/" className="shrink-0" aria-label="Mirage home">
              <span className="hidden sm:block">
                <Logo />
              </span>
              <span className="block sm:hidden">
                <LogoMark />
              </span>
            </Link>

            <SearchField className="hidden max-w-md flex-1 md:block" />

            <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Primary">
              {NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'text-fg' : 'text-muted hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileSearch(true)}
                aria-label="Search markets"
              >
                <Search className="size-[18px]" />
              </Button>

              {status === 'loading' && <Skeleton className="h-8 w-24 rounded-full" />}
              {status === 'anonymous' && (
                <>
                  <ThemeToggle />
                  <SignInButton size="sm" />
                </>
              )}
              {status === 'authenticated' && (
                <>
                  <AccountSummary />
                  <CashPill />
                  <UserMenu />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
