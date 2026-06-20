import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Database, 
  Lock, 
  Unlock, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Check, 
  X, 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Info,
  Layers,
  FileCode,
  Key
} from 'lucide-react';
import { adminApproveTransaction, adminRejectTransaction } from '../../lib/firestore';

export default function DbAdmin() {
  // Password Lock Screen
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('db_console_authed') === 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Firestore console state
  const [selectedCollection, setSelectedCollection] = useState<string>('users');
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocData, setSelectedDocData] = useState<any | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [loadingDocDetail, setLoadingDocDetail] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Field editing state
  const [editFields, setEditFields] = useState<Record<string, { val: any; type: 'string' | 'number' | 'boolean' }>>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldVal, setNewFieldVal] = useState('');
  const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'boolean'>('string');
  const [showAddField, setShowAddField] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Quick Action forms
  // 1. Balance adjustment
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustTargetField, setAdjustTargetField] = useState<'available' | 'locked' | 'total'>('available');
  const [adjustStatus, setAdjustStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // 2. Transaction verification
  const [adminNote, setAdminNote] = useState('');
  const [txActionLoading, setTxActionLoading] = useState(false);

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Teslastock2026!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('db_console_authed', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Invalid console access password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('db_console_authed');
  };

  // Subscriptions to documents in selected collection
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingDocs(true);
    setSelectedDocId(null);
    setSelectedDocData(null);

    const q = collection(db, selectedCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setDocuments(list);
      setLoadingDocs(false);
    }, (error) => {
      console.error(`Error loading collection ${selectedCollection}:`, error);
      setDocuments([]);
      setLoadingDocs(false);
    });

    return unsubscribe;
  }, [selectedCollection, isAuthenticated]);

  // Fetch document details when a document is clicked
  const handleSelectDoc = async (id: string) => {
    setSelectedDocId(id);
    setLoadingDocDetail(true);
    setSaveStatus(null);
    setAdjustStatus(null);
    setAdminNote('');
    setShowAddField(false);

    try {
      const docRef = doc(db, selectedCollection, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSelectedDocData(data);
        
        // Prepare editable fields state
        const fields: Record<string, { val: any; type: 'string' | 'number' | 'boolean' }> = {};
        Object.entries(data).forEach(([key, val]) => {
          let type: 'string' | 'number' | 'boolean' = 'string';
          if (typeof val === 'number') type = 'number';
          else if (typeof val === 'boolean') type = 'boolean';
          else if (val && typeof val === 'object' && 'seconds' in val) {
            // Timestamp format
            val = new Date((val as any).seconds * 1000).toISOString();
            type = 'string';
          } else if (val === null || val === undefined) {
            val = '';
            type = 'string';
          } else {
            val = String(val);
          }
          fields[key] = { val, type };
        });
        setEditFields(fields);
      } else {
        setSelectedDocData(null);
      }
    } catch (err) {
      console.error("Error fetching doc details:", err);
    } finally {
      setLoadingDocDetail(false);
    }
  };

  // Filter documents based on ID or search string
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter(doc => {
      const idMatch = doc.id.toLowerCase().includes(searchQuery.toLowerCase());
      // Check properties values too
      const valuesMatch = Object.values(doc).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
      return idMatch || valuesMatch;
    });
  }, [documents, searchQuery]);

  // Save modified fields to Firestore
  const handleSaveDoc = async () => {
    if (!selectedDocId || !selectedDocData) return;
    setSaveStatus('Saving...');
    try {
      const payload: Record<string, any> = {};
      Object.entries(editFields).forEach(([key, rawItem]) => {
        const item = rawItem as { val: any; type: 'string' | 'number' | 'boolean' };
        let finalVal: any = item.val;
        if (item.type === 'number') {
          finalVal = Number(item.val);
          if (isNaN(finalVal)) finalVal = 0;
        } else if (item.type === 'boolean') {
          finalVal = item.val === 'true' || item.val === true;
        }
        payload[key] = finalVal;
      });

      await setDoc(doc(db, selectedCollection, selectedDocId), payload);
      setSaveStatus('Success! Document updated.');
      
      // Refresh local copy
      setSelectedDocData(payload);
    } catch (err: any) {
      console.error("Failed saving doc:", err);
      setSaveStatus(`Error: ${err.message || 'Failed to update'}`);
    }
  };

  // Add field to editable list locally before saving
  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    let val: any = newFieldVal;
    if (newFieldType === 'number') val = 0;
    else if (newFieldType === 'boolean') val = false;

    setEditFields(prev => ({
      ...prev,
      [newFieldName.trim()]: { val, type: newFieldType }
    }));
    setNewFieldName('');
    setNewFieldVal('');
    setShowAddField(false);
  };

  // Remove field locally
  const handleRemoveField = (fieldName: string) => {
    const updated = { ...editFields };
    delete updated[fieldName];
    setEditFields(updated);
  };

  // Delete entire document
  const handleDeleteDoc = async () => {
    if (!selectedDocId) return;
    if (!window.confirm(`Are you sure you want to delete document ${selectedDocId} from collection ${selectedCollection}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, selectedCollection, selectedDocId));
      setSelectedDocId(null);
      setSelectedDocData(null);
      alert('Document deleted successfully.');
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  // Adjust account balances
  const handleBalanceAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustStatus(null);
    const amountVal = parseFloat(adjustAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setAdjustStatus({ error: 'Please input a valid positive adjusted amount.' });
      return;
    }

    const targetUid = selectedDocId;
    if (!targetUid) return;

    setAdjustLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const balanceRef = doc(db, 'balances', targetUid);
        const balSnapshot = await transaction.get(balanceRef);
        
        let avail = 0;
        let lock = 0;
        let tot = 0;

        if (balSnapshot.exists()) {
          const data = balSnapshot.data();
          avail = data.available || 0;
          lock = data.locked || 0;
          tot = data.total || 0;
        }

        let newAvail = avail;
        let newLock = lock;
        let newTot = tot;

        // Perform balance math
        if (adjustTargetField === 'available') {
          if (adjustType === 'add') {
            newAvail += amountVal;
            newTot += amountVal;
          } else if (adjustType === 'deduct') {
            if (newAvail < amountVal) throw new Error('Deduction amount exceeds user available balance.');
            newAvail -= amountVal;
            newTot -= amountVal;
          } else {
            newTot = newTot - newAvail + amountVal;
            newAvail = amountVal;
          }
        } else if (adjustTargetField === 'locked') {
          if (adjustType === 'add') {
            newLock += amountVal;
            newTot += amountVal;
          } else if (adjustType === 'deduct') {
            if (newLock < amountVal) throw new Error('Deduction amount exceeds user locked balance.');
            newLock -= amountVal;
            newTot -= amountVal;
          } else {
            newTot = newTot - newLock + amountVal;
            newLock = amountVal;
          }
        } else {
          // total
          if (adjustType === 'add') {
            newTot += amountVal;
            newAvail += amountVal;
          } else if (adjustType === 'deduct') {
            if (newTot < amountVal) throw new Error('Deduction amount exceeds user total balance.');
            newTot -= amountVal;
            // deduct available first
            newAvail = Math.max(0, newAvail - amountVal);
          } else {
            newTot = amountVal;
          }
        }

        // Write modifications
        transaction.set(balanceRef, {
          available: newAvail,
          locked: newLock,
          total: newTot,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add auto-approved audit proof transaction document
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          id: txRef.id,
          userId: targetUid,
          userName: editFields['name']?.val || 'User ' + targetUid.slice(0, 5),
          type: adjustType === 'add' ? 'deposit' : 'withdrawal',
          amount: amountVal,
          status: 'approved',
          note: `Admin Quick Adjust (${adjustTargetField}): ${adjustNote.trim() || 'Manual update via DB console.'}`,
          adminNote: 'Executed directly inside Firestore simple panel.',
          createdAt: serverTimestamp()
        });
      });

      setAdjustStatus({ success: `Successfully updated balance sheet!` });
      setAdjustAmount('');
      setAdjustNote('');
      // Reload details
      handleSelectDoc(targetUid);
    } catch (err: any) {
      console.error(err);
      setAdjustStatus({ error: err.message || 'Failed updating balance sheets.' });
    } finally {
      setAdjustLoading(false);
    }
  };

  // Transaction Verification Actions
  const handleTxAction = async (type: 'approve' | 'reject') => {
    if (!selectedDocId) return;
    setTxActionLoading(true);
    setSaveStatus(null);
    try {
      if (type === 'approve') {
        await adminApproveTransaction(selectedDocId, adminNote || 'Approved via simple DB console');
      } else {
        if (!adminNote.trim()) {
          alert('Note is required for rejections.');
          setTxActionLoading(false);
          return;
        }
        await adminRejectTransaction(selectedDocId, adminNote);
      }
      setAdminNote('');
      // Reload details
      handleSelectDoc(selectedDocId);
    } catch (err: any) {
      alert(`Error transacting: ${err.message || 'Operation failed'}`);
    } finally {
      setTxActionLoading(false);
    }
  };

  // Create new document layout
  const handleCreateDocument = async () => {
    const customId = window.prompt(`Enter ID for new document (Leave empty for auto-generated ID):`);
    if (customId === null) return; // Cancelled
    
    let defaultPayload: Record<string, any> = {};
    if (selectedCollection === 'users') {
      defaultPayload = {
        uid: customId || 'user_' + Math.random().toString(36).substr(2, 9),
        name: 'New User',
        email: 'user@example.com',
        photoURL: '',
        country: 'US',
        role: 'user',
        createdAt: serverTimestamp()
      };
    } else if (selectedCollection === 'balances') {
      defaultPayload = {
        available: 0,
        locked: 0,
        total: 0,
        updatedAt: serverTimestamp()
      };
    } else if (selectedCollection === 'transactions') {
      defaultPayload = {
        id: customId || 'tx_' + Math.random().toString(36).substr(2, 9),
        userId: 'some-uid',
        userName: 'Client Name',
        type: 'deposit',
        amount: 100,
        status: 'pending',
        note: 'Deposit proof note',
        createdAt: serverTimestamp()
      };
    } else {
      defaultPayload = {
        createdAt: serverTimestamp()
      };
    }

    try {
      const finalId = customId || 'doc_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, selectedCollection, finalId), defaultPayload);
      handleSelectDoc(finalId);
    } catch (err: any) {
      alert(`Error creating document: ${err.message}`);
    }
  };

  // Render Login password screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center font-sans select-none px-4">
        <div className="max-w-md w-full bg-[#0d1426] border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 pointer-events-none rounded-3xl" />
          
          <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 bg-accent/15 border border-accent/25 text-accent rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-accent/5">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Firestore Simple Console</h2>
              <p className="text-white/40 text-xs mt-1 leading-snug">
                Enter your administrative key password to open the platform data editor.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/50 block pl-0.5">
                Authentication Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  className="w-full bg-[#060912] border border-white/[0.08] rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-accent/80 transition-all font-mono"
                  required
                />
                <Lock className="w-4 h-4 text-white/20 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              {passwordError && (
                <p className="text-loss text-xs font-semibold mt-1 animate-shake pl-0.5">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-accent/10 flex items-center justify-center gap-1.5 cursor-pointer leading-none"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Data Console</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Firestore Console panel
  return (
    <div className="min-h-screen bg-[#060912] text-white flex flex-col font-sans select-none">
      {/* Top Console Header Bar */}
      <header className="h-14 bg-[#0d1426] border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-white">Firebase Console</h1>
            <span className="text-white/30 text-xs">/</span>
            <span className="text-white/60 text-xs font-mono">tesla-stock-db</span>
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5 ml-2 font-mono">
              Simple Mode
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-white/40 hover:text-white border border-white/[0.08] hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock Console</span>
        </button>
      </header>

      {/* Main Database Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Panel 1: Collections List */}
        <section className="w-56 bg-[#090e1a] border-r border-white/[0.06] flex flex-col min-h-0 shrink-0 select-none">
          <div className="h-10 px-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Collections</span>
          </div>
          <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
            {([
              { key: 'users', label: 'users' },
              { key: 'balances', label: 'balances' },
              { key: 'transactions', label: 'transactions' },
              { key: 'holdings', label: 'holdings' },
              { key: 'orders', label: 'orders' },
              { key: 'assets', label: 'assets' }
            ]).map((col) => (
              <button
                key={col.key}
                onClick={() => setSelectedCollection(col.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition text-left cursor-pointer ${
                  selectedCollection === col.key
                    ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent rounded-l-none'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="font-mono">{col.label}</span>
              </button>
            ))}
          </nav>
        </section>

        {/* Panel 2: Documents List */}
        <section className="w-72 bg-[#0c1222] border-r border-white/[0.06] flex flex-col min-h-0 shrink-0">
          <div className="h-10 px-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01] shrink-0">
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Documents</span>
            <button
              onClick={handleCreateDocument}
              className="text-accent hover:text-accent/80 p-1 hover:bg-accent/10 rounded-md transition cursor-pointer"
              title="Add document"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick document search */}
          <div className="p-3 border-b border-white/[0.04] shrink-0 relative">
            <Search className="w-3.5 h-3.5 text-white/20 absolute left-6 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-[#060912] border border-white/[0.06] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/60"
            />
          </div>

          {/* Document list */}
          <div className="flex-grow overflow-y-auto space-y-0.5 p-2 font-mono text-xs">
            {loadingDocs ? (
              <div className="p-6 text-center text-white/35">
                <RefreshCw className="animate-spin w-4 h-4 mx-auto" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-6 text-center text-white/35 italic">No documents found.</div>
            ) : (
              filteredDocuments.map((docItem) => (
                <button
                  key={docItem.id}
                  onClick={() => handleSelectDoc(docItem.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left cursor-pointer ${
                    selectedDocId === docItem.id
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.015]'
                  }`}
                >
                  <span className="truncate pr-2 max-w-[200px]" title={docItem.id}>{docItem.id}</span>
                  <ChevronRight className="w-3 h-3 opacity-30 shrink-0" />
                </button>
              ))
            )}
          </div>
        </section>

        {/* Panel 3: Document Details Inspector & Quick Actions */}
        <section className="flex-1 flex flex-col min-h-0 bg-[#080c18] overflow-y-auto p-6 space-y-6">
          {!selectedDocId ? (
            <div className="flex-1 flex items-center justify-center text-center text-white/30 p-12">
              <div className="max-w-xs space-y-2">
                <FileCode className="w-10 h-10 mx-auto text-white/10" />
                <p className="text-xs">Select a document in the directory console panel to view and modify its database fields.</p>
              </div>
            </div>
          ) : loadingDocDetail ? (
            <div className="flex-grow flex items-center justify-center">
              <RefreshCw className="animate-spin text-accent w-8 h-8" />
            </div>
          ) : !selectedDocData ? (
            <div className="p-4 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs">
              Document details not found or permission denied.
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl" data-aos="fade-up">
              {/* Document Header info */}
              <div className="flex justify-between items-center bg-[#0d1426] border border-white/[0.06] p-5 rounded-2xl">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/35 uppercase tracking-widest block font-semibold font-mono">
                    {selectedCollection} / Document ID
                  </span>
                  <h2 className="text-sm font-mono text-white mt-1 select-text truncate max-w-xl" title={selectedDocId}>
                    {selectedDocId}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteDoc}
                    className="p-2 border border-loss/20 text-loss bg-loss/5 hover:bg-loss hover:text-white rounded-xl transition cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QUICK DATABASE CONTROLLERS FOR USER BALANCES / PENDING ACTIONS */}
              {selectedCollection === 'balances' || selectedCollection === 'users' ? (
                <div className="bg-[#0d1426] border border-white/[0.06] p-5 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-accent" />
                      <span>Account Balance Fast Adjuster</span>
                    </h3>
                    <p className="text-white/40 text-[11px] mt-1">
                      Instantly credit, charge, or set capital funds directly for this client. Generates transactional log trails automatically.
                    </p>
                  </div>

                  <form onSubmit={handleBalanceAdjustSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1.5">Target Field</label>
                      <select
                        value={adjustTargetField}
                        onChange={(e: any) => setAdjustTargetField(e.target.value)}
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="available">available (Trading Cash)</option>
                        <option value="locked">locked (Escrow Escort)</option>
                        <option value="total">total (Platform Value)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1.5">Operator Math</label>
                      <select
                        value={adjustType}
                        onChange={(e: any) => setAdjustType(e.target.value)}
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="add">CREDIT / DEPOSIT (+)</option>
                        <option value="deduct">DECHARGE / WITHDRAW (-)</option>
                        <option value="set">SET EXACT TOTAL (=)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1.5">Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="100.00"
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={adjustLoading}
                        className="w-full py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer h-9 leading-none"
                      >
                        {adjustLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Update Balance</span>
                      </button>
                    </div>

                    <div className="md:col-span-4">
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1.5">Adjustment Audit Note</label>
                      <input
                        type="text"
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="Compensation payout / adjustment token #1092"
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                      />
                    </div>
                  </form>

                  {adjustStatus?.error && (
                    <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs">{adjustStatus.error}</div>
                  )}
                  {adjustStatus?.success && (
                    <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs">{adjustStatus.success}</div>
                  )}
                </div>
              ) : null}

              {selectedCollection === 'transactions' && editFields['status']?.val === 'pending' ? (
                <div className="bg-[#0d1426] border border-white/[0.06] p-5 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span>Pending Wire Transfer Decision</span>
                    </h3>
                    <p className="text-white/40 text-[11px] mt-1">
                      User is requesting a <b>{editFields['type']?.val}</b> of <b>${Number(editFields['amount']?.val).toFixed(2)}</b>. Approve to credit user account, or decline with feedback.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1.5">Verification Clearance Memo</label>
                      <input
                        type="text"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Input clearance transaction number or rejection statement reason..."
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleTxAction('reject')}
                        disabled={txActionLoading}
                        className="flex-1 py-3 border border-loss/30 text-loss hover:bg-loss hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                      >
                        <X className="w-4 h-4" />
                        <span>Decline request</span>
                      </button>

                      <button
                        onClick={() => handleTxAction('approve')}
                        disabled={txActionLoading}
                        className="flex-1 py-3 bg-gain text-[#080c18] hover:bg-gain/90 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                      >
                        <Check className="w-4 h-4" />
                        <span>Clear & Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* FIRESTORE FIELDS EDITING TABLE */}
              <div className="bg-[#0d1426] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                <div className="h-11 px-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                  <span className="text-xs font-bold text-white tracking-wide uppercase">Fields Key-Value List</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddField(!showAddField)}
                      className="text-white/60 hover:text-white text-xs font-semibold px-2 py-1 rounded hover:bg-white/5 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>

                {/* Add Field Panel */}
                {showAddField && (
                  <div className="p-4 bg-white/[0.01] border-b border-white/[0.05] grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Key Name</label>
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="field_name"
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Type</label>
                      <select
                        value={newFieldType}
                        onChange={(e: any) => setNewFieldType(e.target.value)}
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Initial Value</label>
                      <input
                        type="text"
                        value={newFieldVal}
                        onChange={(e) => setNewFieldVal(e.target.value)}
                        placeholder="value"
                        className="w-full bg-[#060912] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <button
                        onClick={handleAddField}
                        className="w-full py-1.5 bg-accent text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                )}

                {/* Fields List */}
                <div className="divide-y divide-white/[0.04]">
                  {Object.entries(editFields).length === 0 ? (
                    <div className="p-8 text-center text-white/30 italic text-xs">No fields found. Add a field above.</div>
                  ) : (
                    Object.entries(editFields).map(([key, rawItem]) => {
                      const item = rawItem as { val: any; type: 'string' | 'number' | 'boolean' };
                      return (
                        <div key={key} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8 flex-1">
                            {/* Key title */}
                            <span className="text-white font-bold select-text w-48 shrink-0">{key}</span>
                            
                            {/* Type indicator */}
                            <span className="text-accent text-[10px] w-20 shrink-0 font-sans uppercase font-bold tracking-wider">
                              ({item.type})
                            </span>

                          {/* Value Input */}
                          <div className="flex-1 min-w-0">
                            {item.type === 'boolean' ? (
                              <select
                                value={String(item.val)}
                                onChange={(e) => {
                                  const updated = { ...editFields };
                                  updated[key].val = e.target.value === 'true';
                                  setEditFields(updated);
                                }}
                                className="bg-[#060912] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white"
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input
                                type={item.type === 'number' ? 'number' : 'text'}
                                value={item.val}
                                onChange={(e) => {
                                  const updated = { ...editFields };
                                  updated[key].val = e.target.value;
                                  setEditFields(updated);
                                }}
                                className="w-full max-w-md bg-[#060912] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                              />
                            )}
                          </div>
                        </div>

                        {/* Row action delete field */}
                        <div className="shrink-0 flex items-center justify-end">
                          <button
                            onClick={() => handleRemoveField(key)}
                            className="text-white/30 hover:text-loss transition p-1 hover:bg-white/5 rounded-md cursor-pointer"
                            title="Remove field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Save actions */}
                <div className="p-4 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-white/40 text-[10px]">
                    {saveStatus && <span className="font-semibold text-accent">{saveStatus}</span>}
                  </div>
                  <button
                    onClick={handleSaveDoc}
                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer leading-none"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Document</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
