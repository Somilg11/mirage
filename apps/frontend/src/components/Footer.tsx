import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto w-full px-3 sm:px-4 lg:px-3 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Mirage" className="h-3 w-3" />
            <span className="text-sm font-semibold tracking-tight text-gray-400">Mirage</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <Link
              to="/terms"
              className="hover:text-white transition-colors duration-200 hover:underline underline-offset-2"
            >
              Terms
            </Link>
            <Link
              to="/policies"
              className="hover:text-white transition-colors duration-200 hover:underline underline-offset-2"
            >
              Policies
            </Link>
            <Link
              to="/contact"
              className="hover:text-white transition-colors duration-200 hover:underline underline-offset-2"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Somilg11"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200 hover:scale-110 transform"
              aria-label="GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://www.buymeacoffee.com/gsomil"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200 hover:scale-110 transform"
              aria-label="Buy Me a Coffee"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.5 2H3.5C2.67 2 2 2.67 2 3.5v17c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
