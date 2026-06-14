import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { adminApproveTransaction, adminRejectTransaction } from '../../lib/firestore';
import { StatusBadge, EmptyState } from '../../components/common/Helpers';
import { 
  CreditCard, 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Transaction } from '../../types';

export default function AdminTransactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [activeTab, setActiveTab] = useState<'All' | 'deposit' | 'withdrawal' | 'pending' | 'approved' | 'rejected'>('All');
  const [search, setSearch] = useState('');

  // Action states
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Subscribe to all platform transactions (last 200)
  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Transaction);
      });
      setTxs(list);
      setLoading(false);
    }, (error) => {
      console.error("Ledger query failed:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAction = async (txId: string, type: 'approve' | 'reject') => {
    const note = notes[txId]?.trim() || '';
    if (!note && type === 'reject') {
      setGlobalError('A short reason explanation is required to decline requests.');
      return;
    }

    setGlobalError(null);
    setSubmittingIds(prev => ({ ...prev, [txId]: true }));

    try {
      if (type === 'approve') {
        await adminApproveTransaction(txId, note || 'Verified & approved by administrative core.');
      } else {
        await adminRejectTransaction(txId, note);
      }
      setNotes(prev => ({ ...prev, [txId]: '' }));
    } catch (err: any) {
      setGlobalError(err.message || 'Verification update failed.');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [txId]: false }));
    }
  };

  // filter logics combined
  const filteredTxs = useMemo(() => {
    return txs.filter((tx) => {
      // 1. Tab filter
      let matchesTab = true;
      if (activeTab === 'deposit') matchesTab = tx.type === 'deposit';
      else if (activeTab === 'withdrawal') matchesTab = tx.type === 'withdrawal';
      else if (activeTab === 'pending') matchesTab = tx.status === 'pending';
      else if (activeTab === 'approved') matchesTab = tx.status === 'approved';
      else if (activeTab === 'rejected') matchesTab = tx.status === 'rejected';

      // 2. Search match
      const stringifiedValue = `${tx.amount}` || '';
      const matchesSearch = 
        (tx.userName || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.userId || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.note || '').toLowerCase().includes(search.toLowerCase()) ||
        stringifiedValue.includes(search);

      return matchesTab && matchesSearch;
    });
  }, [txs, activeTab, search]);

  return (
    <div className="space-y-8 select-none">
      {/* HEADER TIER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-medium tracking-tight text-white">Platform Transfers Board</h2>
          </div>
          <p className="text-white/45 text-sm mt-1">
            Releasing, pending, and archived records audit trails for wire transfers.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, amount, code..."
            className="bg-navy-card border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all w-full sm:w-64"
          />
        </div>
      </div>

      {/* FILTER BUTTON TABS BAR */}
      <div className="bg-navy-card/40 border border-white/[0.04] p-3 rounded-2xl flex flex-wrap gap-1.5 select-none font-mono">
        {([
          { key: 'All', label: 'All Transfers' },
          { key: 'deposit', label: 'Deposits Only' },
          { key: 'withdrawal', label: 'Withdrawal Only' },
          { key: 'pending', label: 'Pendings Queue' },
          { key: 'approved', label: 'Approved Ledger' },
          { key: 'rejected', label: 'Declined Logs' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[10px] uppercase font-bold rounded-xl transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-accent text-white shadow shadow-accent/25'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global Action Errors banner */}
      {globalError && (
        <div className="p-4 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-bold leading-relaxed">
          {globalError}
        </div>
      )}

      {/* GRID LOGS SHEET BODY */}
      {loading ? (
        <div className="p-12 text-center bg-navy-card border border-white/[0.07] rounded-3xl">
          <Loader2 className="animate-spin text-accent w-8 h-8 mx-auto" />
        </div>
      ) : filteredTxs.length === 0 ? (
        <EmptyState 
          message="No ledger transactions match this filter." 
          submessage="Reset your criteria or verify search strings." 
        />
      ) : (
        <div className="card overflow-hidden bg-navy-card border border-white/[0.07] rounded-3xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="border-b border-white/[0.07] bg-white/[0.01]/40 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-4">Transfer Date</th>
                  <th className="px-5 py-4">Client Identity</th>
                  <th className="px-4 py-4">Security Class</th>
                  <th className="px-4 py-4">Net Value Requested</th>
                  <th className="px-4 py-4">Transfer Status</th>
                  <th className="px-5 py-4">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {filteredTxs.map((tx) => {
                  const isSubmitting = submittingIds[tx.id] || false;
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.005] transition-colors duration-100">
                      {/* Settlement time */}
                      <td className="px-5 py-4 text-white/45">
                        <span className="block leading-tight">
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                        </span>
                        <span className="text-[10px] text-white/30 block mt-0.5">
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'No Stamp'}
                        </span>
                      </td>

                      {/* Client Identity details */}
                      <td className="px-5 py-4 font-semibold text-white">
                        <span>{tx.userName || 'Investor'}</span>
                        <span className="text-[10px] text-white/30 block font-normal font-sans mt-0.5">UID: {tx.userId.slice(0, 8)}...</span>
                      </td>

                      {/* Class type */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-md ${
                          tx.type === 'deposit' ? 'bg-gain/15 text-gain font-semibold' : 'bg-white/10 text-white/50'
                        }`}>
                          {tx.type === 'deposit' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      {/* Value requested */}
                      <td className={`px-4 py-4 num text-sm font-semibold text-white`}>
                        ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={tx.status} />
                      </td>

                      {/* Verification action input or memo readout */}
                      <td className="px-5 py-4 text-right">
                        {tx.status === 'pending' ? (
                          /* Pending prompt fields and confirmation buttons */
                          <div className="flex items-center gap-2.5 justify-end">
                            <input
                              type="text"
                              disabled={isSubmitting}
                              value={notes[tx.id] || ''}
                              onChange={(e) => setNotes(prev => ({ ...prev, [tx.id]: e.target.value }))}
                              placeholder="Clearance codes / memo..."
                              className="bg-navy-sidebar border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent w-48"
                            />
                            
                            {/* Buttons */}
                            <button
                              onClick={() => handleAction(tx.id, 'reject')}
                              disabled={isSubmitting}
                              className="bg-loss/15 hover:bg-loss text-loss hover:text-white border border-loss/20 hover:border-transparent p-2 rounded-xl transition cursor-pointer shrink-0"
                              title="Reject operation"
                            >
                              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleAction(tx.id, 'approve')}
                              disabled={isSubmitting}
                              className="bg-gain/15 hover:bg-gain hover:text-white border border-gain/20 hover:border-transparent text-gain text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer shrink-0 inline-flex items-center gap-1 leading-none"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Clear</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* Non-pending finalized logs description readout */
                          <div className="text-left md:text-right max-w-[240px] md:max-w-none ml-auto">
                            <span className="text-[10px] text-white/35 uppercase tracking-wider block font-bold">Processed Memo</span>
                            <span className="text-[11px] text-white/55 block mt-0.5 italic max-w-xs truncate" title={tx.adminNote || tx.note}>
                              "{tx.adminNote || tx.note || 'No administrative memo entered.'}"
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
