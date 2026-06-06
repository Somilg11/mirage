import { Link } from 'react-router-dom';
import { useMarkets } from '../hooks/queries';
import type { MarketListItem, OrderBook } from '../types/api';

function sumBookQty(book?: OrderBook) {
  if (!book) return 0;
  return Object.values(book).reduce((s, lvl) => s + (lvl?.availableQuantity ?? 0), 0);
}

function computeYesPct(m: MarketListItem) {
  if (typeof m.yesPct === 'number') return Math.max(0, Math.min(100, Math.round(m.yesPct)));
  const yes = sumBookQty(m.yesBook);
  const no = sumBookQty(m.noBook);
  const total = yes + no;
  if (!total) return undefined;
  return Math.round((yes / total) * 100);
}

function MarketCard({ m, index }: { m: MarketListItem; index?: number }) {
  const yesPct = computeYesPct(m);
  const noPct = typeof yesPct === 'number' ? 100 - yesPct : undefined;

  return (
    <Link
      to={`/market/${m.id}`}
      className="group relative bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/8 transition-all duration-300 border-r border-b border-white/5 last:border-r-0 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${(index || 0) * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-white">{m.title}</div>
          <div className="mt-0.5 line-clamp-2 text-[10px] text-gray-400">{m.description}</div>
        </div>
        <div className="shrink-0 text-right">
          {typeof yesPct === 'number' ? (
            <div>
              <div className="text-sm font-semibold text-white">{yesPct}%</div>
              <div className="text-[10px] text-gray-400">Yes · {noPct}% No</div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-gray-400">—</div>
              <div className="text-[10px] text-gray-500">No liquidity</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="bg-green-500/20 px-2 py-1 text-[10px] font-semibold text-green-300 ring-1 ring-green-500/30 group-hover:bg-green-500/25 transition-all duration-200 group-hover:scale-105">
          Buy Yes
        </div>
        <div className="bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/30 group-hover:bg-red-500/25 transition-all duration-200 group-hover:scale-105">
          Buy No
        </div>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-white/5 ring-1 ring-white/10 p-3 animate-pulse">
          <div className="h-3 w-3/4 bg-white/10" />
          <div className="mt-1.5 h-2 w-full bg-white/10" />
          <div className="mt-0.5 h-2 w-5/6 bg-white/10" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 bg-white/10" />
            <div className="h-6 w-16 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const markets = useMarkets();

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-white/5 ring-1 ring-white/10 p-3 sm:p-4 overflow-hidden hover:bg-white/8 transition-all duration-300 hover:ring-white/20">
          <div className="text-[10px] text-white/70">LIVE</div>
          <div className="mt-0.5 text-base sm:text-lg font-semibold">Trending Markets</div>
          <div className="mt-1 text-xs text-white/80">All content below is loaded from the backend.</div>
        </div>
        <div className="bg-white/5 ring-1 ring-white/10 p-3 sm:p-4 hover:bg-white/8 transition-all duration-300 hover:ring-white/20">
          <div className="text-[10px] text-white/70">New</div>
          <div className="mt-0.5 text-sm font-semibold">Discover markets</div>
          <div className="mt-1 text-xs text-white/80">Browse, trade, and track performance.</div>
        </div>
      </div>

      {markets.isLoading && <GridSkeleton />}

      {markets.isError && (
        <div className="bg-white/5 ring-1 ring-white/20 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-xs font-semibold text-white">Couldn't load markets</div>
          <div className="mt-1 text-xs text-gray-400">{(markets.error as Error).message}</div>
          <button className="mt-2 bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95 hover:ring-white/20" onClick={() => markets.refetch()}>
            Retry
          </button>
        </div>
      )}

      {markets.isSuccess && markets.data.markets.length === 0 && (
        <div className="bg-white/5 ring-1 ring-white/10 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-xs font-semibold">No markets yet</div>
          <div className="mt-1 text-xs text-gray-400">Once the backend has markets, they'll show up here.</div>
        </div>
      )}

      {markets.isSuccess && markets.data.markets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {markets.data.markets.map((m, i) => (
            <MarketCard key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}