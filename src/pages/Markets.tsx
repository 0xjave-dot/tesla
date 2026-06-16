import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssets } from '../lib/firestore';
import { PriceChange, EmptyState } from '../components/common/Helpers';
import { Search, Sparkles, RefreshCw, Layers2, ArrowRight } from 'lucide-react';

// Price change tracker to flash green or red on Firestore dynamic updates
const LivePriceCell: React.FC<{ price: number; symbol: string }> = ({ price, symbol }) => {
  const [displayPrice, setDisplayPrice] = useState(price);
  const prevPriceRef = useRef<number>(price);
  const [flashClass, setFlashClass] = useState<string>('');

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      const direction = price > prevPriceRef.current ? 'animate-price-up-flash' : 'animate-price-down-flash';
      setFlashClass(direction);
      setDisplayPrice(price);

      // Dismiss flash after transition complete (800ms)
      const timer = setTimeout(() => setFlashClass(''), 800);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  // Simulated micro-jitter for "Live Ticker" feel between server syncs
  useEffect(() => {
    const intervalId = setInterval(() => {
      const jitter = (Math.random() - 0.5) * (displayPrice * 0.00015);
      setDisplayPrice(prev => prev + jitter);
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(intervalId);
  }, [displayPrice]);

  return (
    <span className={`num text-sm text-white font-medium px-2 py-1 rounded transition duration-200 ${flashClass}`}>
      ${displayPrice.toLocaleString('en-US', {
        minimumFractionDigits: displayPrice < 0.01 ? 6 : (displayPrice < 1 ? 4 : 2),
        maximumFractionDigits: displayPrice < 0.01 ? 6 : (displayPrice < 1 ? 4 : 2)
      })}
    </span>
  );
};

export default function Markets() {
  const navigate = useNavigate();
  const { assets, priceMap, loading } = useAssets();
  
  // Find the latest update time from assets
  const lastUpdate = useMemo(() => {
    if (assets.length === 0) return null;
    const timestamps = assets
      .map(a => a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0)
      .filter(t => t > 0);
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toLocaleTimeString([], { 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  }, [assets]);

  const [activeTab, setActiveTab] = useState<'All' | 'stock' | 'crypto'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorter / Filter logics
  const filteredAssets = assets.filter((asset) => {
    const matchesTab = activeTab === 'All' || asset.type === activeTab;
    const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-8 select-none" data-aos="fade-up">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-white">Trading Markets</h2>
            <div className="w-2.5 h-2.5 rounded-full bg-gain animate-pulse mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider leading-none">Live feeds</span>
              {lastUpdate && (
                <span className="text-[8px] text-accent/60 font-mono mt-0.5">
                  Synced: {lastUpdate}
                </span>
              )}
            </div>
          </div>
          <p className="text-white/40 text-xs sm:text-sm mt-1">
            Browse real-world equities and crypto quotes updated via Finnhub.
          </p>
        </div>
      </div>

      {/* TABS FILTER AND SEARCH ROW */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-navy-card/40 border border-white/[0.04] p-3 sm:p-4 rounded-lg sm:rounded-2xl" data-aos="fade-up" data-aos-delay="100">
        {/* Left Filter Pill tab group */}
        <div className="bg-navy-sidebar border border-white/[0.05] rounded-lg sm:rounded-xl p-1 flex gap-1 select-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'All'
                ? 'bg-accent text-white shadow shadow-accent/25'
                : 'text-white/50 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-accent text-white shadow shadow-accent/25'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Stocks
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'crypto'
                ? 'bg-accent text-white shadow shadow-accent/25'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Crypto
          </button>
        </div>

        {/* Right Search Bar */}
        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/30 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-navy-sidebar border border-white/[0.07] rounded-lg sm:rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all w-full"
          />
        </div>
      </div>
      
      {/* MARKETS LIST TABLE */}
      {loading ? (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-white/[0.05] bg-white/[0.01]">
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-white/[0.04] p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState 
          message="No matching assets found" 
          submessage="Try adjusting your filters or search coordinates." 
        />
      ) : (
        <div className="card overflow-hidden border border-white/[0.07] bg-navy-card rounded-lg sm:rounded-2xl shadow-xl" data-aos="fade-up" data-aos-delay="200">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead className="border-b border-white/[0.07] bg-white/[0.01]/50 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4">Asset Details</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4">Market Cost</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4">24h Change</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4">Class</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.symbol}
                    onClick={() => navigate(`/dashboard/markets/${asset.symbol}`)}
                    className="hover:bg-navy-raised/40 transition-colors cursor-pointer group"
                  >
                    {/* Details Column */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {asset.logoUrl ? (
                          <img src={asset.logoUrl} alt={asset.symbol} className="w-full h-full object-contain p-1.5" />
                        ) : (
                          <span className={`text-xs font-bold ${asset.type === 'crypto' ? 'text-purple-400' : 'text-accent'}`}>
                            {asset.symbol[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-white/40 block leading-tight hidden sm:block">{asset.name}</span>
                          {asset.priceSource === 'live-api' ? (
                            <span className="text-[8px] bg-gain/10 text-gain px-1 rounded uppercase font-bold">Live</span>
                          ) : (
                            <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-1 rounded uppercase font-bold">Sim</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-white block sm:mt-0.5 group-hover:text-accent transition duration-150">
                          {asset.symbol}
                        </span>
                      </div>
                    </td>

                    {/* Cost Column */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <LivePriceCell price={asset.currentPrice} symbol={asset.symbol} />
                    </td>

                    {/* Change Column */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <PriceChange value={asset.change24h} showIcon />
                    </td>

                    {/* Class Column */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md ${
                        asset.type === 'crypto'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                          : 'bg-accent/10 text-accent border border-accent/10'
                      }`}>
                        <Layers2 className="w-3 h-3" />
                        <span className="hidden sm:inline">{asset.type}</span>
                      </span>
                    </td>

                    {/* Actions Button */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/markets/${asset.symbol}`);
                        }}
                        className="bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white border border-accent/10 rounded-lg px-2 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold transition"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-white/[0.05]">
            {filteredAssets.map((asset) => (
              <div
                key={asset.symbol}
                onClick={() => navigate(`/dashboard/markets/${asset.symbol}`)}
                className="p-4 hover:bg-navy-raised/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.symbol} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className={`text-xs font-bold ${asset.type === 'crypto' ? 'text-purple-400' : 'text-accent'}`}>
                          {asset.symbol[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold tracking-tight text-white block group-hover:text-accent transition duration-150">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-white/40">{asset.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/markets/${asset.symbol}`);
                    }}
                    className="bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/10 rounded-lg px-2 py-1 text-xs font-semibold transition shrink-0"
                  >
                    Trade
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/40 mb-1">Price</div>
                    <LivePriceCell price={asset.currentPrice} symbol={asset.symbol} />
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">24h Change</div>
                    <PriceChange value={asset.change24h} showIcon />
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Class</div>
                    <span className={`inline-flex items-center text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      asset.type === 'crypto'
                        ? 'text-purple-400'
                        : 'text-accent'
                    }`}>
                      {asset.type === 'crypto' ? 'Crypto' : 'Stock'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
