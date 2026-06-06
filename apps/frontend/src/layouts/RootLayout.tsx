import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { UseUser } from '../hooks/useUser';
import { useAuthToken } from '../hooks/useAuthToken';
import { useBalance } from '../hooks/queries';
import { useState } from 'react';
import { Footer } from '../components/Footer';

const navItems = [
  { to: '/', label: 'Markets' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/orders', label: 'Orders' },
  { to: '/activity', label: 'Activity' },
  { to: '/profile', label: 'Profile' },
];

export function RootLayout() {
  const supabase = useSupabase();
  const claims = UseUser();
  const token = useAuthToken();
  const loc = useLocation();
  const balance = useBalance(token);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show setup page if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Mirage" className="h-8 w-8 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Mirage</h1>
            <p className="text-gray-400">Configuration Required</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">Missing Environment Variables</h2>
            <p className="text-gray-300 mb-4">
              To run Mirage, you need to configure your Supabase environment variables.
            </p>

            <div className="bg-black/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3 text-white">Required Variables:</h3>
              <code className="block text-sm text-gray-300 mb-2">
                VITE_SUPABASE_URL=your-supabase-project-url
              </code>
              <code className="block text-sm text-gray-300">
                VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
              </code>
            </div>

            <div className="space-y-3 text-sm text-gray-400">
              <p>
                <strong className="text-white">Step 1:</strong> Copy <code className="bg-white/10 px-2 py-1 rounded">.env.example</code> to <code className="bg-white/10 px-2 py-1 rounded">.env</code>
              </p>
              <p>
                <strong className="text-white">Step 2:</strong> Fill in your Supabase credentials in the <code className="bg-white/10 px-2 py-1 rounded">.env</code> file
              </p>
              <p>
                <strong className="text-white">Step 3:</strong> Restart the development server
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Need help? Check the <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Supabase documentation</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-6">
          <div className="flex h-12 items-center gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Mirage" className="h-3 w-3" />
              <Link to="/" className="text-sm font-semibold tracking-tight">Mirage</Link>
            </div>

            <nav className="hidden md:flex items-center gap-1 text-xs text-gray-300 ml-2">
              {navItems.map(item => {
                const active = loc.pathname === item.to || (item.to !== '/' && loc.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-2 py-1.5 hover:bg-white/5 transition-all duration-200 active:scale-95 ${active ? 'bg-white/10 text-gray-100' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                <div className="text-[10px] text-gray-400">Balance</div>
                <div className="text-xs font-semibold">
                  {token ? (balance.isLoading ? '—' : (balance.data ? `$${(balance.data.balance / 100).toFixed(2)}` : '$0.00')) : '—'}
                </div>
              </div>

              {!claims && (
                <button
                  className="hidden sm:block bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-white/80 transition-all duration-200 active:scale-95"
                  onClick={async () => await supabase.auth.signInWithWeb3({ chain: 'solana', statement: 'Sign to Prediction Market' })}
                >
                  Sign up
                </button>
              )}
              {claims && (
                <button
                  className="hidden sm:block bg-white/5 px-2 py-1.5 text-[10px] text-gray-100 ring-1 ring-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95"
                  onClick={async () => await supabase.auth.signOut()}
                >
                  Sign out
                </button>
              )}

              <button
                className="md:hidden p-2 bg-white/5 ring-1 ring-white/10 transition-all duration-200 active:scale-95"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/5 py-2 animate-in slide-in-from-top duration-200">
              <div className="flex flex-col gap-1">
                {navItems.map(item => {
                  const active = loc.pathname === item.to || (item.to !== '/' && loc.pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3 py-2 text-xs hover:bg-white/5 transition-all duration-200 active:scale-95 ${active ? 'bg-white/10 text-gray-100' : 'text-gray-300'}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                  <div className="text-[10px] text-gray-400">Balance</div>
                  <div className="text-xs font-semibold">
                    {token ? (balance.isLoading ? '—' : (balance.data ? `$${(balance.data.balance / 100).toFixed(2)}` : '$0.00')) : '—'}
                  </div>
                </div>
                {!claims && (
                  <button
                    className="px-3 py-2 text-xs font-semibold text-left hover:bg-white/5 transition-all duration-200 active:scale-95"
                    onClick={async () => {
                      await supabase.auth.signInWithWeb3({ chain: 'solana', statement: 'Sign to Prediction Market' });
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign up
                  </button>
                )}
                {claims && (
                  <button
                    className="px-3 py-2 text-xs font-semibold text-left hover:bg-white/5 transition-all duration-200 active:scale-95"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 mx-auto w-full px-3 sm:px-4 lg:px-6 py-3">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
