import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  BarChart2, 
  Wallet, 
  PieChart, 
  UserCircle, 
  LogOut,
  Users,
  CreditCard,
  ChevronRight,
  Database
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface SidebarProps {
  isAdminView?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isAdminView = false, isOpen = false, onClose }: SidebarProps) {
  const { currentUser, userDoc, signOutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingTxsCount, setPendingTxsCount] = useState<number>(0);

  // Monitor pending transactions count for admin badge
  useEffect(() => {
    if (!currentUser || userDoc?.role !== 'admin') return;

    const q = query(
      collection(db, 'transactions'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingTxsCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching transactions badge in sidebar:", error);
    });

    return unsubscribe;
  }, [currentUser, userDoc]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate('/login');
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const getInitials = () => {
    if (!currentUser?.displayName) return 'TI';
    return currentUser.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  }

  // Nav definitions
  const investorNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/markets', label: 'Markets', icon: BarChart2 },
    { path: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { path: '/dashboard/portfolio', label: 'Portfolio', icon: PieChart },
    { path: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  ];

  const adminNavItems: NavItem[] = [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    { 
      path: '/admin/transactions', 
      label: 'Transactions', 
      icon: CreditCard,
      badge: pendingTxsCount > 0 ? pendingTxsCount : undefined
    },
  ];

  const currentNavItems = isAdminView ? adminNavItems : investorNavItems;

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#080c18]/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside 
        id="dashboard-sidebar" 
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-navy-sidebar border-r border-white/[0.07] flex flex-col h-screen select-none transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shrink-0`}
      >
        {/* Brand logo container */}
        <div className="h-16 px-6 border-b border-white/[0.07] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png" 
              alt="Tesla Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-white font-medium text-sm tracking-tight block">Tesla Stock Investment</span>
              <span className="text-white/30 text-[9px] tracking-wider uppercase block"></span>
            </div>
          </div>

          {/* Close button on mobile view */}
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
              aria-label="Close menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav Menu items */}
        <div className="flex-1 py-6 overflow-y-auto space-y-1">
          {isAdminView && (
            <div className="text-[10px] tracking-[0.2em] text-accent font-medium uppercase px-6 mb-4 opacity-75">
              Admin Suite
            </div>
          )}

          <nav className="space-y-1 px-3">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              
              // Custom isActive logic because of index route on /dashboard and /admin
              const isActive = item.path === '/dashboard' || item.path === '/admin'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition font-sans ${
                    isActive 
                      ? 'bg-accent/10 text-accent font-medium' 
                      : 'text-white/50 hover:text-white hover:bg-navy-raised'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-loss text-white text-[10px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

      {/* User info & Logout row */}
      <div className="p-4 border-t border-white/[0.07] bg-navy-sidebar/60 space-y-3">
        <div className="flex items-center gap-3 px-2">
          {currentUser?.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName || "User"} 
              className="w-9 h-9 rounded-full border border-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <img 
              src="https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png" 
              alt="Logo" 
              className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-white text-xs font-medium block truncate">
              {currentUser?.displayName || 'Investor'}
            </span>
            <span className="text-white/30 text-[10px] block truncate">
              {isAdminView ? 'Site Administrator' : 'Standard Account'}
            </span>
          </div>
        </div>

        <NavLink
          to="/db-admin"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition group cursor-pointer"
        >
          <Database className="w-4 h-4 text-white/30 group-hover:text-accent transition" />
          <span>DB Console</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-loss/15 transition group cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-white/30 group-hover:text-loss transition" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
