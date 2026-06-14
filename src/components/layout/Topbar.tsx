import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../lib/firestore';
import { Wallet, Shield, Menu } from 'lucide-react';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { currentUser, userDoc } = useAuth();
  const { balance } = useBalance(currentUser?.uid);
  const location = useLocation();

  // Derive title from pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/dashboard/markets')) return 'Markets';
    if (path === '/dashboard/wallet') return 'Wallet & Cash';
    if (path === '/dashboard/portfolio') return 'Portfolio';
    if (path === '/dashboard/profile') return 'Profile Details';
    if (path === '/admin') return 'Admin Overview';
    if (path === '/admin/users') return 'Admin User Records';
    if (path.startsWith('/admin/users/')) return 'Admin User Inspect';
    if (path === '/admin/transactions') return 'Admin Transactions Board';
    return 'Tesla Stock Investment';
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

  return (
    <header id="dashboard-topbar" className="h-16 bg-navy-card/85 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shrink-0">
      {/* Title with Mobile Menu Toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <img src="https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png" alt="Logo" className="w-7 h-7 rounded-sm object-contain mr-1 hidden sm:block" referrerPolicy="no-referrer" />
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-white/75 hover:text-white hover:bg-white/5 rounded-xl md:hidden transition cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-white font-medium text-xs sm:text-sm tracking-tight truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Admin Link if role is admin */}
        {userDoc?.role === 'admin' && (
          <Link 
            to={location.pathname.startsWith('/admin') ? '/dashboard' : '/admin'}
            className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider bg-accent/20 hover:bg-accent/35 text-accent border border-accent/20 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 transition"
          >
            <Shield className="w-3 h-3" />
            <span className="hidden sm:inline">{location.pathname.startsWith('/admin') ? 'Investor View' : 'Admin Panel'}</span>
            <span className="sm:hidden">{location.pathname.startsWith('/admin') ? 'Investor' : 'Admin'}</span>
          </Link>
        )}

        {/* Balance Pill */}
        <div className="bg-navy-raised border border-white/[0.07] rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs text-white/90 flex items-center gap-1 sm:gap-2 font-medium shadow-inner">
          <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent shrink-0" />
          <span className="text-white/50 hidden sm:inline">Cash:</span>
          <span className="num text-white">
            ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* User initials / avatar */}
        <Link to="/dashboard/profile" className="focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-full shrink-0">
          {currentUser?.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-white/10 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <img 
              src="https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png" 
              alt="Logo" 
              className="w-8 h-8 rounded-full border border-white/10 object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </Link>
      </div>
    </header>
  );
}
