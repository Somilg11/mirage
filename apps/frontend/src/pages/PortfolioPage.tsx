import { useAuthToken } from '../hooks/useAuthToken';
import { usePositions } from '../hooks/queries';

function Skeleton() {
  return (
    <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6 animate-pulse">
      <div className="h-5 w-32 sm:w-40 bg-white/10" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const token = useAuthToken();
  const positions = usePositions(token);

  if (!token) {
    return (
      <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6">
        <div className="text-sm font-semibold">Sign in to see your portfolio</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">Portfolio uses backend data from /positions.</div>
      </div>
    );
  }

  if (positions.isLoading) return <Skeleton />;

  if (positions.isError) {
    return (
      <div className="bg-white/5 ring-1 ring-white/20 p-4 sm:p-5">
        <div className="text-sm font-semibold text-white">Couldn't load positions</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">{(positions.error as Error).message}</div>
        <button className="mt-3 bg-white/5 px-3 py-2 text-xs sm:text-sm ring-1 ring-white/10 hover:bg-white/10" onClick={() => positions.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!positions.data) return <Skeleton />;

  if (positions.data.positions.length === 0) {
    return (
      <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6">
        <div className="text-sm font-semibold">No positions</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">Trade a market to see positions here.</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/5">
        <div className="text-sm sm:text-base font-semibold">Portfolio</div>
        <div className="text-[10px] sm:text-sm text-gray-400">Your current positions</div>
      </div>
      <div className="divide-y divide-white/5">
        {positions.data.positions.map(p => (
          <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-200 active:scale-[0.98]">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-semibold truncate">{p.marketId}</div>
              <div className="text-[10px] sm:text-xs text-gray-400">{p.type}</div>
            </div>
            <div className="text-xs sm:text-sm text-gray-200 ml-2">{p.qty} shares</div>
          </div>
        ))}
      </div>
    </div>
  );
}
