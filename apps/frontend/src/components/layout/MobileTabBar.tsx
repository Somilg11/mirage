import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, Home, User } from 'lucide-react';
import { cn } from '../../lib/cn';

const TABS = [
  { to: '/', label: 'Markets', icon: Home, end: true },
  { to: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/profile', label: 'Profile', icon: User },
];

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="grid h-14 grid-cols-4">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-fg' : 'text-subtle',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-5', isActive && 'text-primary')} strokeWidth={isActive ? 2.25 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
