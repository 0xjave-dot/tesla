import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../lib/firestore';
import { updatePassword, updateProfile, AuthError } from 'firebase/auth';
import { Info, User, Mail, Globe, Lock, Loader2, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

export default function Profile() {
  const { currentUser, userDoc, refreshUserData } = useAuth();

  // Contact info form
  const [name, setName] = useState(currentUser?.displayName || userDoc?.name || '');
  const [country, setCountry] = useState(userDoc?.country || '');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactSuccess(null);
    setContactError(null);

    if (!name.trim()) {
      setContactError('Full name cannot be empty.');
      setContactLoading(false);
      return;
    }

    try {
      if (currentUser) {
        // Update Firestore
        await updateUserProfile(currentUser.uid, { country });
        await refreshUserData();
        setContactSuccess('Identity settings saved successfully!');
      }
    } catch (err: any) {
      setContactError(err.message || 'An error occurred while saving profile info.');
    } finally {
      setContactLoading(false);
    }
  };

  // Change password forms
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const translateAuthError = (err: AuthError): string => {
    if (err.code === 'auth/requires-recent-login') {
      return 'Security credentials stale. Please log out and sign in again to alter credentials.';
    }
    if (err.code === 'auth/weak-password') {
      return 'Password too weak. Must be at least 6 characters.';
    }
    return err.message || 'Unexpected failure altering password credentials.';
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (!currentUser) return;
    setPasswordLoading(true);

    try {
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess('Password security configurations updated successfully!');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.warn("Failed updating credentials:", err);
      setPasswordError(translateAuthError(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* INTRO IDENTIFICATION HEADER */}
      <section className="bg-navy-card border border-white/[0.07] p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-5 shadow-lg">
        {currentUser?.photoURL ? (
          <img 
            src={currentUser.photoURL} 
            alt="Avatar" 
            className="w-16 h-16 rounded-full border-2 border-accent object-cover shrink-0 shadow-lg shadow-accent/10"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent/20 text-accent font-bold text-xl flex items-center justify-center shrink-0">
            {currentUser?.displayName?.[0] || 'U'}
          </div>
        )}

        <div className="text-center sm:text-left min-w-0 flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h3 className="text-xl font-semibold text-white truncate">{currentUser?.displayName || 'Trading Investor'}</h3>
            {userDoc?.role === 'admin' && (
              <span className="text-[9px] uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/15 rounded px-2 py-0.5 font-bold animate-pulse">
                Admin Privilege
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 block mt-1 truncate">{currentUser?.email}</p>
          <span className="text-[10px] text-white/30 block mt-0.5">
            Registered: {currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </section>

      {/* CORE FORM ROWS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* CONTACT SETTINGS CARD */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl space-y-5">
          <h4 className="text-white text-sm font-semibold tracking-tight pb-3 border-b border-white/[0.05]">
            Account settings details
          </h4>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            {/* Name (Readonly) */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/30 tracking-wider pl-0.5 mb-2 flex items-center gap-1 select-none">
                <User className="w-3.5 h-3.5 text-white/20" />
                <span>Legal Full Name (Stationary)</span>
              </label>
              <input
                type="text"
                disabled
                value={name}
                className="w-full bg-navy-base/60 border border-white/[0.03] text-white/35 rounded-xl px-4 py-3 text-xs font-medium cursor-not-allowed select-all"
              />
            </div>

            {/* Email (Readonly) */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/30 tracking-wider pl-0.5 mb-2 flex items-center gap-1 select-none">
                <Mail className="w-3.5 h-3.5 text-white/20" />
                <span>Email Address (Stationary)</span>
              </label>
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="w-full bg-navy-base/60 border border-white/[0.03] text-white/35 rounded-xl px-4 py-3 text-xs font-medium cursor-not-allowed select-all"
              />
            </div>

            {/* Country */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>Domicile Country</span>
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => { setCountry(e.target.value); setContactError(null); }}
                placeholder="Country name"
                className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white placeholder-white/35 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Diagnostics warnings */}
            {contactError && (
              <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                {contactError}
              </div>
            )}

            {contactSuccess && (
              <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed">
                {contactSuccess}
              </div>
            )}

            {/* CTA action */}
            <button
              type="submit"
              disabled={contactLoading}
              className="bg-accent text-white hover:bg-accent/90 py-3 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow shadow-accent/15"
            >
              {contactLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Contact Profile</span>
            </button>
          </form>
        </div>

        {/* SECURITY PASSWORD CHANGE CARD */}
        <div className="card p-6 bg-navy-card border border-white/[0.07] rounded-3xl space-y-5">
          <h4 className="text-white text-sm font-semibold tracking-tight pb-3 border-b border-white/[0.05]">
            Password Credential Reset
          </h4>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Password */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>New Password</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                placeholder="Minimum 8 characters"
                className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-accent"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider pl-0.5 mb-2 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>Confirm New Password</span>
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(null); }}
                placeholder="Confirm password"
                className="w-full bg-navy-sidebar border border-white/[0.1] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-accent"
              />
            </div>

            {/* Security disclaimer for password changing */}
            <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-2xl p-4 text-xs text-white/55 flex items-start gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Applying password modifications triggers state invalidation on server keyrings. For security mandates, if your sign-in period was more than 10 minutes ago, please sign out and sign in again before submitting a reset.
              </p>
            </div>

            {/* Diagnostic messaging */}
            {passwordError && (
              <div className="p-3 bg-loss/10 border border-loss/20 text-loss rounded-xl text-xs font-semibold leading-relaxed">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-gain/10 border border-gain/20 text-gain rounded-xl text-xs font-semibold leading-relaxed">
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-navy-raised text-white hover:bg-navy-raised/80 border border-white/[0.1] py-3 px-6 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow"
            >
              {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Reset Credentials Code</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
