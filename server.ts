import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Enable CORS for local testing/development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to load project ID from firebase-applet-config.json
function getFirebaseProjectId(): string {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.projectId || 'mineral-ground-rcf5x';
    }
  } catch (err) {
    console.warn("Failed to read firebase-applet-config.json", err);
  }
  return 'mineral-ground-rcf5x';
}

// Helper to find a service account file in the root directory
function getAutoDetectedServiceAccount(): string | null {
  try {
    const files = fs.readdirSync(process.cwd());
    const match = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));
    return match ? path.join(process.cwd(), match) : null;
  } catch {
    return null;
  }
}

// API route health checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Configure and initialize Firebase Admin SDK for background updates
let firebaseAdminApp: App | null = null;
let firestoreDb: Firestore | null = null;

function hasFirebaseAdminCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    getAutoDetectedServiceAccount()
  );
}

function getFirestoreAdmin() {
  if (!hasFirebaseAdminCredentials()) {
    console.warn('No Firebase Admin credentials detected. Skipping background Firestore admin initialization.');
    return null;
  }

  if (!firestoreDb) {
    try {
      const apps = getApps();
      if (apps.length === 0) {
        const projectId = getFirebaseProjectId();
        
        const adminCreds = process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        const options: any = { projectId };

        if (adminCreds) {
          try {
            const serviceAccount = JSON.parse(adminCreds);
            options.credential = cert(serviceAccount);
            console.log(`Initializing Firebase Admin with provided JSON credentials for project: ${projectId}`);
          } catch (e) {
            console.warn("FIREBASE_ADMIN_CREDENTIALS found but failed to parse as JSON. Falling back to default.");
          }
        } else if (getAutoDetectedServiceAccount()) {
          const filePath = getAutoDetectedServiceAccount()!;
          console.log(`Initializing Firebase Admin using auto-detected file: ${path.basename(filePath)}`);
          options.credential = cert(filePath);
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          console.log(`Initializing Firebase Admin using file path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        } else {
          console.warn("Using default Firebase Admin initialization (requires environment-level auth).");
        }

        firebaseAdminApp = initializeApp(options);
      } else {
        firebaseAdminApp = apps[0]!;
      }
      firestoreDb = getFirestore(firebaseAdminApp);
    } catch (err) {
      console.warn("Firebase Admin SDK failed to initialize. Background seed task suspended.", err);
      firestoreDb = null;
    }
  }
  return firestoreDb;
}

// 15+ Core assets with stocks and crypto
const SEED_ASSETS = [
  { symbol: 'TSLA', name: 'Tesla Motor, Inc.', type: 'stock', logoUrl: 'https://i.pinimg.com/736x/43/e9/69/43e969979dfd8ae4b364f517571aee58.jpg' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', logoUrl: 'https://cdn-icons-png.flaticon.com/512/0/747.png' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/3840px-Microsoft_logo.svg.png' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock', logoUrl: 'https://cdn.vectorstock.com/i/500p/01/10/amazon-logo-vector-46860110.jpg' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/1280px-Google_Favicon_2025.svg.png' },
  { symbol: 'NVDA', name: 'Nvidia Corp.', type: 'stock', logoUrl: 'https://1000logos.net/wp-content/uploads/2017/05/Color-NVIDIA-Logo.jpg' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock', logoUrl: 'https://cdn.pixabay.com/photo/2021/12/14/22/29/meta-6871457_1280.png' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', logoUrl: 'https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/15844974/netflixlogo.0.0.1466448626.png?quality=90&strip=all&crop=1.2535702951444%2C0%2C97.492859409711%2C100&w=2400' },
  { symbol: 'SPACEX', name: 'SpaceX', type: 'stock', logoUrl: 'https://www.spacex.com/assets/images/share.jpg' }, // SpaceX is a private company, price data might be limited
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { symbol: 'XRP', name: 'XRP', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { symbol: 'LINK', name: 'Chainlink', type: 'crypto', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKQG7VLkgiQhDj-m-jmXN246LOJEtMaLAjEw&s' },
  { symbol: 'APG', name: 'APG Asset Management', type: 'stock', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0PQ8nKW5-CeZ1odHtQdpO-SMZDgMURkJncA&s' },
  { symbol: 'GDM', name: 'Golden Dawn Minerals', type: 'stock', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRCxHKh3rVcPXg8lYXLw7l2uTbnZd9mfhYKg&s' }
];

// Map short symbols to CoinGecko coin IDs
// AND Finnhub specific crypto symbols
const FINNHUB_CRYPTO_MAP: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'LINK': 'BINANCE:LINKUSDT'
};

// Map symbols to CoinGecko IDs for historical data
const COINGECKO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'LINK': 'chainlink'
};

// Background live markets price feeder (run updates every 30 seconds)
async function runBackgroundUpdates() {
  const dbAdmin = getFirestoreAdmin();
  if (!dbAdmin) {
    console.log("Firebase Admin unavailable. Skipping background updates.");
    return;
  }

  console.log("Background Live Market Price syncer active.");

  try {
    const assetsRef = dbAdmin.collection('assets');

    const fetchAllPrices = async () => {
      const prices: Record<string, { price: number; change24h: number }> = {};

      // 1. CRYPTO: CoinGecko simple/price (one call, all coins, free)
      const cryptoAssets = SEED_ASSETS.filter(a => a.type === 'crypto' && COINGECKO_MAP[a.symbol]);
      const coinIds = cryptoAssets.map(a => COINGECKO_MAP[a.symbol]).join(',');
      
      if (cryptoAssets.length > 0) {
        console.log(`Attempting to fetch real-time crypto prices for: ${coinIds}`);
      }

      try {
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json() as any;
          for (const asset of cryptoAssets) {
            const coinId = COINGECKO_MAP[asset.symbol];
            const d = cgData[coinId];
            if (d?.usd) {
              prices[asset.symbol] = { price: d.usd, change24h: parseFloat((d.usd_24h_change || 0).toFixed(2)) };
            }
          }
        }
      } catch (e) { console.warn('CoinGecko simple/price fetch failed:', e); }

      // 2. STOCKS: Finnhub /quote (only for stocks, excluding simulated ones)
      const fhKey = process.env.FINNHUB_API_KEY;
      const stockAssets = SEED_ASSETS.filter(
        a => a.type === 'stock' && !['SPACEX', 'APG', 'GDM'].includes(a.symbol)
      );

      if (fhKey) {
        console.log(`Attempting to fetch real-time stock quotes for ${stockAssets.length} assets via Finnhub.`);
        for (const asset of stockAssets) {
          try {
            const fhRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.symbol}&token=${fhKey}`);
            if (fhRes.ok) {
              const fhData = await fhRes.json() as any;
              if (fhData.c && fhData.c > 0) {
                prices[asset.symbol] = { price: fhData.c, change24h: parseFloat((fhData.dp || 0).toFixed(2)) };
              }
            }
          } catch (e) { console.warn(`Finnhub fetch for ${asset.symbol} failed:`, e); }
          // Delay to stay safely within Finnhub 60/min limit
          await new Promise(r => setTimeout(r, 250));
        }
      } else {
        console.warn("FINNHUB_API_KEY is missing. Stock price updates will be skipped.");
      }
      return prices;
    };

    // Initial Seed
    const snap = await assetsRef.get();
    if (snap.empty) {
      console.log("Assets database is blank. Seeding live market data...");
      const livePrices = await fetchAllPrices();
      const batch = dbAdmin.batch();

      for (const asset of SEED_ASSETS) {
        const live = livePrices[asset.symbol];
        
        // Determine a fallback price if API fails (SpaceX/GDM specific vs default)
        const initialPrice = live ? live.price : (asset.symbol === 'SPACEX' ? 215.50 : (asset.symbol === 'GDM' ? 0.12 : 150.00));
        const initialChange = live ? live.change24h : 0;

        const docRef = assetsRef.doc(asset.symbol);
        batch.set(docRef, {
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          logoUrl: asset.logoUrl,
          currentPrice: initialPrice,
          change24h: initialChange,
          priceSource: live ? 'live-api' : 'initial-seed',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      console.log(`Assets collection seeded with ${SEED_ASSETS.length} assets.`);
    }

    // Interval to fetch LIVE quotes and update Firebase
    setInterval(async () => {
      try {
        const livePrices = await fetchAllPrices();
        const hasLivePrices = Object.keys(livePrices).length > 0;

        const batch = dbAdmin.batch();
        const activeSnap = await assetsRef.get();

        // Update only assets for which live quotes are available
        activeSnap.forEach((doc) => {
          const data = doc.data();
          const symbol: string = data.symbol;
          const live = livePrices[symbol];
          const isSimulatedAsset = ['SPACEX', 'APG', 'GDM'].includes(symbol);

          if (live) {
            const precision = data.type === 'crypto' ? 6 : 2;
            batch.update(doc.ref, {
              currentPrice: parseFloat(live.price.toFixed(precision)),
              change24h: parseFloat(live.change24h.toFixed(2)),
              priceSource: 'live-api',
              updatedAt: FieldValue.serverTimestamp()
            });
          } else if (isSimulatedAsset || !hasLivePrices) {
            // Simulated movement for private assets or when API is unreachable
            const current = data.currentPrice;
            if (current) {
              const volatility = symbol === 'GDM' ? 0.005 : 0.0015;
              const change = current * (Math.random() - 0.485) * volatility;
              const precision = (data.type === 'crypto' || current < 1) ? 6 : 2;
              
              batch.update(doc.ref, {
                currentPrice: parseFloat((current + change).toFixed(precision)),
                priceSource: isSimulatedAsset ? 'simulated' : 'api-fallback',
                updatedAt: FieldValue.serverTimestamp()
              });
            }
          }
          // Otherwise skip update to keep last known price
        });

        await batch.commit();
      } catch (err) {
        console.warn("Background market price update loop failed:", err);
      }
    }, 20000); // 20 seconds interval to stay safely within Finnhub 60/min limit

  } catch (err) {
    console.warn("Background sync process crashed:", err);
  }
}

// REST route to deliver of-the-moment true market analytics and history
app.get('/api/market/history/:symbol', async (req, res) => {
  const symbol = (req.params.symbol || '').toUpperCase();
  const range = (req.query.range || '1D') as string;

  // Let's first search in SEED_ASSETS to verify asset exists
  const assetItem = SEED_ASSETS.find(a => a.symbol === symbol);
  if (!assetItem) {
    return res.status(404).json({ error: 'Asset symbol not found.' });
  }

  const tdKey = process.env.TWELVE_DATA_API_KEY;
  const isCrypto = assetItem.type === 'crypto';

  // 1. If Crypto, try CoinGecko first (highly reliable historical feed)
  if (isCrypto && COINGECKO_MAP[symbol]) {
    const cgKey = process.env.COINGECKO_API_KEY;
    const coinId = COINGECKO_MAP[symbol];
    let days = '1';
    if (range === '1W') days = '7';
    if (range === '1M') days = '30';
    if (range === '1H') days = '1';

    try {
      const gUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      const headersFull: Record<string, string> = {};
      if (cgKey) {
        headersFull['x-cg-api-key'] = cgKey;
      }
      
      const cgRes = await fetch(gUrl, { headers: headersFull });
      if (cgRes.ok) {
        const cgData = await cgRes.json() as any;
        if (cgData.prices && Array.isArray(cgData.prices)) {
          // prices array of [timestamp, value]
          // Filter or sample to reduce load
          let sampled = cgData.prices;
          if (range === '1H') {
            sampled = cgData.prices.slice(-12); // Last 1 hour is minute-by-minute or last 12 points
          } else if (range === '1D') {
            sampled = cgData.prices.filter((_: any, idx: number) => idx % 4 === 0).slice(-24); // 24 points
          } else if (range === '1W') {
            sampled = cgData.prices.filter((_: any, idx: number) => idx % 24 === 0).slice(-14);
          } else {
            sampled = cgData.prices.filter((_: any, idx: number) => idx % 24 === 0).slice(-30);
          }

          const chartOutput = sampled.map((item: any, idx: number) => {
            const dateObj = new Date(item[0]);
            let label = '';
            if (range === '1H') {
              label = `${dateObj.getMinutes()}m ago`;
            } else if (range === '1D') {
              label = `${dateObj.getHours()}:00`;
            } else if (range === '1W') {
              label = `Day ${idx + 1}`;
            } else {
              label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            }
            return {
              time: label,
              price: parseFloat(item[1].toFixed(2))
            };
          });

          return res.json({ source: 'coingecko', data: chartOutput });
        }
      }
    } catch (err) {
      console.warn("CoinGecko market chart fetch failed, falling back to Twelve Data/Simulated:", err);
    }
  }

  // 2. Try Twelve Data time_series (stocks or fallback for crypto)
  if (tdKey) {
    let interval = '1h';
    let outputsize = 24;
    let formatLabel = (dtStr: string, idx: number) => dtStr.split(' ')[1] || dtStr;

    if (range === '1H') {
      interval = '5min';
      outputsize = 12;
      formatLabel = (dtStr: string, idx: number) => `${idx * 5}m ago`;
    } else if (range === '1D') {
      interval = '30min';
      outputsize = 48;
      formatLabel = (dtStr: string, idx: number) => dtStr.split(' ')[1]?.slice(0, 5) || dtStr;
    } else if (range === '1W') {
      interval = '4h';
      outputsize = 42;
      formatLabel = (dtStr: string, idx: number) => dtStr.split(' ')[0] || dtStr;
    } else if (range === '1M') {
      interval = '1day';
      outputsize = 30;
      formatLabel = (dtStr: string, idx: number) => dtStr.split(' ')[0]?.slice(5) || dtStr;
    }

    // Adapt crypto symbol format for Twelve Data: BTC -> BTC/USD
    const querySymbol = isCrypto ? `${symbol}/USD` : symbol;

    try {
      const tdRes = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${querySymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${tdKey}`
      );
      if (tdRes.ok) {
        const tdData = await tdRes.json() as any;
        if (tdData.values && Array.isArray(tdData.values)) {
          // Twelve Data returns reverse chronological. Reverse it !
          const sortedValues = [...tdData.values].reverse();
          const chartOutput = sortedValues.map((v: any, idx: number) => ({
            time: formatLabel(v.datetime, idx),
            price: parseFloat(v.close),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close)
          }));
          return res.json({ source: 'twelvedata', data: chartOutput });
        }
      }
    } catch (err) {
      console.warn("Twelve Data time-series history failed:", err);
    }
  }

  // Alpha Vantage Fallback
  const avKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (avKey && !isCrypto) {
    try {
      const avFunction = range === '1M' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY';
      const avInterval = range === '1D' ? '30min' : '15min';
      let avUrl = `https://www.alphavantage.co/query?function=${avFunction}&symbol=${symbol}&apikey=${avKey}`;
      if (avFunction === 'TIME_SERIES_INTRADAY') {
        avUrl += `&interval=${avInterval}`;
      }
      
      const avRes = await fetch(avUrl);
      if (avRes.ok) {
        const avData = await avRes.json() as any;
        const timeSeriesKey = Object.keys(avData).find(k => k.includes('Time Series'));
        if (timeSeriesKey && avData[timeSeriesKey]) {
          const series = avData[timeSeriesKey];
          const dates = Object.keys(series).slice(0, 30).reverse();
          const chartOutput = dates.map(dt => {
            const closeVal = series[dt]['4. close'];
            return {
              time: dt.includes(' ') ? dt.split(' ')[1].slice(0, 5) : dt.slice(5),
              price: parseFloat(parseFloat(closeVal).toFixed(2))
            };
          });
          return res.json({ source: 'alphavantage', data: chartOutput });
        }
      }
    } catch (err) {
      console.warn("Alpha Vantage history failed:", err);
    }
  }

  return res.status(503).json({
    error: 'Live market history unavailable for this symbol. Please configure a supported API provider for real-time market data.'
  });
});

// Initialize server serving and Vite setup
async function startServer() {
  if (process.env.DISABLE_BACKGROUND_UPDATES === 'true') {
    console.log('Background updates are disabled for local development.');
  } else {
    try {
      await runBackgroundUpdates();
    } catch (err) {
      console.warn('Background update initialization failed. Continuing without background updates.', err);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // SPA fallback for development mode: catch-all for navigation requests
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;

      // Skip requests for API or static files (anything with a dot like .js, .css, .png)
      if (url.startsWith('/api') || url.includes('.')) {
        return next();
      }

      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        
        if (!fs.existsSync(indexPath)) {
          console.error(`[Dev Fallback Error] index.html not found at: ${indexPath}`);
          return next();
        }

        let template = fs.readFileSync(indexPath, 'utf-8');
        // Inject Vite HMR and resolve module paths
        template = await vite.transformIndexHtml(url, template);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        console.error('[Dev Fallback Error] Transformation failed:', e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    // Production fallback
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tesla Stock Investment server running on port ${PORT}`);
    console.log(`- Local Access: http://localhost:${PORT}`);
  });
}

startServer();
