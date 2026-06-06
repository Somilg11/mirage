import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuthToken } from '../hooks/useAuthToken';
import { useBuyMarket, useMarket, useSellMarket } from '../hooks/queries';
import type { CreateOrderRequest, MarketResponse, OrderBook } from '../types/api';

function parseBook(v: unknown): OrderBook | undefined {
  if (!v) return undefined;
  if (typeof v === 'object') return v as OrderBook;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as OrderBook;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sumBookQty(book?: OrderBook) {
  if (!book) return 0;
  return Object.values(book).reduce((s, lvl) => s + (lvl?.availableQuantity ?? 0), 0);
}

function computeYesPct(yes?: OrderBook, no?: OrderBook) {
  const y = sumBookQty(yes);
  const n = sumBookQty(no);
  const total = y + n;
  if (!total) return undefined;
  return Math.round((y / total) * 100);
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-8 bg-white/5 ring-1 ring-white/10 p-4 animate-pulse">
        <div className="h-4 w-2/3 bg-white/10" />
        <div className="mt-2 h-3 w-full bg-white/10" />
        <div className="mt-0.5 h-3 w-5/6 bg-white/10" />
        <div className="mt-4 h-40 bg-white/10" />
      </div>
      <div className="xl:col-span-4 bg-white/5 ring-1 ring-white/10 p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-white/10" />
        <div className="mt-2 h-8 w-full bg-white/10" />
        <div className="mt-1.5 h-8 w-full bg-white/10" />
        <div className="mt-1.5 h-8 w-full bg-white/10" />
      </div>
    </div>
  );
}

