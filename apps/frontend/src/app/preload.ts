/** Warm route chunks ahead of navigation (e.g. on hover) so page transitions feel instant. */
export const preload = {
  market: () => void import('../pages/MarketPage'),
  portfolio: () => void import('../pages/PortfolioPage'),
  activity: () => void import('../pages/ActivityPage'),
  profile: () => void import('../pages/ProfilePage'),
};
