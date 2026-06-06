import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { HomePage } from '../pages/HomePage';
import { MarketPage } from '../pages/MarketPage';
import { PortfolioPage } from '../pages/PortfolioPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ActivityPage } from '../pages/ActivityPage';
import { ProfilePage } from '../pages/ProfilePage';
import { TermsPage } from '../pages/TermsPage';
import { PoliciesPage } from '../pages/PoliciesPage';
import { ContactPage } from '../pages/ContactPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/market/:id', element: <MarketPage /> },
      { path: '/portfolio', element: <PortfolioPage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/activity', element: <ActivityPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/policies', element: <PoliciesPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
