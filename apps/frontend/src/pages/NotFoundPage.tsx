import { Link, Navigate, isRouteErrorResponse, useParams, useRouteError } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useMarkets } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatProbability } from '../lib/format';
import { Button } from '../components/ui/Button';
import { MarketIcon } from '../components/market/MarketBits';

/** Reusable "not found" block: used for unknown routes and missing markets. */
export function NotFoundState({
  code = '404',
  title = 'Page not found',
  description = "The page you're looking for doesn't exist or has moved.",
}: {
  code?: string;
  title?: string;
  description?: string;
}) {
  const markets = useMarkets({ sort: 'volume', status: 'open' });
  const suggestions = markets.data?.slice(0, 4) ?? [];

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center sm:py-20">
        <span className="label-mono">Error {code}</span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button>
              <ArrowLeft className="size-4" /> Back to markets
            </Button>
          </Link>
          <Link to="/?sort=newest">
            <Button variant="outline">
              <Search className="size-4" /> Browse new markets
            </Button>
          </Link>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-10 w-full text-left">
            <div className="label-mono mb-2">Trending instead</div>
            <ul className="divide-y divide-border rounded-md border border-border bg-bg">
              {suggestions.map(m => (
                <li key={m.id}>
                  <Link to={`/markets/${m.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                    <MarketIcon category={m.category} imageUrl={m.imageUrl} size="sm" />
                    <span className="line-clamp-1 flex-1 text-[13px]">{m.title}</span>
                    <span className="num text-[13px] font-semibold">{formatProbability(m.yesPrice)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return <NotFoundState />;
}

function isChunkLoadError(error: unknown) {
  return (
    error instanceof Error &&
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      error.message,
    )
  );
}

/** Route error element. Rendered inside the app shell for page errors, standalone if the shell fails. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundState />;

  // After a deploy, old chunk names 404: a reload picks up the new build.
  const stale = isChunkLoadError(error);
  const message = stale
    ? 'A new version of Mirage is available.'
    : import.meta.env.DEV && error instanceof Error
      ? error.message
      : 'An unexpected error occurred while loading this page.';

  return (
    <div className="grid min-h-[60vh] place-items-center bg-bg px-4 text-center text-fg">
      <div className="max-w-md">
        <p className="label-mono">{stale ? 'Update available' : 'Something went wrong'}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {stale ? 'Please reload' : "We couldn't load this page"}
        </h1>
        <p className="mt-2 break-words text-sm text-muted">{message}</p>
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

/** Keeps pre-redesign `/market/:id` links working. */
export function LegacyMarketRedirect() {
  const { id } = useParams();
  return <Navigate to={`/markets/${id}`} replace />;
}
