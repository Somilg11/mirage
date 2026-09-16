import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Link2 } from 'lucide-react';
import type { Outcome } from '@repo/shared';
import { useMarket, useOrderBook } from '../hooks/queries';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { SectionBoundary } from '../components/errors/ErrorBoundary';
import { NotFoundState } from './NotFoundPage';
import { formatCents, formatDate, formatProbability, formatShares, formatUsdCompact } from '../lib/format';
import { bestAsk, isTradable, outcomePrice } from '../lib/market';
import { Card, ErrorState, Skeleton, Tabs } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { MarketIcon, MarketStatusBadge } from '../components/market/MarketBits';
import { PriceChart } from '../components/market/PriceChart';
import { OrderBook } from '../components/market/OrderBook';
import { TradePanel, type TicketState } from '../components/market/TradePanel';
import { RecentTrades } from '../components/market/RecentTrades';
import { YourPosition } from '../components/market/YourPosition';
import { MarketStats } from '../components/market/MarketStats';

type DetailTab = 'book' | 'trades' | 'rules';

function MarketSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-3">
          <Skeleton className="size-12 rounded-md" />
          <Skeleton className="h-7 flex-1" />
        </div>
        <Skeleton className="h-[380px] rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <Skeleton className="hidden h-[460px] rounded-lg lg:block" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-mono">{label}</dt>
      <dd className="num mt-0.5 truncate text-[13px] font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function MarketPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const marketQ = useMarket(slug);
  const bookQ = useOrderBook(marketQ.data?.id);

  const initialOutcome: Outcome = params.get('outcome') === 'no' ? 'no' : 'yes';
  const [ticket, setTicket] = useState<TicketState>({
    side: 'buy',
    outcome: initialOutcome,
    mode: 'market',
    limitPrice: null,
  });
  const [bookOutcome, setBookOutcome] = useState<Outcome>(initialOutcome);
  const [tab, setTab] = useState<DetailTab>('book');
  const [sheetOpen, setSheetOpen] = useState(() => params.has('outcome'));

  useDocumentTitle(marketQ.isError ? 'Market not found' : marketQ.data?.title);

  if (marketQ.isPending) return <MarketSkeleton />;
  if (marketQ.isError) {
    const notFound = (marketQ.error as { status?: number }).status === 404;
    return notFound ? (
      <NotFoundState
        title="Market not found"
        description="This market doesn't exist, was removed, or the link is mistyped."
      />
    ) : (
      <ErrorState title="Couldn't load market" error={marketQ.error} onRetry={() => marketQ.refetch()} />
    );
  }

  const market = marketQ.data;
  const tradable = isTradable(market);

  const selectPrice = (price: number, outcome: Outcome) => {
    const levelIsAsk = bookQ.data?.[outcome].asks.some(l => l.price === price);
    // Clicking an ask pre-fills a buy at that price; clicking a bid pre-fills a sell.
    setTicket({ side: levelIsAsk ? 'buy' : 'sell', outcome, mode: 'limit', limitPrice: price });
    if (!isDesktop) setSheetOpen(true);
  };

  const openTicket = (outcome: Outcome) => {
    setTicket(t => ({ ...t, side: 'buy', outcome, limitPrice: null }));
    setSheetOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('?')[0]!);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const panel = (
    <TradePanel
      market={market}
      book={bookQ.data}
      ticket={ticket}
      onTicketChange={setTicket}
      onSubmitted={() => !isDesktop && setSheetOpen(false)}
    />
  );

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-fg">
          Markets
        </Link>
        <ChevronRight className="size-3" />
        <Link to={`/?category=${encodeURIComponent(market.category)}`} className="hover:text-fg">
          {market.category}
        </Link>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <header>
            <div className="flex items-start gap-3">
              <MarketIcon category={market.category} imageUrl={market.imageUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{market.title}</h1>
                <div className="mt-1.5">
                  <MarketStatusBadge market={market} />
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link to market">
                <Link2 className="size-4" />
              </Button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3 sm:grid-cols-4">
              <Stat label="Volume" value={formatUsdCompact(market.volume)} />
              <Stat label={market.status === 'open' ? 'Closes' : 'Closed'} value={formatDate(market.endDate)} />
              <Stat label="Open interest" value={`${formatShares(market.openInterest)} shares`} />
              <Stat label="Traders" value={formatShares(market.traders)} />
            </dl>
          </header>

          <SectionBoundary label="Price chart">
            <Card>
              <PriceChart market={market} />
            </Card>
          </SectionBoundary>

          {!isDesktop && (
            <SectionBoundary label="Market stats">
              <MarketStats market={market} book={bookQ.data} />
            </SectionBoundary>
          )}

          <Card className="overflow-hidden empty:hidden">
            <SectionBoundary label="Your position">
              <YourPosition market={market} />
            </SectionBoundary>
          </Card>

          <Card className="overflow-hidden">
            <Tabs
              ariaLabel="Market details"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'book', label: 'Order book' },
                { value: 'trades', label: 'Trades' },
                { value: 'rules', label: 'Rules' },
              ]}
            />
            {tab === 'book' && (
              <OrderBook
                market={market}
                book={bookQ.data}
                isLoading={bookQ.isPending}
                outcome={bookOutcome}
                onOutcomeChange={setBookOutcome}
                onSelectPrice={selectPrice}
              />
            )}
            {tab === 'trades' && <RecentTrades market={market} />}
            {tab === 'rules' && (
              <div className="space-y-4 p-4 text-sm leading-relaxed">
                <p className="whitespace-pre-line text-fg/90">{market.description}</p>
                <div>
                  <h3 className="label-mono">Resolution criteria</h3>
                  <p className="mt-1.5 whitespace-pre-line text-muted">{market.rules}</p>
                </div>
                <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  <Stat label="Opened" value={formatDate(market.createdAt)} />
                  <Stat label="Closes" value={formatDate(market.endDate)} />
                  <Stat label="Resolved" value={market.resolvedAt ? formatDate(market.resolvedAt) : '—'} />
                </dl>
              </div>
            )}
          </Card>

          {tradable && <div className="h-16 lg:hidden" aria-hidden />}
        </div>

        {isDesktop && (
          <aside className="hidden space-y-4 self-stretch lg:block">
            <SectionBoundary label="Market stats">
              <MarketStats market={market} book={bookQ.data} />
            </SectionBoundary>
            <Card className="sticky top-[112px]">
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <MarketIcon category={market.category} imageUrl={market.imageUrl} size="sm" />
                <span className="line-clamp-1 flex-1 text-[13px] font-medium">{market.title}</span>
                <span className="num text-[13px] font-semibold">{formatProbability(market.yesPrice)}</span>
              </div>
              <div className="px-4 pb-4">{panel}</div>
            </Card>
          </aside>
        )}
      </div>

      {!isDesktop && tradable && (
        <>
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-bg px-4 py-2 md:bottom-0 md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
              <Button variant="yes" size="lg" onClick={() => openTicket('yes')}>
                Buy Yes{' '}
                <span className="num opacity-90">
                  {formatCents(bestAsk(bookQ.data, 'yes') ?? outcomePrice(market, 'yes'))}
                </span>
              </Button>
              <Button variant="no" size="lg" onClick={() => openTicket('no')}>
                Buy No{' '}
                <span className="num opacity-90">
                  {formatCents(bestAsk(bookQ.data, 'no') ?? outcomePrice(market, 'no'))}
                </span>
              </Button>
            </div>
          </div>
          <Sheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title={<span className="line-clamp-1">{market.title}</span>}
          >
            {panel}
          </Sheet>
        </>
      )}
    </div>
  );
}
