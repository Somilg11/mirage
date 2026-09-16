import { Component, type ErrorInfo, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface FallbackProps {
  error: Error;
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: FallbackProps) => ReactNode;
  /** When any value changes the boundary clears its error (e.g. on navigation). */
  resetKeys?: unknown[];
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Single choke point for reporting; wire to Sentry or similar in production.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (!this.state.error) return;
    const keys = this.props.resetKeys ?? [];
    const prevKeys = prev.resetKeys ?? [];
    if (keys.length !== prevKeys.length || keys.some((k, i) => !Object.is(k, prevKeys[i]))) this.reset();
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) return this.props.fallback({ error: this.state.error, reset: this.reset });
    return this.props.children;
  }
}

/** Contains a failing widget so the rest of the page keeps working. Also resets failed queries on retry. */
export function SectionBoundary({ children, label = 'This section' }: { children: ReactNode; label?: string }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallback={({ reset: retry }) => (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-8 text-center">
              <AlertTriangle className="size-5 text-no" />
              <p className="text-sm text-muted">{label} failed to load.</p>
              <Button variant="outline" size="sm" onClick={retry}>
                <RotateCw className="size-3.5" /> Retry
              </Button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/** Last-resort screen when the app shell itself crashes. Uses no router APIs. */
export function AppCrashScreen({ error }: { error: Error }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-fg">
      <div className="max-w-md">
        <p className="label-mono">Application error</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 break-words text-sm text-muted">
          {import.meta.env.DEV ? error.message : 'An unexpected error occurred. Please reload the page.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Go to markets
          </Button>
        </div>
      </div>
    </div>
  );
}
