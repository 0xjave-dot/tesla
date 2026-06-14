export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  country: string;
  role: UserRole;
  createdAt: any;
}

export interface UserBalance {
  available: number;
  locked: number;
  total: number;
  updatedAt: any;
}

export type AssetType = 'stock' | 'crypto';

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  priceSource: 'finnhub' | 'live-api' | 'simulated';
  currentPrice: number;
  change24h: number;
  updatedAt: any;
}

export interface Holding {
  symbol: string;
  units: number;
  avgBuyPrice: number;
  updatedAt: any;
}

export type TransactionType = 'deposit' | 'withdrawal';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  note: string;
  method?: string;
  adminNote?: string;
  createdAt: any;
}

export type OrderSide = 'buy' | 'sell';

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  units: number;
  price: number;
  total: number;
  createdAt: any;
}
