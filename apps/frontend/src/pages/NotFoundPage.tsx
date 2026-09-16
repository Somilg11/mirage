import { Link, Navigate, useParams, useRouteError } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface-3 text-muted">
          <Compass className="size-6" />
        </div>
        <p className="num mt-6 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="mt-8 inline-block">
          <Button>
            <ArrowLeft className="size-4" /> Back to markets
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-fg">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 break-words text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Keeps pre-redesign `/market/:id` links working. */
export function LegacyMarketRedirect() {
  const { id } = useParams();
  return <Navigate to={`/markets/${id}`} replace />;
}
