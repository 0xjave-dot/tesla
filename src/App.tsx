import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import Wallet from './pages/Wallet';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminTransactions from './pages/admin/AdminTransactions';

// Protective Wrapper for authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Protective Wrapper for administrators
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userDoc, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userDoc?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Protective Wrapper for public guests (redirects authed users to dashboard)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Investor Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="markets" element={<Markets />} />
        <Route path="markets/:symbol" element={<MarketDetail />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin Panel */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:uid" element={<AdminUserDetail />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
