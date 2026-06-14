import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBalance, useAssets, useHoldings } from '../lib/firestore';
import { PriceChange, EmptyState } from '../components/common/Helpers';
import { 
  PieChart as RechartPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartTooltip 
} from 'recharts';
import { Loader2, ArrowUpRight, ArrowDownRight, Layers, LayoutGrid, CircleDollarSign, BarChart2 } from 'lucide-react';

export default function Portfolio() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load real-time hooks
  const { balance, loading: balanceLoading } = useBalance(currentUser?.uid);
  const { priceMap, loading: assetsLoading } = useAssets();
  const { holdings, loading: holdingsLoading } = useHoldings(currentUser?.uid);

  const stats = useMemo(() => {
    let holdingsValue = 0;
    let totalCost = 0;
    
    const calculatedHoldings = holdings.map((holding) => {
      const livePrice = priceMap[holding.symbol]?.currentPrice || holding.avgBuyPrice;
      const currentValuation = holding.units * livePrice;
      const originalCost = holding.units * holding.avgBuyPrice;
      const dollarPL = currentValuation - originalCost;
      const percentPL = originalCost > 0 ? (dollarPL / originalCost) * 100 : 0;
      
      holdingsValue += currentValuation;
      totalCost += originalCost;

      return {
        ...holding,
        livePrice,
        valuation: currentValuation,
        originalCost,
        dollarPL,
        percentPL
      };
    });

    const netWorth = balance.available + holdingsValue;
    const netPL = holdingsValue - totalCost;
    const netPercentPL = totalCost > 0 ? (netPL / totalCost) * 100 : 0;

    return {
      netWorth,
      holdingsValue,
      totalCost,
      netPL,
      netPercentPL,
      calculatedHoldings
    };
  }, [holdings, balance.available, priceMap]);

  // Compute slice proportions for the Allocation Pie
  const pieData = useMemo(() => {
    const data: { name: string; value: number; color: string }[] = [];
    
    // Add liquid cash first if it exceeds zero
    if (balance.available > 0) {
      data.push({
        name: 'Liquid Cash',
        value: parseFloat(balance.available.toFixed(2)),
        color: '#3b7bff' // Accent blue
      });
    }

    // Pie visual color spectrum palette for holdings
    const colorSpectrum = ['#06b6d4', '#22c55e', '#a855f7', '#f5a623', '#ec4899', '#f43f5e', '#3b82f6'];

    stats.calculatedHoldings.forEach((holding, idx) => {
      if (holding.valuation > 0) {
        data.push({
          name: holding.symbol,
          value: parseFloat(holding.valuation.toFixed(2)),
          color: colorSpectrum[idx % colorSpectrum.length]
        });
      }
    });

    return data;
  }, [stats.calculatedHoldings, balance.available]);

  const activeHoldingsTotal = stats.calculatedHoldings.filter(h => h.units > 0).length;

  if (balanceLoading || assetsLoading || holdingsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none" data-aos="fade-up">
      {/* HEADER NET WORTH SCORE CARD */}
      <section className="bg-navy-card border border-white/[0.07] p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg">
        <div data-aos="fade-right" data-aos-delay="100">
          <span className="text-white/45 text-[10px] font-bold tracking-[0.2em] uppercase block">
            Net Valuation Breakdown
          </span>
          <span className="num text-4xl md:text-5xl font-semibold tracking-tight text-white block mt-1.5">
            ${stats.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          {/* returns summary */}
          <div className="flex items-center gap-2 mt-2.5">
            {stats.netPL >= 0 ? (
              <span className="inline-flex items-center gap-1 text-gain text-xs font-semibold bg-gain/10 rounded-full px-3 py-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+${stats.netPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="opacity-90">({stats.netPercentPL.toFixed(2)}%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-loss text-xs font-semibold bg-loss/10 rounded-full px-3 py-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>-${Math.abs(stats.netPL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="opacity-90">({stats.netPercentPL.toFixed(2)}%)</span>
              </span>
            )}
            <span className="text-white/30 text-xs font-medium">All positions returns</span>
          </div>
        </div>

        {/* Totals reference */} 
        <div className="flex gap-8 md:gap-14 border-t md:border-t-0 md:border-l border-white/[0.07] pt-4 md:pt-0 md:pl-12 w-full md:w-auto">
          <div>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Investment Cost</span>
            <span className="num text-lg font-medium text-white block mt-0.5">
              ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Position Value</span>
            <span className="num text-lg font-medium text-white block mt-0.5">
              ${stats.holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider block">Cash Cash</span>
            <span className="num text-lg font-medium text-white block mt-0.5">
              ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </section>

      {/* CORE COLUMNS GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* HOLDINGS MATRIX TABLE (2/3) */} 
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pl-1">
            <LayoutGrid className="w-4 h-4 text-white/35" />
            <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Portfolio holdings matrix</h4>
          </div>

          <div className="card overflow-hidden bg-navy-card border border-white/[0.07] rounded-3xl h-full shadow-lg">
            {activeHoldingsTotal === 0 ? (
              <div className="p-10 text-center space-y-4">
                <EmptyState message="Your investment portfolio is currently empty." />
                <Link to="/dashboard/markets" className="btn-primary inline-flex items-center gap-1.5 leading-none">
                  <BarChart2 className="w-4 h-4" />
                  <span>Browse Markets & Trade</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="border-b border-white/[0.07] bg-white/[0.01]/40 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-4">Asset Details</th>
                      <th className="px-4 py-4">Shares Own</th>
                      <th className="px-4 py-4">Avg Cost</th>
                      <th className="px-4 py-4">Spot Cost</th>
                      <th className="px-4 py-4">Open Valuation</th>
                      <th className="px-4 py-4">Returns P&L</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-xs">
                    {stats.calculatedHoldings.map((hold) => {
                      if (hold.units <= 0) return null;
                      return (
                        <tr
                          key={hold.symbol}
                          onClick={() => navigate(`/dashboard/markets/${hold.symbol}`)}
                          className="hover:bg-white/[0.01] transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-4 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center text-xs shrink-0">
                              {hold.symbol[0]}
                            </div>
                            <div>
                              <span className="text-white font-semibold text-xs block group-hover:text-accent transition duration-150">
                                {hold.symbol}
                              </span>
                              <span className="text-[10px] text-white/30 block mt-0.5">Assessed</span>
                            </div>
                          </td>

                          <td className="px-4 py-4 num text-white/70">
                            {hold.units}
                          </td>

                          <td className="px-4 py-4 num text-white/70">
                            ${hold.avgBuyPrice.toFixed(2)}
                          </td>

                          <td className="px-4 py-4 num text-white">
                            ${hold.livePrice.toFixed(2)}
                          </td>

                          <td className="px-4 py-4 num font-medium text-white">
                            ${hold.valuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-4">
                            {hold.dollarPL >= 0 ? (
                              <div className="text-gain font-semibold">
                                <span className="block num">${hold.dollarPL.toFixed(2)}</span>
                                <span className="text-[10px] font-medium block">+{hold.percentPL.toFixed(2)}%</span>
                              </div>
                            ) : (
                              <div className="text-loss font-semibold">
                                <span className="block num">-${Math.abs(hold.dollarPL).toFixed(2)}</span>
                                <span className="text-[10px] font-medium block">{hold.percentPL.toFixed(2)}%</span>
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/markets/${hold.symbol}`);
                              }}
                              className="text-xs font-semibold bg-accent/10 border border-accent/10 hover:bg-accent group-hover:text-white rounded-lg px-3 py-1.5 transition text-accent"
                            >
                              Trade
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* PORTFOLIO ALLOCATION RECHARTS DONUT (1/3) */}
        <div className="space-y-4" data-aos="fade-left" data-aos-delay="200">
          <div className="flex items-center gap-2 pl-1">
            <Layers className="w-4 h-4 text-white/35" />
            <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Asset Allocations</h4>
          </div>

          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl shadow-lg flex flex-col justify-between items-center text-center">
            {stats.netWorth === 0 || pieData.length === 0 ? (
              <div className="py-12 text-white/30 text-xs">Awaiting data variables</div>
            ) : (
              <>
                <div className="h-44 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartPieChart>
                      <RechartTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0d1426', 
                          borderColor: 'rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#ffffff'
                        }}
                        formatter={(val) => [`$${val.toLocaleString()}`, 'Valuation']}
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#0d1426" strokeWidth={1} />
                        ))}
                      </Pie>
                    </RechartPieChart>
                  </ResponsiveContainer>

                  {/* Centered label */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <span className="text-[9px] uppercase text-white/40 font-bold tracking-wider">Total</span>
                    <span className="num text-md font-semibold text-white">
                      ${stats.netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Slices legend list */}
                <div className="w-full mt-6 space-y-2 text-left">
                  {pieData.map((entry, idx) => {
                    const ratio = stats.netWorth > 0 ? (entry.value / stats.netWorth) * 100 : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-white/60 font-medium truncate">{entry.name}</span>
                        </div>
                        <div className="flex gap-4 items-baseline shrink-0">
                          <span className="num text-white/30 text-[10px]">${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span className="num font-semibold text-white w-10 text-right">{ratio.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
