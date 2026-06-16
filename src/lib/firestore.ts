import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  UserProfile, 
  UserBalance, 
  Asset, 
  Holding, 
  Transaction, 
  Order 
} from '../types';

// Operation Types for Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// TRANSACTION & ACTION UTILITIES
// ----------------------------------------------------

/**
 * Places a buy order inside a Firestore Transaction
 */
export async function placeBuyOrder(uid: string, symbol: string, units: number, currentPrice: number) {
  const totalCost = units * currentPrice;
  const balanceRef = doc(db, 'balances', uid);
  const holdingRef = doc(db, 'holdings', uid, 'assets', symbol);
  const orderRef = doc(collection(db, 'orders'));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Check user has enough balance
      const balanceDoc = await transaction.get(balanceRef);
      if (!balanceDoc.exists()) {
        throw new Error('Balance account does not exist.');
      }
      const balanceData = balanceDoc.data() as UserBalance;
      if (balanceData.available < totalCost) {
        throw new Error(`Insufficient available balance. Required: $${totalCost.toFixed(2)}, Available: $${balanceData.available.toFixed(2)}`);
      }

      // 2. Fetch or create holding and update units & avgBuyPrice
      const holdingDoc = await transaction.get(holdingRef);
      let newUnits = units;
      let newAvgBuyPrice = currentPrice;

      if (holdingDoc.exists()) {
        const holdingData = holdingDoc.data() as Holding;
        newUnits = holdingData.units + units;
        // Weighted average formula
        newAvgBuyPrice = ((holdingData.units * holdingData.avgBuyPrice) + totalCost) / newUnits;
      }

      // 3. Write updates
      transaction.update(balanceRef, {
        available: increment(-totalCost),
        updatedAt: serverTimestamp()
      });

      transaction.set(holdingRef, {
        symbol,
        units: newUnits,
        avgBuyPrice: newAvgBuyPrice,
        updatedAt: serverTimestamp()
      });

      transaction.set(orderRef, {
        id: orderRef.id,
        userId: uid,
        symbol,
        side: 'buy',
        units,
        price: currentPrice,
        total: totalCost,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderRef.id}`);
  }
}

/**
 * Places a sell order inside a Firestore Transaction
 */
export async function placeSellOrder(uid: string, symbol: string, units: number, currentPrice: number) {
  const totalCredit = units * currentPrice;
  const balanceRef = doc(db, 'balances', uid);
  const holdingRef = doc(db, 'holdings', uid, 'assets', symbol);
  const orderRef = doc(collection(db, 'orders'));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify user holding exists and holds enough units
      const holdingDoc = await transaction.get(holdingRef);
      if (!holdingDoc.exists()) {
        throw new Error("You do not own any units of this asset.");
      }
      const holdingData = holdingDoc.data() as Holding;
      if (holdingData.units < units) {
        throw new Error(`Insufficient units to sell. Required: ${units}, Available: ${holdingData.units}`);
      }

      const remainingUnits = holdingData.units - units;

      // 2. Write updates
      transaction.update(balanceRef, {
        available: increment(totalCredit),
        updatedAt: serverTimestamp()
      });

      if (remainingUnits <= 0.0000001) {
        transaction.delete(holdingRef);
      } else {
        transaction.update(holdingRef, {
          units: remainingUnits,
          updatedAt: serverTimestamp()
        });
      }

      transaction.set(orderRef, {
        id: orderRef.id,
        userId: uid,
        symbol,
        side: 'sell',
        units,
        price: currentPrice,
        total: totalCredit,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderRef.id}`);
  }
}

/**
 * Creates a deposit request pending admin approval. Funds are NOT credited until approved.
 */
export async function createDepositRequest(uid: string, userName: string, amount: number, note: string, method: string = 'wire') {
  const txRef = doc(collection(db, 'transactions'));

  try {
    await setDoc(txRef, {
      id: txRef.id,
      userId: uid,
      userName,
      type: 'deposit',
      amount,
      status: 'pending',
      note,
      method,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txRef.id}`);
  }
}

/**
 * Creates a withdrawal request pending admin approval. Funds are locked until approved.
 */
export async function createWithdrawalRequest(uid: string, userName: string, amount: number, note: string) {
  const balanceRef = doc(db, 'balances', uid);
  const txRef = doc(collection(db, 'transactions'));

  try {
    await runTransaction(db, async (transaction) => {
      const balanceDoc = await transaction.get(balanceRef);
      if (!balanceDoc.exists()) {
        throw new Error('Balance account does not exist.');
      }
      const balanceData = balanceDoc.data() as UserBalance;
      if (balanceData.available < amount) {
        throw new Error(`Insufficient funds for withdrawal. Requested: $${amount.toFixed(2)}, Available: $${balanceData.available.toFixed(2)}`);
      }

      // Lock funds: move from available to locked until admin approves
      transaction.update(balanceRef, {
        available: increment(-amount),
        locked: increment(amount),
        updatedAt: serverTimestamp()
      });

      transaction.set(txRef, {
        id: txRef.id,
        userId: uid,
        userName,
        type: 'withdrawal',
        amount,
        status: 'pending',
        note,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txRef.id}`);
  }
}

