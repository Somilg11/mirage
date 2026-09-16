import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useCategories } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { Logo, LogoMark } from '../ui/Logo';
import { Skeleton } from '../ui/primitives';
import { Button } from '../ui/Button';
import { AccountSummary, CashPill, ClaimButton, SignInButton, ThemeToggle, UserMenu } from './AuthControls';

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
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
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
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
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
        className="h-9 w-full rounded-md border border-border bg-surface-2 pl-8 pr-8 text-sm text-fg outline-none placeholder:text-subtle focus:border-primary/60 focus:bg-surface"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            apply('');
          }}
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-subtle hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[11px] text-subtle md:block">
          /
        </kbd>
      )}
    </form>
  );
}

/** Secondary row: market filters as plain text links, like an exchange's section nav. */
function MarketNav() {
  const categories = useCategories();
  const location = useLocation();
  const [params] = useSearchParams();
  const onHome = location.pathname === '/';
  const category = onHome ? params.get('category') : null;
  const sort = onHome ? params.get('sort') : null;

  const links: { label: string; to: string; active: boolean }[] = [
    { label: 'Trending', to: '/', active: onHome && !category && !sort },
    { label: 'New', to: '/?sort=newest', active: onHome && !category && sort === 'newest' },
    { label: 'Ending soon', to: '/?sort=ending', active: onHome && !category && sort === 'ending' },
  ];

  const linkClass = (active: boolean) =>
    cn(
      'flex h-full shrink-0 items-center border-b-2 text-[13px] font-medium transition-colors',
      active ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
    );

  return (
    <nav aria-label="Market sections" className="border-t border-border">
      <div className="no-scrollbar mx-auto flex h-10 max-w-[1320px] items-center gap-5 overflow-x-auto px-4 sm:px-6">
        {links.map(link => (
          <Link key={link.label} to={link.to} className={linkClass(link.active)}>
            {link.label}
          </Link>
        ))}
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
        {categories.isPending
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-3 w-14 shrink-0" />)
          : categories.data?.map(c => (
              <Link
                key={c.name}
                to={`/?category=${encodeURIComponent(c.name)}`}
                className={linkClass(category === c.name)}
              >
                {c.name}
              </Link>
            ))}
      </div>
    </nav>
  );
}

const PRIMARY_NAV = [
  { to: '/', label: 'Markets', end: true },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/activity', label: 'Activity' },
];

export function Header() {
  const { status } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
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

            <SearchField className="hidden w-full max-w-[420px] md:block" />

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {PRIMARY_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
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
                <Search className="size-4" />
              </Button>

              {status === 'loading' && <Skeleton className="h-8 w-28" />}
              {status === 'anonymous' && (
                <>
                  <ThemeToggle />
                  <SignInButton size="sm" variant="ghost" className="hidden sm:inline-flex">
                    Log in
                  </SignInButton>
                  <SignInButton size="sm">Sign up</SignInButton>
                </>
              )}
              {status === 'authenticated' && (
                <>
                  <AccountSummary />
                  <CashPill />
                  <ClaimButton />
                  <UserMenu />
                </>
              )}
            </div>
          </>
        )}
      </div>
      <MarketNav />
    </header>
  );
}
