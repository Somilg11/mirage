import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { BootFallback } from '../components/layout/BootFallback';
import { HomePage } from '../pages/HomePage';
import { LegacyMarketRedirect, NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage';

/**
 * Non-home routes are code-split with the router's `lazy` API, so navigation stays on the
 * current page (with a progress bar) until the next chunk is ready instead of flashing a spinner.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    // Shown while a deep-linked lazy route loads on first visit.
    hydrateFallbackElement: <BootFallback />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'markets/:slug',
            lazy: () => import('../pages/MarketPage').then(m => ({ Component: m.MarketPage })),
          },
          {
            path: 'portfolio',
            lazy: () => import('../pages/PortfolioPage').then(m => ({ Component: m.PortfolioPage })),
          },
          {
            path: 'activity',
            lazy: () => import('../pages/ActivityPage').then(m => ({ Component: m.ActivityPage })),
          },
          {
            path: 'profile',
            lazy: () => import('../pages/ProfilePage').then(m => ({ Component: m.ProfilePage })),
          },
          {
            path: 'terms',
            lazy: () => import('../pages/legal/TermsPage').then(m => ({ Component: m.TermsPage })),
          },
          {
            path: 'privacy',
            lazy: () => import('../pages/legal/PrivacyPage').then(m => ({ Component: m.PrivacyPage })),
          },
          {
            path: 'contact',
            lazy: () => import('../pages/legal/ContactPage').then(m => ({ Component: m.ContactPage })),
          },
          // Legacy and convenience redirects.
          { path: 'market/:id', element: <LegacyMarketRedirect /> },
          { path: 'orders', element: <Navigate to="/portfolio?tab=orders" replace /> },
          { path: 'policies', element: <Navigate to="/privacy" replace /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
