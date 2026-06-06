import { useAuthToken } from '../hooks/useAuthToken';
import { getHistory } from '../api/history';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '../components/LoadingState';

function ActivityBadge({ type }: { type: string }) {
  const isBuy = type.toLowerCase() === 'buy';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold ${isBuy ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'}`}>
      {type}
    </span>
  );
}

export function ActivityPage() {
  const token = useAuthToken();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(token),
    enabled: !!token,
  });

  return (
    <div className="bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/5">
        <div className="text-sm sm:text-base font-semibold">Activity</div>
      </div>
      {!token ? (
        <div className="p-4 sm:p-6 text-xs sm:text-sm text-gray-400">Sign in to view your activity.</div>
      ) : isLoading ? (
        <div className="p-4 sm:p-6"><LoadingState /></div>
      ) : isError ? (
        <div className="p-4 sm:p-6 text-xs sm:text-sm text-gray-400">Couldn't load activity.</div>
      ) : data?.history && data.history.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Quantity</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Price</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.history.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <ActivityBadge type={item.orderType} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{item.qty}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{item.price}¢</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-6 text-xs sm:text-sm text-gray-400">
          No activity yet. Once you place orders, they'll show up here.
        </div>
      )}
    </div>
  );
}