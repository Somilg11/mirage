import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarClock, Scale, Users } from 'lucide-react';
import type { Outcome } from '@repo/shared';
import { useMarket, useOrderBook } from '../hooks/queries';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCents, formatDate, formatShares, formatUsdCompact } from '../lib/format';
import { bestAsk, isTradable, outcomePrice } from '../lib/market';
import { Card, CardHeader, EmptyState, ErrorState, Skeleton } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { MarketIcon, MarketStatusBadge } from '../components/market/MarketBits';
import { PriceChart } from '../components/market/PriceChart';
import { OrderBook } from '../components/market/OrderBook';
import { TradePanel, type TicketState } from '../components/market/TradePanel';
import { RecentTrades } from '../components/market/RecentTrades';
import { YourPosition } from '../components/market/YourPosition';

function MarketSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="hidden h-130 rounded-2xl lg:block" />
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-subtle [&>svg]:size-4">{icon}</span>
      <span className="text-muted">{label}</span>
      <span className="num font-semibold text-fg">{value}</span>
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
  const [sheetOpen, setSheetOpen] = useState(() => params.has('outcome'));

  const title = marketQ.data?.title;
  useEffect(() => {
    if (title) document.title = `${title} · Mirage`;
    return () => {
      document.title = 'Mirage — Prediction Markets';
    };
  }, [title]);

  if (marketQ.isPending) return <MarketSkeleton />;
  if (marketQ.isError) {
    const notFound = (marketQ.error as { status?: number }).status === 404;
    return notFound ? (
      <EmptyState
        title="Market not found"
        description="This market doesn't exist or may have been removed."
        action={
          <Link to="/">
            <Button variant="outline" size="sm">
              Browse markets
            </Button>
          </Link>
        }
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
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Markets
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <header className="flex items-start gap-3.5 sm:gap-4">
            <MarketIcon category={market.category} imageUrl={market.imageUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                <Link to={`/?category=${encodeURIComponent(market.category)}`} className="hover:text-fg">
                  {market.category}
                </Link>
                <MarketStatusBadge market={market} />
              </div>
              <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight sm:text-[28px]">{market.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                <StatItem icon={<BarChart3 />} label="Vol." value={formatUsdCompact(market.volume)} />
                <StatItem
                  icon={<CalendarClock />}
                  label={market.status === 'open' ? 'Ends' : 'Ended'}
                  value={formatDate(market.endDate)}
                />
                <StatItem icon={<Scale />} label="Open interest" value={formatShares(market.openInterest)} />
                <StatItem icon={<Users />} label="Traders" value={formatShares(market.traders)} />
              </div>
            </div>
          </header>

          <Card className="p-4 sm:p-5">
            <PriceChart market={market} />
          </Card>

          <Card className="overflow-hidden">
            <OrderBook
              market={market}
              book={bookQ.data}
              isLoading={bookQ.isPending}
              outcome={bookOutcome}
              onOutcomeChange={setBookOutcome}
              onSelectPrice={selectPrice}
            />
          </Card>

          <Card className="overflow-hidden empty:hidden">
            <YourPosition market={market} />
          </Card>

          <Card>
            <CardHeader title="Rules" />
            <div className="space-y-4 px-4 pb-5 pt-3 text-sm leading-relaxed text-muted sm:px-5">
              <p className="whitespace-pre-line text-fg/90">{market.description}</p>
              <div className="rounded-xl bg-surface-2 p-4">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">Resolution</div>
                <p className="whitespace-pre-line">{market.rules}</p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span>Created {formatDate(market.createdAt)}</span>
                <span>Closes {formatDate(market.endDate)}</span>
                {market.resolvedAt && <span>Resolved {formatDate(market.resolvedAt)}</span>}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <RecentTrades market={market} />
          </Card>

          {/* Spacer so the fixed mobile trade bar never covers content. */}
          {tradable && <div className="h-16 lg:hidden" aria-hidden />}
        </div>

        {isDesktop && (
          <aside className="sticky top-20 hidden lg:block">
            <Card className="p-4 pt-1">{panel}</Card>
          </aside>
        )}
      </div>

      {!isDesktop && tradable && (
        <>
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-bg/90 px-4 py-2.5 backdrop-blur-xl md:bottom-0 md:pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
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
