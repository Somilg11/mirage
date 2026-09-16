import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { RouteErrorFallback } from './RouteErrorFallback';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { Footer } from './Footer';

/** Thin top bar shown while a lazy route chunk loads. */
function NavigationProgress() {
  const navigation = useNavigation();
  const active = navigation.state !== 'idle';
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="h-full w-full origin-left animate-progress bg-primary" />
    </div>
  );
}

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <ScrollRestoration getKey={loc => loc.pathname} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        className="mx-auto min-h-screen w-full max-w-[1320px] flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-10"
      >
        {/* Resets when the path changes so one broken page never sticks across navigation. */}
        <ErrorBoundary resetKeys={[location.pathname]} fallback={props => <RouteErrorFallback {...props} />}>
          <div key={location.pathname} className="animate-page-in motion-reduce:animate-none">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
