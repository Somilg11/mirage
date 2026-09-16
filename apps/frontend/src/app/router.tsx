import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../pages/HomePage';
import { LegacyMarketRedirect, NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage';

/** Code-split a named page export. */
function page<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(() => loader().then(m => ({ default: m[name] })));
}

const MarketPage = page(() => import('../pages/MarketPage'), 'MarketPage');
const PortfolioPage = page(() => import('../pages/PortfolioPage'), 'PortfolioPage');
const ActivityPage = page(() => import('../pages/ActivityPage'), 'ActivityPage');
const ProfilePage = page(() => import('../pages/ProfilePage'), 'ProfilePage');
const TermsPage = page(() => import('../pages/legal/TermsPage'), 'TermsPage');
const PrivacyPage = page(() => import('../pages/legal/PrivacyPage'), 'PrivacyPage');
const ContactPage = page(() => import('../pages/legal/ContactPage'), 'ContactPage');

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'markets/:slug', element: <MarketPage /> },
      { path: 'market/:id', element: <LegacyMarketRedirect /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'orders', element: <Navigate to="/portfolio?tab=orders" replace /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'policies', element: <Navigate to="/privacy" replace /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
