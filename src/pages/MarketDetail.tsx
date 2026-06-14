import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  useBalance, 
  placeBuyOrder, 
  placeSellOrder,
  handleFirestoreError,
  OperationType
} from '../lib/firestore';
import { 
  PriceChange, 
  EmptyState 
} from '../components/common/Helpers';
import { 
  onSnapshot, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Asset, Holding, Order, OrderSide } from '../types';
import { 
  ChevronLeft, 
  TrendingUp, 
  Coins, 
  Loader2, 
  TrendingDown, 
  ShieldCheck, 
  CheckCircle,
  Clock,
  History
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// High-quality flashing price display for the detail header to match the Markets list
const LivePriceHeader: React.FC<{ price: number }> = ({ price }) => {
  const prevPriceRef = useRef<number | null>(null);
  const [flashClass, setFlashClass] = useState<string>('');

  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
      const direction = price > prevPriceRef.current ? 'animate-price-up-flash' : 'animate-price-down-flash';
      setFlashClass(direction);

      // Dismiss flash after transition complete (800ms)
      const timer = setTimeout(() => {
        setFlashClass('');
      }, 800);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  return (
    <span className={`num text-3xl font-medium text-white block px-2 py-0.5 rounded transition duration-200 ${flashClass}`}>
      ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

export default function MarketDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const { currentUser } = useAuth();

  const { balance } = useBalance(currentUser?.uid); // Keep this for user's balance
  const { assets, priceMap, loading: assetsLoadingFromHook } = useAssets(); // Use the global assets hook
  const [asset, setAsset] = useState<Asset | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [assetLoading, setAssetLoading] = useState(true); // Keep local loading, but update from hook
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Time Range tabs (Simulated)
  const [timeTab, setTimeTab] = useState<'1H' | '1D' | '1W' | '1M'>('1D');
  const [chartData, setChartData] = useState<{ time: string; price: number }[]>([]);

  // Trade form state
  const [tradeSide, setTradeSide] = useState<OrderSide>('buy');
  const [units, setUnits] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activePrice = asset?.currentPrice || 0;

  // Update asset state when symbol or priceMap changes
  useEffect(() => {
    if (symbol) {
      const foundAsset = priceMap[symbol.toUpperCase()];
      setAsset(foundAsset || null);
    } else {
      setAsset(null);
    }
    // Update local loading state based on the global assets hook's loading state
    setAssetLoading(assetsLoadingFromHook);
  }, [symbol, priceMap, assetsLoadingFromHook]);

  // Real-time subscribe to the User's Holdings for this specific asset
  useEffect(() => {
    if (!currentUser || !symbol) return;

    const holdingRef = doc(db, 'holdings', currentUser.uid, 'assets', symbol.toUpperCase());
    const path = `holdings/${currentUser.uid}/assets/${symbol.toUpperCase()}`;

    const unsubscribe = onSnapshot(holdingRef, (snapshot) => {
      if (snapshot.exists()) {
        setHolding(snapshot.data() as Holding);
      } else {
        setHolding(null);
      }
    }, (error) => {
      // If user does not have permissions or doesn't exist, handle or return null holding
      setHolding(null);
    });

    return unsubscribe;
  }, [currentUser, symbol]);

  // Real-time subscribe to past orders for this asset
  useEffect(() => {
    if (!currentUser || !symbol) return;

    setOrdersLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      where('symbol', '==', symbol.toUpperCase()),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const path = `orders`;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Order);
      });
      setOrders(list);
      setOrdersLoading(false);
    }, (error) => {
      console.warn("Could not load asset orders:", error);
      setOrdersLoading(false);
    });

    return unsubscribe;
  }, [currentUser, symbol]);

  // Fetch real market analytics history or fall back to simulation
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!activePrice || !symbol) return;

    let active = true;
    setChartLoading(true);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/market/history/${symbol.toUpperCase()}?range=${timeTab}`);
        if (!res.ok) throw new Error("HTTP premium feedback rejected");
        const json = await res.json();
        
        if (active && json && Array.isArray(json.data) && json.data.length > 0) {
          setChartData(json.data);
          setChartLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Real-time proxy failed to reach historical records. Activating simulation fallback...", e);
      }

      // Safe backup seed / simulated fallback loop
      if (!active) return;
      
      const items = [];
      let ticks = 60;
      let multiplier = 1;
      let formatLabel = (i: number) => `t-${i}`;

      if (timeTab === '1H') {
        ticks = 15;
        formatLabel = (i: number) => `${i * 4}m ago`;
      } else if (timeTab === '1D') {
        ticks = 30;
        formatLabel = (i: number) => `${i}h ago`;
      } else if (timeTab === '1W') {
        ticks = 40;
        multiplier = 2;
        formatLabel = (i: number) => `Day ${7 - Math.floor(i / 5)}`;
      } else if (timeTab === '1M') {
        ticks = 60;
        multiplier = 4;
        formatLabel = (i: number) => `D-${60 - i}`;
      }

      let current = activePrice * (0.95 + Math.random() * 0.05);
      for (let i = 0; i < ticks; i++) {
        const volatility = 0.0055 * multiplier;
        const drift = 0.0002;
        const change = current * ((Math.random() - 0.47) * volatility + drift);
        current += change;
        items.push({
          time: formatLabel(i),
          price: parseFloat(current.toFixed(2))
        });
      }

      items[items.length - 1] = {
        time: 'Now',
        price: parseFloat(activePrice.toFixed(2))
      };

      setChartData(items);
      setChartLoading(false);
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [activePrice, symbol, timeTab]);

  // Form total cost calculations
  const parsedUnits = parseFloat(units);
  const totalCost = useMemo(() => {
    if (isNaN(parsedUnits) || parsedUnits <= 0) return 0;
    return parsedUnits * activePrice;
  }, [parsedUnits, activePrice]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!currentUser) return;
    if (isNaN(parsedUnits) || parsedUnits <= 0) {
      setFormError('Please enter a valid amount of units.');
      return;
    }

    setActionLoading(true);

    try {
      if (tradeSide === 'buy') {
        if (totalCost > balance.available) {
          throw new Error(`Insufficient funds. Available: $${balance.available.toFixed(2)}, Required: $${totalCost.toFixed(2)}`);
        }
        await placeBuyOrder(currentUser.uid, symbol!.toUpperCase(), parsedUnits, activePrice);
        setSuccessMsg(`Successfully purchased ${parsedUnits} units of ${symbol!.toUpperCase()}!`);
      } else {
        if (!holding || holding.units < parsedUnits) {
          throw new Error(`Insufficient units in portfolio. You hold ${holding?.units || 0} units.`);
        }
        await placeSellOrder(currentUser.uid, symbol!.toUpperCase(), parsedUnits, activePrice);
        setSuccessMsg(`Successfully sold ${parsedUnits} units of ${symbol!.toUpperCase()}!`);
      }
      
      // Reset input on success
      setUnits('');
      
      // Clear toast after 3 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while subverting trade transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  if (assetLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4 text-center py-12">
        <EmptyState message="Asset quote record not found" submessage={`No listings registered for key: ${symbol}`} />
        <Link to="/dashboard/markets" className="btn-primary inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Markets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Back to listings button */}
      <div>
        <Link to="/dashboard/markets" className="text-white/40 text-xs font-semibold hover:text-white inline-flex items-center gap-1.5 transition">
          <ChevronLeft className="w-4 h-4" />
          <span>Exit to Markets</span>
        </Link>
      </div>

      {/* CORE TWO-COLUMN TRADE TERMINAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: TRAJECTORY AND CHART DESCRIPTION (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ASSET METADATA BLOCK */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-card p-6 border border-white/[0.07] rounded-3xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {asset.logoUrl ? (
                  <img src={asset.logoUrl} alt={asset.symbol} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className={`text-lg font-bold ${
                    asset.type === 'crypto' ? 'text-purple-400' : 'text-accent'
                  }`}>
                    {asset.symbol[0]}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-medium tracking-tight text-white">{asset.symbol}</h3>
                  <div className="w-2 h-2 rounded-full bg-gain animate-pulse" />
                  <span className="text-[9px] text-white/30 font-semibold uppercase tracking-wider">Live streaming</span>
                </div>
                <span className="text-white/50 text-xs block">{asset.name}</span>
              </div>
            </div>

            <div className="flex gap-8 items-end md:items-baseline">
              <div>
                <LivePriceHeader price={activePrice} />
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <PriceChange value={asset.change24h} className="text-sm font-semibold" />
                  <span className="text-white/30 text-[10px]">24h change</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end pt-1">
                <span className="text-[9px] uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 text-white/40 rounded">
                  {asset.type} asset
                </span>
                <span className="text-[8px] text-[#22c55e]/90 font-semibold uppercase animate-pulse">● Live Feed</span>
              </div>
            </div>
          </div>

          {/* TRAJECTORY DATA GRAPH CARD */}
          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl flex flex-col justify-between">
            <div className="flex justify-between items-center pb-4 border-b border-white/[0.05] mb-6">
              <div>
                <span className="text-sm font-semibold text-white">Price History</span>
                <span className="text-white/30 text-[10px] block mt-0.5">Custom timeline coordinates</span>
              </div>

              {/* Time group switches */}
              <div className="bg-navy-sidebar border border-white/[0.05] rounded-xl p-1 flex gap-1 font-mono">
                {(['1H', '1D', '1W', '1M'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTimeTab(tab)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                      timeTab === tab
                        ? 'bg-accent/15 text-accent border border-accent/10 font-bold'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Trajectory */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="detailChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#111e35', 
                      borderColor: 'rgba(255,255,255,0.13)', 
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      fontSize: '11px'
                    }}
                    itemStyle={{ color: '#06b6d4' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    formatter={(value) => [`$${value}`, 'Price']}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#detailChartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION TRANSMISSION CONSOLE (1/3) */}
        <div className="space-y-6">
          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl shadow-xl flex flex-col">
            <h4 className="text-white text-sm font-semibold tracking-tight pb-4 border-b border-white/[0.05] mb-5">
              Trading Execution
            </h4>

            {/* Positions detail subcard */}
            {holding ? (
              <div className="bg-navy-raised rounded-2xl p-4 border border-white/[0.06] mb-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  {asset.logoUrl ? (
                    <img src={asset.logoUrl} alt={asset.symbol} className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <span className={`text-xs font-bold ${asset.type === 'crypto' ? 'text-purple-400' : 'text-accent'}`}>
                      {asset.symbol[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-white/45 text-[9px] font-bold tracking-wider uppercase block">Your Positions</span>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-white text-md font-semibold font-sans">
                      {holding.units} Units Owned
                    </span>
                    <span className="num text-[10px] text-white/50 block font-normal">
                      Avg: ${holding.avgBuyPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.02] text-white/30 text-xs p-3 text-center rounded-xl mb-5">
                No active positions owned. Buy shares to initialize holding.
              </div>
            )}

            {/* Buy / Sell Tabs */}
            <div className="bg-navy-base border border-white/[0.04] rounded-xl p-1 flex gap-1 select-none mb-5 font-mono">
              <button
                type="button"
                onClick={() => { setTradeSide('buy'); setFormError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  tradeSide === 'buy'
                    ? 'bg-buy/90 text-[#080c18] font-bold shadow-md shadow-buy/15'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                BUY ASSET
              </button>
              <button
                type="button"
                onClick={() => { setTradeSide('sell'); setFormError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  tradeSide === 'sell'
                    ? 'bg-loss text-white font-bold shadow-md shadow-loss/15'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                SELL ASSET
              </button>
            </div>

            {/* Cost limits display */}
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              {/* Quantities input */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider pl-0.5 mb-2">
                  Number of Units
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    required
                    value={units}
                    onChange={(e) => { setUnits(e.target.value); setFormError(null); }}
                    placeholder="0.00"
                    className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs num focus:outline-none focus:border-accent text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-white/30 uppercase font-bold">
                    Units
                  </span>
                </div>
              </div>

              {/* Order total calculations summary */}
              <div className="bg-navy-sidebar border border-white/[0.05] rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-white/55">
                  <span>Price Quote</span>
                  <span className="num font-medium text-white">${activePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-white/55">
                  <span>Asset Fee</span>
                  <span className="num font-medium text-white">$0.00</span>
                </div>
                <div className="h-px bg-white/[0.05] my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium text-white/80">
                    {tradeSide === 'buy' ? 'Total Cost' : "Est. Proceeds"}
                  </span>
                  <span className={`num text-md font-semibold ${tradeSide === 'buy' ? 'text-buy' : 'text-gain'}`}>
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Net Cash reference limits */}
              <div className="flex items-center gap-1.5 pl-0.5 text-xs text-white/40 font-medium pb-2 select-none">
                <Coins className="w-4 h-4 text-accent" />
                <span>Available Cash:</span>
                <span className="num text-white">
                  ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action indicators alerts */}
              {formError && (
                <div className="p-3.5 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                  {formError}
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gain shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Action Submit */}
              <button
                type="submit"
                disabled={actionLoading || isNaN(parsedUnits) || parsedUnits <= 0}
                className={`w-full py-3.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  tradeSide === 'buy'
                    ? 'bg-buy text-[#080c18] hover:bg-buy/90 shadow-buy/10'
                    : 'bg-loss text-white hover:bg-loss/90 shadow-loss/10'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {tradeSide === 'buy' ? `Purchase ${symbol!.toUpperCase()}` : `Liquidate ${symbol!.toUpperCase()}`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: PORTFOLIO HISTORIC TRADES FOR THIS ASSET */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2 pl-1">
          <History className="w-4 h-4 text-white/35" />
          <h4 className="text-white text-sm font-semibold tracking-tight">Your Order Ledger &bull; {symbol!.toUpperCase()}</h4>
        </div>

        <div className="card overflow-hidden bg-navy-card border border-white/[0.07] rounded-2xl">
          {ordersLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-accent w-6 h-6 mx-auto" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState message="No previous trades logged for this asset." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="border-b border-white/[0.07] bg-white/[0.01] text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3.5">Settlement Term</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Volume bought/sold</th>
                    <th className="px-6 py-3.5">Exempt Cost</th>
                    <th className="px-6 py-3.5 text-right">Debit / Credit value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {orders.map((or) => (
                    <tr key={or.id} className="hover:bg-white/[0.02]/35 transition">
                      <td className="px-6 py-3.5 text-white/45">
                        {or.createdAt?.toDate ? or.createdAt.toDate().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just Now'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-md ${
                          or.side === 'buy' ? 'bg-buy/15 text-buy' : 'bg-loss/15 text-loss'
                        }`}>
                          {or.side}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 num text-white/70">
                        {or.units} Units
                      </td>
                      <td className="px-6 py-3.5 num text-white/70">
                        ${or.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium num text-white">
                        ${or.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
