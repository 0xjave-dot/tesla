import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  useBalance, 
  useAssets, 
  useHoldings, 
  useTransactions 
} from '../lib/firestore';
import { 
  PriceChange, 
  StatusBadge, 
  EmptyState 
} from '../components/common/Helpers';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  Lock, 
  CircleDollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// Unified High-Quality Price Component for Dashboard
const DynamicPrice: React.FC<{ price: number; className?: string }> = ({ price, className = "" }) => {
  const [displayPrice, setDisplayPrice] = useState(price);
  const prevPriceRef = useRef<number>(price);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      setFlash(price > prevPriceRef.current ? "text-gain" : "text-loss");
      setDisplayPrice(price);
      const timer = setTimeout(() => setFlash(""), 1000);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  useEffect(() => {
    const interval = setInterval(() => {
      const jitter = (Math.random() - 0.5) * (displayPrice * 0.0001);
      setDisplayPrice(prev => prev + jitter);
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [displayPrice]);

  return (
    <span className={`num transition-colors duration-500 ${flash} ${className}`}>
      ${displayPrice.toLocaleString('en-US', {
        minimumFractionDigits: displayPrice < 1 ? 4 : 2,
        maximumFractionDigits: displayPrice < 1 ? 6 : 2
      })}
    </span>
  );
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  // Real-time hooks
  const { balance } = useBalance(currentUser?.uid);
  const { assets, priceMap, loading: assetsLoading } = useAssets();
  const { holdings } = useHoldings(currentUser?.uid);
  const { transactions } = useTransactions(currentUser?.uid, 5);

  const [tslaChartData, setTslaChartData] = useState<{ value: number }[]>([]);

  // Get active TSLA price details
  const tslaAsset = priceMap['TSLA'];
  const tslaPrice = tslaAsset?.currentPrice || 208.50;
  const tslaChange = tslaAsset?.change24h || 3.12;

  // Generate dynamic random walk sparkline seeded from TSLA current price
  useEffect(() => {
    const points = [];
    let current = tslaPrice * 0.94; // start slightly lower for an elegant climb
    for (let i = 0; i < 30; i++) {
      const volatility = 0.0065;
      const change = current * (Math.random() - 0.44) * volatility; // bias upwards slightly
      current += change;
      points.push({ value: parseFloat(current.toFixed(2)) });
    }
    // set last point to exact price
    points[points.length - 1] = { value: tslaPrice };
    setTslaChartData(points);
  }, [tslaPrice]);

  // Compute portfolio computations
  const portfolioStats = useMemo(() => {
    let holdingsValue = 0;
    let holdingsCost = 0;

    holdings.forEach((holding) => {
      const livePrice = priceMap[holding.symbol]?.currentPrice || holding.avgBuyPrice;
      holdingsValue += holding.units * livePrice;
      holdingsCost += holding.units * holding.avgBuyPrice;
    });

    const totalValue = balance.available + holdingsValue;
    const profitLoss = holdingsValue - holdingsCost;
    const percentChange = holdingsCost > 0 ? (profitLoss / holdingsCost) * 100 : 0;

    return {
      totalValue,
      holdingsValue,
      profitLoss,
      percentChange,
    };
  }, [holdings, balance.available, priceMap]);

  return (
    <div className="space-y-8 select-none">
      {/* PORTFOLIO VALUE HERO */}
      <section id="portfolio-hero" className="card p-8 bg-navy-card border border-white/[0.07] rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-white/50 text-[10px] font-bold tracking-[0.15em] uppercase block">
            Total Net Worth
          </span>
          <span className="num text-4xl md:text-5xl font-medium tracking-tight text-white block mt-1.5">
            ${portfolioStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          
          {/* Portfolio return summary */}
          <div className="flex items-center gap-1.5 mt-2.5">
            {portfolioStats.profitLoss >= 0 ? (
              <span className="inline-flex items-center gap-1.5 text-gain text-xs font-semibold bg-gain/10 rounded-full px-3 py-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+${portfolioStats.profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="opacity-90">({portfolioStats.percentChange.toFixed(2)}%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-loss text-xs font-semibold bg-loss/10 rounded-full px-3 py-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>-${Math.abs(portfolioStats.profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="opacity-90">({portfolioStats.percentChange.toFixed(2)}%)</span>
              </span>
            )}
            <span className="text-white/30 text-xs pl-1">All-time trading returns</span>
          </div>
        </div>

        {/* Hero supplementary stats columns */}
        <div className="flex gap-8 md:gap-16 border-t md:border-t-0 md:border-l border-white/[0.07] pt-4 md:pt-0 md:pl-16 w-full md:w-auto">
          <div>
            <span className="text-white/40 text-[10px] font-bold tracking-wider uppercase block">Cash Cash</span>
            <span className="num text-xl font-medium text-white block mt-1">
              ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-white/30 block mt-0.5">Available in wallet</span>
          </div>
          <div>
            <span className="text-white/40 text-[10px] font-bold tracking-wider uppercase block">Asset Investments</span>
            <span className="num text-xl font-medium text-white block mt-1">
              ${portfolioStats.holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-white/30 block mt-0.5">Active stocks & crypto</span>
          </div>
        </div>
      </section>

      {/* MIDSECTION BOOTH: BALANCES & TSLA CHART */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BALANCE CARDS STACK (1/3) */}
        <div className="flex flex-col gap-4">
          <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase pl-1">Balance Sheets</h4>
          
          {/* Card 1: Available */}
          <div className="card p-5 bg-navy-card/90 border border-white/[0.08] rounded-2xl flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gain rounded-full" />
            <div className="w-10 h-10 rounded-xl bg-gain/10 flex items-center justify-center text-gain shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">Available Balance</span>
              <span className="num text-xl font-medium text-white block mt-0.5">
                ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 2: Combined Portfolio Asset AUM */}
          <div className="card p-5 bg-navy-card/90 border border-white/[0.08] rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-full" />
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">Combined Portfolio Asset AUM</span>
              <span className="num text-xl font-medium text-white block mt-0.5">
                ${(balance.available + portfolioStats.holdingsValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 3: Total Deposited */}
          <div className="card p-5 bg-navy-card/90 border border-white/[0.08] rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-full" />
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/50 shrink-0">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">Total Deposits Net</span>
              <span className="num text-xl font-medium text-white block mt-0.5">
                ${balance.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <Link to="/dashboard/wallet" className="text-center bg-accent/15 hover:bg-accent/25 text-accent text-xs font-semibold py-3 px-4 rounded-xl border border-accent/25 transition">
              Fund Deposit
            </Link>
            <Link to="/dashboard/wallet" className="text-center bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold py-3 px-4 rounded-xl border border-white/[0.07] transition">
              Cash Withdrawal
            </Link>
          </div>
        </div>

        {/* TSLA AREA PRICE CHART (2/3) */}
        <div className="lg:col-span-2 card p-6 bg-navy-card border border-white/[0.07] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center text-sm border border-accent/15">
                T
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-white block">TSLA SPOT</span>
                  <span className="text-[10px] uppercase font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/40">Equity</span>
                </div>
                <span className="text-white/40 text-xs block">Tesla motors quote trajectory</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <DynamicPrice price={tslaPrice} className="text-lg font-medium text-white block" />
                <PriceChange value={tslaChange} className="text-xs" />
              </div>
              <Link to="/dashboard/markets/TSLA" className="text-xs flex items-center gap-1 font-semibold text-accent hover:text-white transition">
                <span>View Full</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Area Spark chart container */}
          <div className="h-40 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tslaChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tslaDashChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#06b6d4" 
                  strokeWidth={2} 
                  fill="url(#tslaDashChartGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* TOP ASSETS SLIDE-TICKER ROW */}
      <section className="space-y-3.5">
        <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase pl-1">Trading Asset Ticker</h4>
        <div className="overflow-hidden relative group">
          <div className="flex gap-4 animate-ticker-slow hover:pause-animation py-1 w-max">
          {assetsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-navy-card/40 border border-white/[0.04] p-4 rounded-xl w-44 h-24 animate-pulse" />
            ))
          ) : (
            [...assets, ...assets].map((asset, idx) => (
              <Link 
                key={`${asset.symbol}-${idx}`} 
                to={`/dashboard/markets/${asset.symbol}`}
                className="bg-navy-card hover:bg-navy-raised border border-white/[0.06] hover:border-white/10 rounded-xl p-4 flex-shrink-0 w-44 transition shadow-md block select-none"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <span className="text-xs text-white/50 block font-light font-sans truncate">{asset.name}</span>
                    <span className="text-sm font-semibold text-white block tracking-tight mt-0.5 transition">{asset.symbol}</span>
                  </div>
                  <span className={`text-[9px] uppercase font-bold rounded px-1.5 py-0.5 ${
                    asset.type === 'crypto' ? 'bg-purple-500/10 text-purple-400' : 'bg-accent/10 text-accent'
                  }`}>
                    {asset.type}
                  </span>
                </div>

                <div className="flex justify-between items-baseline mt-3.5">
                  <DynamicPrice price={asset.currentPrice} className="text-sm text-white font-medium" />
                  <PriceChange value={asset.change24h} className="text-[10px]" />
                </div>
                
                <div className="w-full mt-2 h-0.5 rounded bg-white/[0.04]">
                  <div className={`h-full rounded ${asset.change24h >= 0 ? 'bg-gain' : 'bg-loss'}`} style={{
                    width: `${Math.min(Math.abs(asset.change24h) * 10 + 20, 100)}%`
                  }} />
                </div>
              </Link>
            ))
          )}
          </div>
        </div>
      </section>

      {/* RECENT TRANSACTION LOG ACTIVITY */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Recent Wallet Transfers</h4>
          <Link to="/dashboard/wallet" className="text-accent text-xs font-semibold hover:underline">
            View All Ledger
          </Link>
        </div>

        <div className="card p-6 bg-navy-card/85 border border-white/[0.07] rounded-2xl">
          {transactions.length === 0 ? (
            <EmptyState message="No transfers logged yet. Add funds to start buying." />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3.5">
                    {tx.type === 'deposit' ? (
                      <div className="w-9 h-9 rounded-xl bg-gain/10 flex items-center justify-center text-gain">
                        <ArrowDownCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                        <ArrowUpCircle className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-white capitalize block">
                        Wallet {tx.type}
                      </span>
                      <span className="text-[10px] text-white/30 block mt-0.5">
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className={`num text-sm font-semibold ${tx.type === 'deposit' ? 'text-gain' : 'text-white'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
