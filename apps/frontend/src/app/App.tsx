import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { ApiError } from '../api/client';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { router } from './router';
import { AppCrashScreen, ErrorBoundary } from '../components/errors/ErrorBoundary';
import { TooltipProvider } from '../components/ui/tooltip';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // Client errors (4xx) will not succeed on retry.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-center"
      offset={72}
      mobileOffset={{ top: 64 }}
      toastOptions={{
        classNames: {
          toast: '!rounded-md !border-border !bg-surface !text-fg !shadow-pop',
          description: '!text-muted',
        },
      }}
    />
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary fallback={({ error }) => <AppCrashScreen error={error} />}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider delayDuration={150}>
              <RouterProvider router={router} />
              <ThemedToaster />
            </TooltipProvider>
          </AuthProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
