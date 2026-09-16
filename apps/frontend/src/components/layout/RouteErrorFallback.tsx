import { Link } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';

export function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <span className="label-mono">Page error</span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page hit a problem</h1>
        <p className="mt-2 break-words text-sm text-muted">
          {import.meta.env.DEV ? error.message : 'Something went wrong while rendering this page.'}
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>
            <RotateCw className="size-4" /> Try again
          </Button>
          <Link to="/">
            <Button variant="outline">Go to markets</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
