import { useAuthToken } from '../hooks/useAuthToken';
import { getOrders } from '../api/orders';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '../components/LoadingState';

function OrderBadge({ type }: { type: string }) {
  const isBuy = type.toLowerCase() === 'buy';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold ${isBuy ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'}`}>
      {type}
    </span>
  );
}

export function OrdersPage() {
  const token = useAuthToken();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(token),
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6">
        <div className="text-sm font-semibold">Sign in to see your orders</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">
          This page is wired for backend data but will show empty/error states until a GET /orders endpoint is available.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6"><LoadingState /></div>;
  }

  if (isError) {
    return (
      <div className="bg-white/5 ring-1 ring-white/20 p-4 sm:p-6">
        <div className="text-sm font-semibold text-white">Couldn't load orders</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">An error occurred while fetching orders.</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/5">
        <div className="text-sm sm:text-base font-semibold">Orders</div>
      </div>
      {data?.orders && data.orders.length > 0 ? (
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
              {data.orders.map(order => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <OrderBadge type={order.orderType} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{order.qty}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{order.price}¢</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-6 text-xs sm:text-sm text-gray-400">No orders yet.</div>
      )}
    </div>
  );
}
