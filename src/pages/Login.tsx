import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { ensureUserDoc } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firestore error code mappings
  const translateAuthError = (err: AuthError): string => {
    switch (err.code) {
      case 'auth/invalid-email':
        return 'Please input a valid email address.';
      case 'auth/wrong-password':
        return 'The password you entered is incorrect.';
      case 'auth/user-not-found':
        return 'No account registered with this email.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please verify your email and password.';
      default:
        return err.message || 'An unexpected error occurred during login.';
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Email login failed", err);
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserDoc(result.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google login failed", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(translateAuthError(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#F8F9FC]">
      {/* LEFT COLUMN (Hidden on mobile) */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[#080c18] relative px-12 overflow-hidden select-none">
        {/* Radial Indigo Accent overlay */}
        <div className="absolute inset-0 z-0 opacity-80" style={{
          background: 'radial-gradient(circle at 60% 40%, rgba(59,123,255,0.22) 0%, transparent 68%)'
        }} />

        {/* Abstract Glowing Orb */}
        <div className="w-72 h-72 rounded-full bg-accent/8 blur-3xl absolute z-0" />

        <div className="z-10 max-w-sm space-y-8 text-center flex flex-col items-center">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png"
              alt="Logo"
              className="w-10 h-10 rounded-full bg-white/10 p-1 object-contain shadow-lg shadow-accent/20"
              referrerPolicy="no-referrer"
            />
            <span className="text-white text-2xl font-medium tracking-tight">Tesla Stock Investment</span>
          </div>

          <p className="text-white/50 text-sm max-w-[240px] leading-relaxed">
            Trade with live market data. Seamless execution, modern experience.
          </p>

          {/* Core checkpoints */}
          <div className="space-y-3.5 text-left pt-6">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-accent shrink-0" />
              <span className="text-white/60 text-xs font-medium">Lightning fast transaction processing.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-accent shrink-0" />
              <span className="text-white/60 text-xs font-medium">Tight security.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-accent shrink-0" />
              <span className="text-white/60 text-xs font-medium">24/7 support.</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col items-center justify-center px-6 md:px-12 py-10 bg-[#F8F9FC]">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Header titles */}
          <div className="text-center">
            <h3 className="text-2xl font-medium tracking-tight text-gray-950 mb-1">
              Welcome back
            </h3>
            <p className="text-gray-500 text-sm">
              Sign in to your account
            </p>
          </div>

          {/* Google Sign In button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-full py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : (
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider phrase */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">or email</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Sign In Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Field */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-0.5">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200/90 rounded-lg px-4 py-2.5 text-xs text-gray-950 bg-white placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-0.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full border border-gray-200/90 rounded-lg pl-4 pr-10 py-2.5 text-xs text-gray-950 bg-white placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error messaging */}
            {error && (
              <div className="p-3 bg-red-400/10 border border-red-500/20 text-[#ef4444] rounded-lg text-xs font-semibold leading-relaxed animate-shake">
                {error}
              </div>
            )}

            {/* Submit btn */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full btn-primary py-3 transition shadow-md shadow-accent/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>

          {/* Form redirection footer */}
          <p className="text-center text-xs text-gray-500 pt-2 font-medium">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-accent hover:underline font-semibold">
              Create one &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
