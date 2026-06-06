import { useAuthToken } from '../hooks/useAuthToken';
import { useBalance } from '../hooks/queries';
import { claimDaily } from '../api/claim';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queries';

function WalletIcon() {
  return (
    <div className="flex items-center justify-center w-12 h-12 bg-white/5 ring-1 ring-white/10">
      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    </div>
  );
}

export function ProfilePage() {
  const token = useAuthToken();
  const balance = useBalance(token);
  const qc = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: () => claimDaily(token),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.balance });
    },
  });

  if (!token) {
    return (
      <div className="bg-white/5 ring-1 ring-white/10 p-4 sm:p-6">
        <div className="text-sm font-semibold">Sign in to view your profile</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-400">Profile page requires authentication.</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/5">
        <div className="text-sm sm:text-base font-semibold text-left">Profile</div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-black/20 ring-1 ring-white/10 p-4 sm:p-6 hover:bg-black/25 transition-all duration-200">
            <div className="flex items-start gap-4">
              <WalletIcon />
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1">Account Balance</div>
                <div className="text-2xl sm:text-3xl font-semibold transition-all duration-200">
                  {balance.isLoading ? '—' : (balance.data ? `$${(balance.data.balance / 100).toFixed(2)}` : '$0.00')}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/20 ring-1 ring-white/10 p-4 sm:p-6 hover:bg-black/25 transition-all duration-200">
            <div className="text-xs text-gray-400 mb-2">Daily Claim</div>
            <div className="text-xs sm:text-sm text-gray-300 mb-3">Claim $100 daily to trade with paper money.</div>
            <button
              className="w-full bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              disabled={claimMutation.isPending || claimMutation.isSuccess}
              onClick={() => claimMutation.mutate()}
            >
              {claimMutation.isPending ? 'Claiming...' : claimMutation.isSuccess ? 'Claimed Today' : 'Claim $100'}
            </button>
            {claimMutation.isSuccess && (
              <div className="mt-2 text-xs text-green-300 transition-all duration-200">Successfully claimed $100!</div>
            )}
            {claimMutation.isError && (
              <div className="mt-2 text-xs text-red-300 transition-all duration-200">{(claimMutation.error as Error).message}</div>
            )}
          </div>
        </div>

        <div className="mt-4 sm:mt-6 bg-black/20 ring-1 ring-white/10 p-4 hover:bg-black/25 transition-all duration-200">
          <div className="text-xs text-gray-400">About Paper Trading</div>
          <div className="mt-1 text-xs sm:text-sm text-gray-300">
            This is a simulation environment with no real money involved. You can claim $100 daily to practice trading prediction markets.
          </div>
        </div>
      </div>
    </div>
  );
}
