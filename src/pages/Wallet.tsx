import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  useBalance, 
  useTransactions, 
  createDepositRequest, 
  createWithdrawalRequest 
} from '../lib/firestore';
import { StatusBadge, EmptyState } from '../components/common/Helpers';
import { 
  Banknote, 
  Lock, 
  TrendingUp, 
  Info, 
  AlertTriangle, 
  Loader2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Clock,
  History,
  Coins
} from 'lucide-react';

export default function Wallet() {
  const { currentUser } = useAuth();
  
  // Real-time hooks
  const { balance } = useBalance(currentUser?.uid);
  const { transactions, loading: txsLoading } = useTransactions(currentUser?.uid, 100);

  // Switch tabs for Form: 'deposit' | 'withdraw'
  const [formType, setFormType] = useState<'deposit' | 'withdraw'>('deposit');
  
  // Deposit state
  const [depAmount, setDepAmount] = useState('');
  const [depNote, setDepNote] = useState('');
  const [depMethod, setDepMethod] = useState<'BTC' | 'PayPal' | 'Venmo'>('BTC');
  
  // Withdraw state
  const [withAmount, setWithAmount] = useState('');
  const [withNote, setWithNote] = useState('');

  // Sorter state for history table: 'All' | 'deposit' | 'withdrawal' | 'pending'
  const [historyFilter, setHistoryFilter] = useState<'All' | 'deposit' | 'withdrawal' | 'pending'>('All');

  // Submit states
  const [depLoading, setDepLoading] = useState(false);
  const [withLoading, setWithLoading] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);
  const [withError, setWithError] = useState<string | null>(null);
  const [depSuccess, setDepSuccess] = useState<string | null>(null);
  const [withSuccess, setWithSuccess] = useState<string | null>(null);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepError(null);
    setDepSuccess(null);

    const val = parseFloat(depAmount);
    if (isNaN(val) || val < 10) {
      setDepError('Minimum deposit request is $10.00.');
      return;
    }

    if (!currentUser) return;
    setDepLoading(true);

    try {
      await createDepositRequest(
        currentUser.uid, 
        currentUser.displayName || 'Investor', 
        val, 
        depNote.trim() || `${depMethod} deposit`,
        depMethod
      );
      setDepSuccess(`Deposit of $${val.toFixed(2)} submitted and pending admin verification. You will be notified when approved.`);
      
      // Reset inputs
      setDepAmount('');
      setDepNote('');
    } catch (err: any) {
      setDepError(err.message || 'Error occurred while creating deposit request.');
    } finally {
      setDepLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithError(null);
    setWithSuccess(null);

    const val = parseFloat(withAmount);
    if (isNaN(val) || val <= 0) {
      setWithError('Please enter a valid withdrawal value.');
      return;
    }

    if (val > balance.available) {
      setWithError(`Insufficient funds. Your available trading cash is $${balance.available.toFixed(2)}.`);
      return;
    }

    if (!currentUser) return;
    setWithLoading(true);

    try {
      await createWithdrawalRequest(
        currentUser.uid, 
        currentUser.displayName || 'Investor', 
        val, 
        withNote.trim() || 'Bank withdrawal'
      );
      setWithSuccess(`Withdrawal of $${val.toFixed(2)} submitted and pending admin verification. Funds are locked until approved.`);
      
      // Reset inputs
      setWithAmount('');
      setWithNote('');
    } catch (err: any) {
      setWithError(err.message || 'Error occurred while creating withdrawal request.');
    } finally {
      setWithLoading(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (historyFilter === 'All') return true;
    if (historyFilter === 'pending') return tx.status === 'pending';
    return tx.type === historyFilter;
  });

  return (
    <div className="space-y-8 select-none">
      {/* SECTION TIER: CORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: BALANCES SHEETS */}
        <div className="space-y-4">
          <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase pl-1">Wallet Accounts</h4>
          
          {/* AVAILABLE CARD */}
          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl flex flex-col justify-between relative overflow-hidden h-40">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gain rounded-full" />
            <div className="flex justify-between items-start">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">Available to Trade</span>
              <div className="w-9 h-9 rounded-xl bg-gain/10 flex items-center justify-center text-gain shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="num text-3xl font-medium text-white block">
                ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-white/30 block mt-0.5">Liquid cash ready for instant order placement</span>
            </div>
          </div>

          {/* TOTAL INJECTED */}
          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl flex flex-col justify-between relative overflow-hidden h-40">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/30 rounded-full" />
            <div className="flex justify-between items-start">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">Total Deposited</span>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/40 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="num text-3xl font-medium text-white block">
                ${balance.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </span>
              <span className="text-[10px] text-white/30 block mt-0.5">Net cash capitalization ledger history</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FUND ACCESS FORMS (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-white/40 text-[10px] font-bold tracking-widest uppercase pl-1">Monetary Access Consoles</h4>
          
          <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl flex flex-col">
            {/* Form Toggle Tabs */}
            <div className="bg-navy-base border border-white/[0.04] rounded-2xl p-1 flex gap-1 select-none mb-6 font-mono self-start w-72">
              <button
                type="button"
                onClick={() => setFormType('deposit')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                  formType === 'deposit'
                    ? 'bg-accent text-white shadow shadow-accent/25'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                REQUEST DEPOSIT
              </button>
              <button
                type="button"
                onClick={() => setFormType('withdraw')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                  formType === 'withdraw'
                    ? 'bg-accent text-white shadow shadow-accent/25'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                REQUEST PAYOUT
              </button>
            </div>

            {/* DEPOSIT CONSOLE */}
            {formType === 'deposit' ? (
              <form onSubmit={handleDepositSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Amount */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">
                      Transfer Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-xs">$</span>
                      <input
                        type="number"
                        min="10"
                        step="1"
                        required
                        value={depAmount}
                        onChange={(e) => { setDepAmount(e.target.value); setDepError(null); }}
                        placeholder="100.00"
                        className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl pl-8 pr-4 py-3 text-xs text-white num leading-tight focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Note reference */}
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">
                      Proof details (e.g. BTC tx hash or PayPal email)
                    </label>
                    <input
                      type="text"
                      required
                      value={depNote}
                      onChange={(e) => { setDepNote(e.target.value); setDepError(null); }}
                      placeholder={
                        depMethod === 'BTC' 
                          ? 'Enter BTC tx hash or your BTC wallet address' 
                          : depMethod === 'PayPal' 
                            ? 'Enter your PayPal email or transaction ID'
                            : 'Enter your Venmo username or transaction ID'
                      }
                      className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white placeholder-white/35 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">Deposit Method</label>
                  <div className="flex items-center gap-3 ml-2">
                    <label className={`text-xs cursor-pointer ${depMethod === 'BTC' ? 'font-semibold text-white' : 'text-white/50'}`}>
                      <input type="radio" name="depMethod" value="BTC" checked={depMethod === 'BTC'} onChange={() => setDepMethod('BTC')} className="mr-2" />BTC
                    </label>
                    <label className={`text-xs cursor-pointer ${depMethod === 'PayPal' ? 'font-semibold text-white' : 'text-white/50'}`}>
                      <input type="radio" name="depMethod" value="PayPal" checked={depMethod === 'PayPal'} onChange={() => setDepMethod('PayPal')} className="mr-2" />PayPal
                    </label>
                    <label className={`text-xs cursor-pointer ${depMethod === 'Venmo' ? 'font-semibold text-white' : 'text-white/50'}`}>
                      <input type="radio" name="depMethod" value="Venmo" checked={depMethod === 'Venmo'} onChange={() => setDepMethod('Venmo')} className="mr-2" />Venmo
                    </label>
                  </div>
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 text-xs text-white/60 flex items-start gap-3">
                  <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Submit your deposit details (BTC address, PayPal email, or Venmo ID). Our administrators will verify your credentials and credit funds to your trading balance within 24 hours.
                  </p>
                </div>

                {depError && (
                  <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                    {depError}
                  </div>
                )}

                {depSuccess && (
                  <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 shrink-0" />
                    <span>{depSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={depLoading || !depAmount}
                  className="bg-accent text-white hover:bg-accent/95 py-3 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow shadow-accent/15 disabled:opacity-50"
                >
                  {depLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Request Deposit Ref</span>
                </button>
              </form>
            ) : (
              /* WITHDRAWAL CONSOLE */
              <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Amount */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">
                      Withdraw Value ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-xs">$</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={withAmount}
                        onChange={(e) => { setWithAmount(e.target.value); setWithError(null); }}
                        placeholder="50.00"
                        className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl pl-8 pr-4 py-3 text-xs text-white num leading-tight focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Notes mapping */}
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2">
                      Destination remit details (Account details / Wallet address)
                    </label>
                    <input
                      type="text"
                      required
                      value={withNote}
                      onChange={(e) => { setWithNote(e.target.value); setWithError(null); }}
                      placeholder="Chase account ending/7112 routing/982215"
                      className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white placeholder-white/35 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="bg-gain/5 border border-gain/20 rounded-2xl p-4 text-xs text-white/60 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-gain shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Submit your withdrawal destination. Your requested amount will be locked from your trading account. Funds transfer after admin verification and approval within 24 hours.
                  </p>
                </div>

                {withError && (
                  <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                    {withError}
                  </div>
                )}

                {withSuccess && (
                  <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 shrink-0" />
                    <span>{withSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={withLoading || !withAmount}
                  className="bg-accent text-white hover:bg-accent-raised py-3 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow shadow-accent/15 disabled:opacity-50"
                >
                  {withLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Request Instant Withdrawal</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* SECTION TIER: AUDIT LOG TRANSACTION HISTORIES */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-white/35" />
            <h4 className="text-white text-sm font-semibold tracking-tight">Financial Transaction Ledger</h4>
          </div>

          {/* Filtering Pill Tabs */}
          <div className="bg-navy-card/50 border border-white/[0.04] p-1 rounded-xl flex gap-1 font-mono">
            {(['All', 'deposit', 'withdrawal', 'pending'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                  historyFilter === filter
                    ? 'bg-accent/15 text-accent border border-accent/10'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {filter === 'All' ? 'ALL RECORD' : filter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table Grid */}
        <div className="card overflow-hidden bg-navy-card border border-white/[0.07] rounded-2xl">
          {txsLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-accent w-6 h-6 mx-auto" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState message="No previous transactions match your selected category." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="border-b border-white/[0.07] bg-white/[0.01]/40 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Settlement Time</th>
                    <th className="px-6 py-4">Security Class</th>
                    <th className="px-6 py-4">Proof Reference / Notes</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Debit / Credit Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.01] transition duration-150">
                      {/* Date */}
                      <td className="px-6 py-4 text-white/45">
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending review'}
                      </td>

                      {/* Class Type */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-md ${
                          tx.type === 'deposit' ? 'bg-gain/15 text-gain font-semibold' : 'bg-white/10 text-white/50'
                        }`}>
                          {tx.type === 'deposit' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      {/* Proof reference */}
                      <td className="px-6 py-4">
                        <div className="max-w-[220px] truncate text-white/70" title={tx.note}>
                          {tx.note}
                        </div>
                        {tx.adminNote && (
                          <div className="text-[10px] text-yellow-400/80 italic mt-0.5 truncate max-w-[220px]" title={tx.adminNote}>
                            Operator Note: {tx.adminNote}
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4">
                        <StatusBadge status={tx.status} />
                      </td>

                      {/* Debit Credit */}
                      <td className={`px-6 py-4 text-right num font-semibold ${tx.type === 'deposit' ? 'text-gain' : 'text-white'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
