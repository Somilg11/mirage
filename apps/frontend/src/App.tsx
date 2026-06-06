/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, Component, type ReactNode } from 'react';
import './App.css';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error; errorInfo?: any }> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
              <p className="text-gray-400">An unexpected error occurred</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3 text-red-400">Error Details</h2>
              <div className="bg-black/50 rounded-lg p-4 mb-4">
                <code className="text-sm text-gray-300 break-all">
                  {this.state.error?.message}
                </code>
              </div>

              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors">
                    Show technical details
                  </summary>
                  <pre className="mt-3 text-xs text-gray-500 bg-black/50 rounded-lg p-4 overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-white/80 transition-all duration-200 active:scale-95"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white/5 text-white font-semibold rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95"
              >
                Go to Home
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>If this problem persists, please check your console for more details or contact support.</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 0 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