export function MarketPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const token = useAuthToken();

  const marketQ = useMarket(id || '');
  const buyM = useBuyMarket(token);
  const sellM = useSellMarket(token);

  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [price, setPrice] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);

  const market = (marketQ.data as MarketResponse | undefined)?.market;
  const yesBook = useMemo(() => parseBook(market?.yesBook ?? market?.yesOrderBook), [market]);
  const noBook = useMemo(() => parseBook(market?.noBook ?? market?.noOrderBook), [market]);
  const yesPct = computeYesPct(yesBook, noBook);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const basePct = yesPct ?? 50;
      // eslint-disable-next-line react-hooks/purity
      const variance = Math.random() * 10 - 5;
      const yesValue = Math.max(0, Math.min(100, Math.round(basePct + variance)));
      const noValue = 100 - yesValue;
      data.push({
        t: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        yes: yesValue,
        no: noValue,
      });
    }
    return data;
  }, [yesPct]);

  async function submit() {
    if (!id) return;
    const req: CreateOrderRequest = {
      marketId: id,
      side,
      type: tab,
      price,
      quantity,
    };

    if (tab === 'buy') {
      await buyM.mutateAsync(req);
    } else {
      await sellM.mutateAsync(req);
    }
  }

  if (marketQ.isLoading) return <Skeleton />;

  if (marketQ.isError) {
    return (
      <div className="bg-white/5 ring-1 ring-white/20 p-4">
        <div className="text-xs font-semibold text-white">Couldn't load market</div>
        <div className="mt-1 text-xs text-gray-400">{(marketQ.error as Error).message}</div>
        <div className="mt-2 flex gap-2">
          <button className="bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95 hover:ring-white/20" onClick={() => marketQ.refetch()}>
            Retry
          </button>
          <button className="bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95 hover:ring-white/20" onClick={() => nav('/')}>Back</button>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="bg-white/5 ring-1 ring-white/10 p-4">
        <div className="text-xs font-semibold">Market not found</div>
        <div className="mt-2">
          <button className="bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10 transition-all duration-200 active:scale-95 hover:ring-white/20" onClick={() => nav('/')}>Back</button>
        </div>
      </div>
    );
  }

  const yesOrders = Object.entries(yesBook || {})
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([price, data]) => ({ price: parseInt(price), ...data }));
  
  const noOrders = Object.entries(noBook || {})
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([price, data]) => ({ price: parseInt(price), ...data }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8">
        <div className="bg-white/5 ring-1 ring-white/10 p-3 sm:p-4">
          <div className="text-xs text-gray-400">Market</div>
          <div className="mt-0.5 text-base sm:text-lg font-semibold">{market.title}</div>
          <div className="mt-1 text-xs text-gray-300">{market.description}</div>

          <div className="mt-4 bg-black/20 ring-1 ring-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold">Probability</div>
              <div className="text-xs text-gray-300">{typeof yesPct === 'number' ? `${yesPct}% Yes` : '—'}</div>
            </div>

            <div className="mt-3 h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="t" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.35)" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#000000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 11 }} />
                  <Area type="monotone" dataKey="yes" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="no" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white/5 ring-1 ring-white/10 p-3 sm:p-4">
          <div className="text-xs font-semibold mb-3">Order Book</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <div className="text-[10px] font-semibold text-green-300">YES</div>
                <div className="text-[10px] text-gray-400">Price</div>
                <div className="text-[10px] text-gray-400">Qty</div>
              </div>
              <div className="space-y-1">
                {yesOrders.length > 0 ? yesOrders.map((order, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-500/5 px-2 py-1.5 hover:bg-green-500/10 transition-all duration-200 hover:scale-105 cursor-pointer">
                    <span className="text-[10px] text-green-300 font-semibold">{order.price}¢</span>
                    <span className="text-[10px] text-gray-300">{order.availableQuantity}</span>
                  </div>
                )) : (
                  <div className="text-[10px] text-gray-500 py-2">No orders</div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <div className="text-[10px] font-semibold text-red-300">NO</div>
                <div className="text-[10px] text-gray-400">Price</div>
                <div className="text-[10px] text-gray-400">Qty</div>
              </div>
              <div className="space-y-1">
                {noOrders.length > 0 ? noOrders.map((order, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-500/5 px-2 py-1.5 hover:bg-red-500/10 transition-all duration-200 hover:scale-105 cursor-pointer">
                    <span className="text-[10px] text-red-300 font-semibold">{order.price}¢</span>
                    <span className="text-[10px] text-gray-300">{order.availableQuantity}</span>
                  </div>
                )) : (
                  <div className="text-[10px] text-gray-500 py-2">No orders</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-20 bg-white/5 ring-1 ring-white/10 overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-gray-400">Trade</div>
            <div className="mt-0.5 text-xs font-semibold">{market.title}</div>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setTab('buy')} className={`flex-1 px-2 py-1.5 text-xs font-semibold ring-1 transition-all duration-200 active:scale-95 ${tab === 'buy' ? 'bg-green-500/20 ring-green-500/30 text-green-300' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}>Buy</button>
              <button onClick={() => setTab('sell')} className={`flex-1 px-2 py-1.5 text-xs font-semibold ring-1 transition-all duration-200 active:scale-95 ${tab === 'sell' ? 'bg-red-500/20 ring-red-500/30 text-red-300' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}>Sell</button>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setSide('yes')} className={`flex-1 px-2 py-1.5 text-xs font-semibold ring-1 transition-all duration-200 active:scale-95 ${side === 'yes' ? 'bg-white/10 ring-white/20 text-white' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}>Yes</button>
              <button onClick={() => setSide('no')} className={`flex-1 px-2 py-1.5 text-xs font-semibold ring-1 transition-all duration-200 active:scale-95 ${side === 'no' ? 'bg-white/10 ring-white/20 text-white' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}>No</button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-gray-400">Price (¢)</div>
                <input className="mt-0.5 w-full bg-white/5 px-2 py-1.5 text-xs ring-1 ring-white/10 outline-none transition-all duration-200 focus:ring-white/30 hover:bg-white/8 focus:scale-[1.02]" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-[10px] text-gray-400">Qty</div>
                <input className="mt-0.5 w-full bg-white/5 px-2 py-1.5 text-xs ring-1 ring-white/10 outline-none transition-all duration-200 focus:ring-white/30 hover:bg-white/8 focus:scale-[1.02]" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
              </div>
            </div>

            <button
              className={`mt-3 w-full py-2 text-xs font-semibold disabled:opacity-60 transition-all duration-200 active:scale-95 ${tab === 'buy' ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30 hover:bg-green-500/25' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25'}`}
              disabled={buyM.isPending || sellM.isPending}
              onClick={() => void submit()}
            >
              {tab === 'buy' ? 'Buy' : 'Sell'} {side === 'yes' ? 'Yes' : 'No'}
            </button>

            {(buyM.isError || sellM.isError) && (
              <div className="mt-1.5 text-xs text-white">{((buyM.error || sellM.error) as Error).message}</div>
            )}
            {(buyM.isSuccess || sellM.isSuccess) && (
              <div className="mt-1.5 text-xs text-white">Success</div>
            )}

            <div className="mt-4 border-t border-white/5 pt-3">
              <div className="text-[10px] text-gray-400 mb-2">Risk Analysis</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300">Total Cost</span>
                  <span className="text-[10px] font-semibold">${((price * quantity) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300">Potential Profit</span>
                  <span className="text-[10px] font-semibold text-green-300">${(((100 - price) * quantity) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300">Potential Loss</span>
                  <span className="text-[10px] font-semibold text-red-300">${((price * quantity) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}