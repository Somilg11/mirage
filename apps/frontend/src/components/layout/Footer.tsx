import { Link } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { Logo } from '../ui/Logo';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const LINKS = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/contact', label: 'Contact' },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-xs leading-relaxed text-muted">
            Paper-trading prediction markets. No real money is involved; balances are simulated for educational use.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <nav className="flex gap-5 text-sm text-muted" aria-label="Legal">
            {LINKS.map(l => (
              <Link key={l.to} to={l.to} className="hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/Somilg11"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            >
              <GithubIcon className="size-4" />
            </a>
            <a
              href="https://www.buymeacoffee.com/gsomil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy me a coffee"
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Coffee className="size-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 pb-24 text-xs text-subtle sm:px-6 md:pb-8">
        © {new Date().getFullYear()} Mirage. All rights reserved.
      </div>
    </footer>
  );
}
