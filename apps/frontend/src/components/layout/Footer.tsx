import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Markets',
    links: [
      { label: 'Trending', to: '/' },
      { label: 'New', to: '/?sort=newest' },
      { label: 'Ending soon', to: '/?sort=ending' },
      { label: 'Resolved', to: '/?status=resolved' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Open orders', to: '/portfolio?tab=orders' },
      { label: 'Activity', to: '/activity' },
      { label: 'Daily reward', to: '/profile' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'GitHub', to: 'https://github.com/Somilg11', external: true },
      { label: 'Support the project', to: 'https://www.buymeacoffee.com/gsomil', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of use', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:grid-cols-4 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 max-w-xs sm:col-span-4 lg:col-span-1">
          <Logo />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Trade on the outcome of real-world events. Prices reflect the crowd's view of each outcome's probability.
          </p>
        </div>
        {COLUMNS.map(col => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold text-fg">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map(link => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-muted hover:text-fg"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-[13px] text-muted hover:text-fg">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-24 pt-5 text-[11px] leading-relaxed text-subtle sm:px-6 md:flex-row md:justify-between md:pb-6">
          <span>© {new Date().getFullYear()} Mirage. All rights reserved.</span>
          <span className="max-w-2xl md:text-right">
            Mirage is a simulated trading venue for educational purposes. Balances carry no monetary value and cannot be
            withdrawn.
          </span>
        </div>
      </div>
    </footer>
  );
}
