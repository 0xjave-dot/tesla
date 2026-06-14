import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  adminApproveTransaction, 
  adminRejectTransaction 
} from '../../lib/firestore';
import { StatusBadge, EmptyState } from '../../components/common/Helpers';
import { 
  Coins, 
  Clock, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  Info,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transaction, UserBalance } from '../../types';

export default function AdminDashboard() {
  // Aggregate stats states
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [platformStats, setPlatformStats] = useState({
    totalAvailable: 0,
    totalLocked: 0,
    totalRegistered: 0,
  });

  // Recent pending transactions
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);

  // Note states per transaction id
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscribe to aggregate user balances
  useEffect(() => {
    const unsubBalances = onSnapshot(collection(db, 'balances'), (snapshot) => {
      let avail = 0;
      let lock = 0;
      let tot = 0;

      snapshot.forEach((doc) => {
        const bal = doc.data() as UserBalance;
        avail += bal.available || 0;
        lock += bal.locked || 0;
        tot += bal.total || 0;
      });

      setPlatformStats({
        totalAvailable: avail,
        totalLocked: lock,
        totalRegistered: tot
      });
      setLoadingStats(false);
    }, (error) => {
      console.error("Failed querying platform balances:", error);
    });

    return unsubBalances;
  }, []);

  // Subscribe to total users count
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTotalUsers(snapshot.size);
    }, (error) => {
      console.error("Failed user tally:", error);
    });

    return unsubUsers;
  }, []);

  // Subscribe to pending transactions list (top 8)
  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(8)
    );

    const unsubPending = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Transaction);
      });
      setPendingTxs(list);
      setLoadingTxs(false);
    }, (error) => {
      console.error("Failed querying pending admin transactions:", error);
      setLoadingTxs(false);
    });

    return unsubPending;
  }, []);

  const handleAction = async (txId: string, type: 'approve' | 'reject') => {
    const note = adminNotes[txId]?.trim() || '';
    if (!note && type === 'reject') {
      setActionError('A brief explanation note is required before rejecting transactions.');
      return;
    }

    setActionError(null);
    setSubmittingIds(prev => ({ ...prev, [txId]: true }));

    try {
      if (type === 'approve') {
        await adminApproveTransaction(txId, note || 'Approved by system administrator');
      } else {
        await adminRejectTransaction(txId, note);
      }
      // Clear notes field
      setAdminNotes(prev => ({ ...prev, [txId]: '' }));
    } catch (err: any) {
      console.warn("Operation failed:", err);
      setActionError(err.message || 'Operation failed during transaction verification.');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [txId]: false }));
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* HEADER ROW */}
      <div className="flex justify-between items-center bg-navy-card p-6 border border-white/[0.07] rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Operator Administration Suite</h2>
            <p className="text-xs text-white/40 mt-0.5">Control live capital requests and list trading users.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase font-bold tracking-widest bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1.5 text-red-400 font-sans block select-none">
            Live Console
          </span>
        </div>
      </div>

      {/* THREE STATS CARDS BLOCK */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Platform assets */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-2xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-full" />
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-white/45 text-[9px] font-bold uppercase tracking-wider block">Capital cash AUM</span>
            {loadingStats ? (
              <div className="h-5 w-20 bg-white/5 rounded mt-1 animate-pulse" />
            ) : (
              <span className="num text-xl font-medium text-white block mt-0.5">
                ${(platformStats.totalAvailable + platformStats.totalLocked).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <span className="text-[9px] text-white/30 block mt-0.5">Combined client available + locked</span>
          </div>
        </div>

        {/* Card 2: Queued actions */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-2xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-full" />
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider block">Queued requests</span>
            <span className="num text-xl font-medium text-yellow-400 block mt-0.5 animate-pulse">
              {pendingTxs.length} Transactions
            </span>
            <span className="text-[9px] text-white/30 block mt-0.5">Awaiting operator review</span>
          </div>
        </div>

        {/* Card 3: Total customers */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-2xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-full" />
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-green-500 text-[9px] font-bold uppercase tracking-wider block">Registered users</span>
            <span className="num text-xl font-medium text-white block mt-0.5">
              {totalUsers} Investor Accounts
            </span>
            <span className="text-[9px] text-white/30 block mt-0.5">Total platform clients</span>
          </div>
        </div>
      </section>

      {/* RECENT PENDING REQUEST REVIEW BLOCK */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Queued Action Boards</h4>
          <Link to="/admin/transactions" className="text-accent text-xs font-semibold hover:underline flex items-center gap-1">
            <span>Review Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {actionError && (
          <div className="p-4 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-bold font-sans animate-shake">
            {actionError}
          </div>
        )}

        <div className="space-y-4">
          {loadingTxs ? (
            <div className="card p-8 text-center bg-navy-card">
              <Loader2 className="animate-spin text-accent w-6 h-6 mx-auto" />
            </div>
          ) : pendingTxs.length === 0 ? (
            <EmptyState message="All clear! No pending transaction requests in the queue." />
          ) : (
            pendingTxs.map((tx) => {
              const isSubmitting = submittingIds[tx.id] || false;
              return (
                <div 
                  key={tx.id} 
                  className="card p-5 bg-navy-card border border-white/[0.07] hover:border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition duration-150"
                >
                  {/* Left Metadata details */}
                  <div className="flex items-start gap-3 w-full md:w-1/3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      tx.type === 'deposit' ? 'bg-gain/10 text-gain' : 'bg-yellow-400/10 text-yellow-500'
                    }`}>
                      {tx.type === 'deposit' ? <TrendingUp className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white truncate block">{tx.userName || 'Investor'}</span>
                        <span className="text-[8px] text-white/30 uppercase shrink-0">({tx.userId.slice(0, 5)}...)</span>
                      </div>
                      <span className="text-[10px] text-white/45 block mt-0.5 uppercase tracking-wider font-semibold">
                        Wallet {tx.type} request
                      </span>
                      <span className="text-[9px] text-white/30 block mt-0.5">
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('en-US') : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Note details */}
                  <div className="flex px-1 flex-col justify-center w-full md:w-1/4">
                    <span className="text-[10px] text-white/40 block">User provided reference proof:</span>
                    <span className="text-[11px] text-white/80 block mt-1 line-clamp-2 max-w-sm italic bg-navy-sidebar p-2 rounded border border-white/[0.03]">
                      "{tx.note}"
                    </span>
                  </div>

                  {/* Right Action verification */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:w-5/12 justify-end">
                    {/* Notes field inputs */}
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={adminNotes[tx.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [tx.id]: e.target.value }))}
                      placeholder="Input bank clearance code / rejection memo..."
                      className="bg-navy-sidebar border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-accent w-full md:max-w-[200px]"
                    />

                    {/* Numeric value readout */}
                    <div className="text-right px-2 hidden sm:block">
                      <span className="text-[9px] text-white/35 block uppercase tracking-wider">Requested</span>
                      <span className={`num text-md font-semibold ${tx.type === 'deposit' ? 'text-gain' : 'text-yellow-400'}`}>
                        ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Buttons row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(tx.id, 'reject')}
                        disabled={isSubmitting}
                        className="bg-loss/15 hover:bg-loss text-loss hover:text-white border border-loss/20 hover:border-transparent p-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-none flex items-center justify-center"
                        title="Reject request"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4.5 h-4.5" />}
                      </button>

                      <button
                        onClick={() => handleAction(tx.id, 'approve')}
                        disabled={isSubmitting}
                        className="bg-gain/15 hover:bg-gain text-gain hover:text-white border border-gain/20 hover:border-transparent px-4 py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-bold text-xs"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
