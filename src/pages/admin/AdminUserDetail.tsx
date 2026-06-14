import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { 
  PriceChange, 
  EmptyState as CommonEmptyState,
  StatusBadge as CommonStatusBadge 
} from '../../components/common/Helpers';
import { useAssets } from '../../lib/firestore';
import { 
  ChevronLeft, 
  User, 
  FileText, 
  Database, 
  DollarSign, 
  TrendingUp, 
  Lock, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Coins
} from 'lucide-react';
import { UserProfile, UserBalance, Holding, Order, Transaction } from '../../types';

export default function AdminUserDetail() {
  const { uid } = useParams<{ uid: string }>();

  // Fetch live prices map so we can display live valuations of user holdings
  const { priceMap, loading: assetsLoading } = useAssets();

  // Local state observers
  const [user, setUser] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);

  // Loading flags
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Manual Balance Adjustment controller
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Subscribe to details of user profile
  useEffect(() => {
    if (!uid) return;
    setLoadingUser(true);
    const unsubUser = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      if (snapshot.exists()) {
        setUser(snapshot.data() as UserProfile);
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    }, (error) => {
      console.error("Failed querying user inspect:", error);
      setLoadingUser(false);
    });

    return unsubUser;
  }, [uid]);

  // Subscribe to relative user balances
  useEffect(() => {
    if (!uid) return;
    const unsubBalance = onSnapshot(doc(db, 'balances', uid), (snapshot) => {
      if (snapshot.exists()) {
        setBalance(snapshot.data() as UserBalance);
      } else {
        setBalance(null);
      }
    });

    return unsubBalance;
  }, [uid]);

  // Subscribe to user active holdings
  useEffect(() => {
    if (!uid) return;
    const unsubHoldings = onSnapshot(collection(db, 'holdings', uid, 'assets'), (snapshot) => {
      const list: Holding[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Holding);
      });
      setHoldings(list);
    }, (error) => {
      console.warn("No holdings permission/exist yet");
    });

    return unsubHoldings;
  }, [uid]);

  // Subscribe to user past orders
  useEffect(() => {
    if (!uid) return;
    setLoadingOrders(true);
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Order);
      });
      setOrders(list);
      setLoadingOrders(false);
    }, (error) => {
      console.warn("Orders feed errored:", error);
      setLoadingOrders(false);
    });

    return unsubOrders;
  }, [uid]);

  // Subscribe to user transaction list
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubTxs = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Transaction);
      });
      setTxs(list);
    }, (error) => {
      console.warn("Transactions feed errored:", error);
    });

    return unsubTxs;
  }, [uid]);

  // Handle Manual adjust execution inside a Database Transaction
  const handleBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);

    const val = parseFloat(adjustAmount);
    if (isNaN(val) || val <= 0) {
      setAdjustError('Please input a valid positive adjusted amount.');
      return;
    }

    if (adjustMode === 'deduct' && balance && balance.available < val) {
      setAdjustError(`Cannot deduct $${val.toFixed(2)}. Available customer balance is only $${balance.available.toFixed(2)}.`);
      return;
    }

    if (!uid || !user) return;
    setAdjustLoading(true);

    try {
      await runTransaction(db, async (txn) => {
        const balanceRef = doc(db, 'balances', uid);
        const bDoc = await txn.get(balanceRef);
        const delta = adjustMode === 'add' ? val : -val;

        // Update or set balances document
        if (!bDoc.exists()) {
          txn.set(balanceRef, {
            available: delta,
            locked: 0,
            total: delta,
            updatedAt: serverTimestamp()
          });
        } else {
          txn.update(balanceRef, {
            available: increment(delta),
            total: increment(delta),
            updatedAt: serverTimestamp()
          });
        }

        // Add auto-approved audit proof transaction document
        const txRef = doc(collection(db, 'transactions'));
        txn.set(txRef, {
          id: txRef.id,
          userId: uid,
          userName: user.name || 'Investor ID ' + uid.slice(0,4),
          type: adjustMode === 'add' ? 'deposit' : 'withdrawal',
          amount: val,
          status: 'approved',
          note: `Admin Adjustment: ${adjustNote.trim() || 'Manual administrative balance update.'}`,
          adminNote: 'Executed directly inside adjustment console.',
          createdAt: serverTimestamp()
        });
      });

      setAdjustSuccess(`Successfully ${adjustMode === 'add' ? 'credited' : 'deducted'} $${val.toFixed(2)} in available cash.`);
      setAdjustAmount('');
      setAdjustNote('');
    } catch (err: any) {
      console.error("Adjustment transacting failed:", err);
      setAdjustError(err.message || 'Verification failed while adjusting balance sheets.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Compute stats
  const derivedStats = useMemo(() => {
    let holdingsValue = 0;
    holdings.forEach((hold) => {
      const priceObject = priceMap[hold.symbol];
      const live = priceObject ? priceObject.currentPrice : hold.avgBuyPrice;
      holdingsValue += hold.units * live;
    });

    const cashAvail = balance?.available || 0;
    const cashLock = balance?.locked || 0;
    const netAssets = cashAvail + cashLock + holdingsValue;

    return {
      holdingsValue,
      netAssets
    };
  }, [holdings, balance, priceMap]);

  if (loadingUser) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 text-center py-12">
        <CommonEmptyState message="Investor record not found" submessage={`No profiling registered matching ID: ${uid}`} />
        <Link to="/admin/users" className="btn-primary inline-flex items-center gap-1.5 font-semibold">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none" data-aos="fade-up">
      {/* Back button */}
      <div>
        <Link to="/admin/users" className="text-white/40 text-xs font-semibold hover:text-white inline-flex items-center gap-1.5 transition">
          <ChevronLeft className="w-4 h-4" />
          <span>Exit to Directory</span>
        </Link>
      </div>

      {/* RE-USABLE USER OVERVIEW SUB-STRIP */}
      <section className="bg-navy-card border border-white/[0.07] p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4" data-aos="fade-right" data-aos-delay="100">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-14 h-14 rounded-full border border-white/25 object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/15 text-accent text-lg font-bold flex items-center justify-center">
              {(user.name || 'I')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">{user.name || 'Anonymous Investor'}</h3>
            <span className="text-white/45 text-xs block truncate mt-0.5">{user.email}</span>
            <span className="text-[10px] text-white/30 block mt-1 uppercase tracking-wider font-semibold">
              UID: {user.uid}
            </span>
          </div>
        </div>

        {/* Aggregate numeric balances */} 
        <div className="flex gap-8 md:gap-14 border-t md:border-t-0 md:border-l border-white/[0.07] pt-4 md:pt-0 md:pl-12 w-full md:w-auto text-xs">
          <div>
            <span className="text-white/35 text-[9px] font-bold uppercase block">Trading cash</span>
            <span className="num text-md font-semibold text-white block mt-1">
              ${(balance?.available || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-yellow-400 text-[9px] font-bold uppercase block">Escrow locked</span>
            <span className="num text-md font-semibold text-yellow-400 block mt-1">
              ${(balance?.locked || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-white/35 text-[9px] font-bold uppercase block">Investments</span>
            <span className="num text-md font-semibold text-white block mt-1 font-mono">
              ${derivedStats.holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-accent text-[9px] font-bold uppercase block">Net client value</span>
            <span className="num text-lg font-bold text-accent block mt-0.5">
              ${derivedStats.netAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </section>

      {/* DOUBLE-HALF SECTION: ADJUST BALANCES MANUAL CONTROLLER & POSITION TABLE */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" data-aos="fade-up" data-aos-delay="200">
        
        {/* MANUAL ADJUST BALANCES CONTAINER CARD */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl flex flex-col justify-between">
          <div>
            <h4 className="text-white text-sm font-semibold tracking-tight pb-3 border-b border-white/[0.05]">
              Cash Balance Adjustment
            </h4>
            <p className="text-white/40 text-xs mt-2 leading-relaxed">
              Manually add or subtract available cash directly inside this client's profile balance.
            </p>
          </div>

          <form onSubmit={handleBalanceAdjustment} className="space-y-4 pt-5">
            {/* Mode Selector */}
            <div className="bg-navy-base border border-white/[0.04] rounded-xl p-1 flex gap-1 select-none font-mono">
              <button
                type="button"
                onClick={() => { setAdjustMode('add'); setAdjustError(null); }}
                className={`flex-grow py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  adjustMode === 'add'
                    ? 'bg-gain text-[#080c18] font-bold'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                CREDIT / DEPOSIT CASH (+)
              </button>
              <button
                type="button"
                onClick={() => { setAdjustMode('deduct'); setAdjustError(null); }}
                className={`flex-grow py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  adjustMode === 'deduct'
                    ? 'bg-loss text-white font-bold'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                CHARGE / DEDUCT CASH (-)
              </button>
            </div>

            {/* Inputs Amount */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-accent" />
                <span>Adjustment value ($)</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={adjustAmount}
                onChange={(e) => { setAdjustAmount(e.target.value); setAdjustError(null); }}
                placeholder="100.00"
                className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white num placeholder-white/20 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">
                Audit Transaction note
              </label>
              <input
                type="text"
                required
                value={adjustNote}
                onChange={(e) => { setAdjustNote(e.target.value); setAdjustError(null); }}
                placeholder="Diagnostic compensation grant reference #G8721"
                className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white placeholder-white/25 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Warning alerts */}
            {adjustError && (
              <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                {adjustError}
              </div>
            )}

            {adjustSuccess && (
              <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gain shrink-0" />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={adjustLoading || !adjustAmount}
              className={`w-full py-3.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                adjustMode === 'add'
                  ? 'bg-gain hover:bg-gain/95 text-navy-base font-bold shadow-gain/10'
                  : 'bg-loss hover:bg-loss/90 text-white font-bold shadow-loss/10'
              }`}
            >
              {adjustLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Execute Balance Update</span>
            </button>
          </form>
        </div>

        {/* OWNER ACTIVE POSITION HOLDINGS CARD */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl h-full flex flex-col justify-between">
          <h4 className="text-white text-sm font-semibold tracking-tight pb-3 border-b border-white/[0.05] mb-4">
            Security Positions Owned
          </h4>

          {holdings.length === 0 ? (
            <div className="py-8">
              <CommonEmptyState message="Customer doesn't own any assets." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-white/[0.07] text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/[0.01]/30">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Avg Cost</th>
                    <th className="px-4 py-3">Spot Cost</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {holdings.map((hold) => {
                    const priceObject = priceMap[hold.symbol];
                    const activeCost = priceObject ? priceObject.currentPrice : hold.avgBuyPrice;
                    const valuation = hold.units * activeCost;
                    return (
                      <tr key={hold.symbol} className="hover:bg-white/[0.01]">
                        <td className="px-4 py-2.5 font-semibold text-white">
                          {hold.symbol}
                        </td>
                        <td className="px-4 py-2.5 num text-white/70">
                          {hold.units}
                        </td>
                        <td className="px-4 py-2.5 num text-white/60">
                          ${hold.avgBuyPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 num text-white/60">
                          ${activeCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium num text-white text-xs">
                          ${valuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* THIRD LAYER DOUBLE ROWS: ORDER SETTLEMENT LEDGER & TRANSFERS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-aos="fade-up" data-aos-delay="300">
        
        {/* ORDERS BOARD LIST */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pl-1">
            <History className="w-4 h-4 text-white/30" />
            <span className="text-white text-sm font-semibold tracking-tight">Historic Trade Orders</span>
          </div>

          <div className="card p-5 bg-navy-card border border-white/[0.07] rounded-3xl">
            {loadingOrders ? (
              <div className="py-8 text-center text-xs">
                <Loader2 className="animate-spin text-accent w-5 h-5 mx-auto" />
              </div>
            ) : orders.length === 0 ? (
              <CommonEmptyState message="No trades completed by user yet." />
            ) : (
              <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-left font-sans">
                  <thead className="text-[9px] font-bold text-white/40 uppercase tracking-widest border-b border-white/[0.05] bg-white/[0.01]/30">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Side</th>
                      <th className="px-3 py-2 text-right">Proceeds</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/[0.01]">
                        <td className="px-3 py-2.5 text-white/45">
                          {ord.createdAt?.toDate ? ord.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-white">
                          {ord.symbol}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-1 rounded ${
                            ord.side === 'buy' ? 'bg-buy/15 text-buy' : 'bg-loss/15 text-loss'
                          }`}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium num text-white">
                          ${ord.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* TRANSFERS BOARD LIST */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pl-1">
            <Coins className="w-4 h-4 text-white/30" />
            <span className="text-white text-sm font-semibold tracking-tight">Transfer Ledger Histories</span>
          </div>

          <div className="card p-5 bg-navy-card border border-white/[0.07] rounded-3xl">
            {txs.length === 0 ? (
              <CommonEmptyState message="No monetary transfers logged yet." />
            ) : (
              <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-left font-sans">
                  <thead className="text-[9px] font-bold text-white/40 uppercase tracking-widest border-b border-white/[0.05] bg-white/[0.01]/30">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Debit/Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {txs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition duration-150">
                        <td className="px-3 py-2.5 text-white/45">
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Pending'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-white capitalize">
                          {tx.type}
                        </td>
                        <td className="px-3 py-2.5">
                          <CommonStatusBadge status={tx.status} />
                        </td>
                        <td className={`px-3 py-2.5 text-right num font-semibold ${
                          tx.type === 'deposit' ? 'text-gain' : 'text-white'
                        }`}>
                          ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