/**
 * Admin action to approve deposit or withdrawal
 */
export async function adminApproveTransaction(txId: string, adminNote: string) {
  const txRef = doc(db, 'transactions', txId);

  try {
    await runTransaction(db, async (transaction) => {
      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists()) {
        throw new Error('Transaction not found.');
      }
      const txData = txDoc.data() as Transaction;
      if (txData.status !== 'pending') {
        throw new Error('Transaction is already processed.');
      }

      const balanceRef = doc(db, 'balances', txData.userId);

      if (txData.type === 'deposit') {
        // Add to available, add to total deposited
        transaction.update(balanceRef, {
          available: increment(txData.amount),
          total: increment(txData.amount),
          updatedAt: serverTimestamp()
        });
      } else if (txData.type === 'withdrawal') {
        // Release from locked, subtract from total deposited
        transaction.update(balanceRef, {
          locked: increment(-txData.amount),
          total: increment(-txData.amount),
          updatedAt: serverTimestamp()
        });
      }

      // Mark transaction approved
      transaction.update(txRef, {
        status: 'approved',
        adminNote,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txId}`);
  }
}

/**
 * Admin action to reject deposit or withdrawal
 */
export async function adminRejectTransaction(txId: string, adminNote: string) {
  const txRef = doc(db, 'transactions', txId);

  try {
    await runTransaction(db, async (transaction) => {
      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists()) {
        throw new Error('Transaction not found.');
      }
      const txData = txDoc.data() as Transaction;
      if (txData.status !== 'pending') {
        throw new Error('Transaction is already processed.');
      }

      const balanceRef = doc(db, 'balances', txData.userId);

      if (txData.type === 'withdrawal') {
        // Unlock funds: return from locked back to available
        transaction.update(balanceRef, {
          available: increment(txData.amount),
          locked: increment(-txData.amount),
          updatedAt: serverTimestamp()
        });
      }

      // Mark transaction rejected
      transaction.update(txRef, {
        status: 'rejected',
        adminNote,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txId}`);
  }
}

/**
 * Updates a user profile
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}


// ----------------------------------------------------
// DYNAMIC LIVE SUBSCRIPTION HOOKS
// ----------------------------------------------------

/**
 * Sync user balance real-time
 */
export function useBalance(uid: string | undefined) {
  const [balance, setBalance] = useState<UserBalance>({ available: 0, locked: 0, total: 0, updatedAt: null });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const path = `balances/${uid}`;
    const unsubscribe = onSnapshot(doc(db, 'balances', uid), (snapshot) => {
      if (snapshot.exists()) {
        setBalance(snapshot.data() as UserBalance);
      } else {
        setBalance({ available: 0, locked: 0, total: 0, updatedAt: null });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [uid]);

  return { balance, loading };
}

/**
 * Sync active trade assets real-time
 */
export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, Asset>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const path = 'assets';
    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const items: Asset[] = [];
      const map: Record<string, Asset> = {};

      snapshot.forEach((doc) => {
        const item = doc.data() as Asset;
        items.push(item);
        map[item.symbol] = item;
      });

      setAssets(items);
      setPriceMap(map);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching assets:', error);
      setAssets([]);
      setPriceMap({});
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { assets, priceMap, loading };
}

/**
 * Sync holdings for user real-time
 */
export function useHoldings(uid: string | undefined) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const path = `holdings/${uid}/assets`;
    const unsubscribe = onSnapshot(collection(db, 'holdings', uid, 'assets'), (snapshot) => {
      const items: Holding[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Holding);
      });
      setHoldings(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [uid]);

  return { holdings, loading };
}

/**
 * Sync transactions for user real-time
 */
export function useTransactions(uid: string | undefined, limitNum: number = 50) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitNum)
    );

    const path = 'transactions';
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Transaction);
      });
      setTransactions(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [uid, limitNum]);

  return { transactions, loading };
}
