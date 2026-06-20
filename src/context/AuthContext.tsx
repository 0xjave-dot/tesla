import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Asset } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userDoc: UserProfile | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  ensureUserDoc: (user: FirebaseUser, additionalData?: { country?: string; name?: string }) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to ensure user document & balance document exists in Firestore
  const ensureUserDoc = async (user: FirebaseUser, additionalData?: { country?: string; name?: string }): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let profile: UserProfile;
    let isNewUser = false;

    if (!userSnap.exists()) {
      isNewUser = true;
      // Create new profile
      profile = {
        uid: user.uid,
        name: additionalData?.name || user.displayName || 'Investor',
        email: user.email || '',
        photoURL: user.photoURL || '',
        country: additionalData?.country || 'Global',
        role: 'user', // default role
        createdAt: new Date(),
      };
      
      // Save User Doc
      await setDoc(userRef, {
        ...profile,
        createdAt: serverTimestamp(),
      });

      // Initialize Balance Doc with no predefined funds.
      const balanceRef = doc(db, 'balances', user.uid);
      const balanceSnap = await getDoc(balanceRef);
      if (!balanceSnap.exists()) {
        await setDoc(balanceRef, {
          available: 0,
          locked: 0,
          total: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const data = userSnap.data();
      profile = {
        uid: data.uid || user.uid,
        name: data.name || user.displayName || 'Investor',
        email: data.email || user.email || '',
        photoURL: data.photoURL || user.photoURL || '',
        country: data.country || 'Global',
        role: data.role || 'user',
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }

    return profile;
  };

  // Seed assets collection with initial assets (stocks and crypto)
  const seedAssets = async () => {
    try {
      const assetsRef = collection(db, 'assets');
      const assetsSnap = await getDocs(assetsRef);
      
      // Only seed if collection is empty
      if (assetsSnap.empty) {
        const SEED_ASSETS: Omit<Asset, 'currentPrice' | 'change24h' | 'priceSource' | 'updatedAt'>[] = [
          { symbol: 'TSLA', name: 'Tesla Motor, Inc.', type: 'stock' },
          { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
          { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
          { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock' },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
          { symbol: 'NVDA', name: 'Nvidia Corp.', type: 'stock' },
          { symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock' },
          { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock' },
          { symbol: 'SPLG', name: 'SPDR Portfolio S&P 1500 Composite Stock Market ETF', type: 'stock' },
          { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
          { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
          { symbol: 'SOL', name: 'Solana', type: 'crypto' },
          { symbol: 'XRP', name: 'XRP', type: 'crypto' },
          { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
          { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto' },
          { symbol: 'LINK', name: 'Chainlink', type: 'crypto' }
        ];

        // Seed each asset with dummy price data
        for (const asset of SEED_ASSETS) {
          await setDoc(doc(assetsRef, asset.symbol), {
            ...asset,
            currentPrice: 0,
            change24h: 0,
            priceSource: 'demo',
            createdAt: serverTimestamp(),
          });
        }
        console.log('Assets collection seeded with initial data');
      }
    } catch (err) {
      console.error('Error seeding assets:', err);
    }
  };

  // Seed assets on app mount
  useEffect(() => {
    // Seeding disabled - using demo assets in useAssets hook instead
    // seedAssets();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureUserDoc(user);
          setUserDoc(profile);
        } catch (err) {
          console.error("Error setting up user profile in auth observer:", err);
          setUserDoc(null);
        }
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOutUser = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setUserDoc(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userDoc, loading, signOutUser, ensureUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
