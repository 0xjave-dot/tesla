import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { EmptyState } from '../../components/common/Helpers';
import { Users, Search, Loader2, ArrowRight, ShieldCheck, Globe, Mail } from 'lucide-react';
import { UserProfile, UserBalance } from '../../types';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [balances, setBalances] = useState<Record<string, UserBalance>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Subscribe to users collection
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as UserProfile);
      });
      setUsers(list);
    }, (error) => {
      console.error("Failed querying platform users:", error);
    });

    return unsubUsers;
  }, []);

  // Subscribe to balances collection
  useEffect(() => {
    const unsubBalances = onSnapshot(collection(db, 'balances'), (snapshot) => {
      const map: Record<string, UserBalance> = {};
      snapshot.forEach((doc) => {
        map[doc.id] = doc.data() as UserBalance;
      });
      setBalances(map);
      setLoading(false);
    }, (error) => {
      console.error("Failed querying balances index:", error);
      setLoading(false);
    });

    return unsubBalances;
  }, []);

  // Combine user models and balances
  const userListCombined = useMemo(() => {
    return users.map((user) => {
      const uBal = balances[user.uid] || { available: 0, locked: 0, total: 0, updatedAt: null };
      return {
        ...user,
        available: uBal.available,
        locked: uBal.locked
      };
    });
  }, [users, balances]);

  // Search filter
  const filteredUsers = useMemo(() => {
    return userListCombined.filter((u) => {
      const nameMatch = (u.name || '').toLowerCase().includes(search.toLowerCase());
      const emailMatch = (u.email || '').toLowerCase().includes(search.toLowerCase());
      const countryMatch = (u.country || '').toLowerCase().includes(search.toLowerCase());
      return nameMatch || emailMatch || countryMatch;
    });
  }, [userListCombined, search]);

  return (
    <div className="space-y-8 select-none">
      {/* HEADER COLUMN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-medium tracking-tight text-white">Platform Users Directory</h2>
          </div>
          <p className="text-white/45 text-sm mt-1">
            Displaying profiles and relative asset bankroll statistics for all clients.
          </p>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, email..."
            className="bg-navy-card border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all w-full sm:w-64"
          />
        </div>
      </div>

      {/* COMPACT DIRECTORY TABLES FRAME */}
      {loading ? (
        <div className="p-12 text-center bg-navy-card border border-white/[0.07] rounded-3xl">
          <Loader2 className="animate-spin text-accent w-8 h-8 mx-auto" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState 
          message="No matching investor records found." 
          submessage="Try altering your search coordinates name strings." 
        />
      ) : (
        <div className="card overflow-hidden bg-navy-card border border-white/[0.07] rounded-3xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="border-b border-white/[0.07] bg-white/[0.01]/40 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Client Identity</th>
                  <th className="px-6 py-4">Contact Coordinate</th>
                  <th className="px-6 py-4">Domicile</th>
                  <th className="px-6 py-4">Trading Cash</th>
                  <th className="px-6 py-4">Reserved Escrow</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.uid}
                    onClick={() => navigate(`/admin/users/${user.uid}`)}
                    className="hover:bg-white/[0.01] transition-all cursor-pointer group"
                  >
                    {/* Identity Details */}
                    <td className="px-6 py-4 flex items-center gap-3">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.name || "User"} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-accent/25 text-accent font-semibold flex items-center justify-center text-xs shrink-0 border border-accent/10">
                          {(user.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-xs block group-hover:text-accent transition">
                            {user.name || 'Trading Account'}
                          </span>
                          {user.role === 'admin' && (
                            <span className="text-[7px] uppercase bg-red-500/10 text-red-400 border border-red-500/15 rounded px-1.5 py-0.5 font-bold shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-white/30 block mt-0.5">ID: {user.uid.slice(0, 8)}</span>
                      </div>
                    </td>

                    {/* Email Contact */}
                    <td className="px-6 py-4 text-white/55">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-white/20 shrink-0" />
                        <span className="truncate max-w-[160px]">{user.email}</span>
                      </div>
                    </td>

                    {/* Domicile Country */}
                    <td className="px-6 py-4 text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-white/20 shrink-0" />
                        <span>{user.country || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Balance cash */}
                    <td className="px-6 py-4 num text-white font-medium">
                      ${user.available?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>

                    {/* Escrow lock */}
                    <td className="px-6 py-4 num text-yellow-400 font-medium">
                      ${user.locked?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>

                    {/* Actions button trigger */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/users/${user.uid}`);
                        }}
                        className="bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white border border-accent/15 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
