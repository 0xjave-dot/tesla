import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

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
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
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
        console.log(`Initializing Firebase Admin for project: ${projectId}`);
        firebaseAdminApp = initializeApp({
          projectId: projectId
        });
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
  { symbol: 'LINK', name: 'Chainlink', type: 'crypto', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKQG7VLkgiQhDj-m-jmXN246LOJEtMaLAjEw&s' }
];

// Map short symbols to CoinGecko coin IDs
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

    const cryptoIds = SEED_ASSETS.filter(a => a.type === 'crypto')
      .map(a => COINGECKO_MAP[a.symbol])
      .filter(Boolean)
      .join(',');

    const stockSymbols = SEED_ASSETS.filter(a => a.type === 'stock')
      .map(a => a.symbol)
      .join(',');

    const fetchAllPrices = async () => {
      const prices: Record<string, { price: number; change24h: number }> = {};
      const cgKey = process.env.COINGECKO_API_KEY;
      const tdKey = process.env.TWELVE_DATA_API_KEY;
      const fhKey = process.env.FINNHUB_API_KEY;

      // 1. Fetch Cryptos
      try {
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`,
          cgKey ? { headers: { 'x-cg-api-key': cgKey } } : undefined
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json() as any;
          Object.entries(COINGECKO_MAP).forEach(([sym, id]) => {
            if (cgData[id]) {
              prices[sym] = {
                price: cgData[id].usd,
                change24h: cgData[id].usd_24h_change || 0
              };
            }
          });
        }
      } catch (e) { console.warn("CoinGecko fetch failed:", e); }

      // 2. Fetch Stocks (Twelve Data)
      if (tdKey) {
        try {
          const tdRes = await fetch(
            `https://api.twelvedata.com/quote?symbol=${stockSymbols}&apikey=${tdKey}`
          );
          if (tdRes.ok) {
            const tdData = await tdRes.json() as any;
            stockSymbols.split(',').forEach(sym => {
              const symData = tdData[sym];
              if (symData && (symData.price || symData.close)) {
                prices[sym] = {
                  price: parseFloat(symData.price || symData.close),
                  change24h: symData.percent_change ? parseFloat(symData.percent_change) : 0
                };
              }
            });
          }
        } catch (e) { console.warn("Twelve Data fetch failed:", e); }
      }

      // 3. Fallback for Stocks (Finnhub)
      if (fhKey) {
        for (const sym of stockSymbols.split(',')) {
          if (!prices[sym]) {
            try {
              const fhRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${fhKey}`);
              if (fhRes.ok) {
                const fhData = await fhRes.json() as any;
                if (fhData.c) {
                  prices[sym] = { price: fhData.c, change24h: fhData.dp || 0 };
                }
              }
            } catch (e) { console.warn(`Finnhub fetch for ${sym} failed:`, e); }
          }
        }
      }
      return prices;
    };

    // Initial Seed
    const snap = await assetsRef.get();
    if (snap.empty) {
      console.log("Assets database is blank. Seeding live market data...");
      const livePrices = await fetchAllPrices();

      if (Object.keys(livePrices).length > 0) {
        for (const asset of SEED_ASSETS) {
          const current = livePrices[asset.symbol];
          if (current) {
            await assetsRef.doc(asset.symbol).set({
              symbol: asset.symbol,
              name: asset.name,
              type: asset.type,
              logoUrl: asset.logoUrl,
              currentPrice: current.price,
              change24h: current.change24h,
              priceSource: 'live-api',
              updatedAt: FieldValue.serverTimestamp()
            });
          } else {
            console.log(`No live quote available for ${asset.symbol} during initial seed.`);
          }
        }
        console.log("Assets collection seeded with live market quotes.");
      } else {
        console.log("No live market quotes available for initial asset seed. Assets collection remains empty.");
      }
    }

    // Interval to fetch LIVE quotes and update Firebase
    setInterval(async () => {
      try {
        const livePrices = await fetchAllPrices();
        if (Object.keys(livePrices).length === 0) return;

        const batch = dbAdmin.batch();
        const activeSnap = await assetsRef.get();

        // Update only assets for which live quotes are available
        activeSnap.forEach((doc) => {
          const data = doc.data();
          const symbol: string = data.symbol;
          const live = livePrices[symbol];
          if (!live) return;

          batch.update(doc.ref, {
            currentPrice: parseFloat(live.price.toFixed(2)),
            change24h: parseFloat(live.change24h.toFixed(2)),
            priceSource: 'live-api',
            updatedAt: FieldValue.serverTimestamp()
          });
        });

        await batch.commit();
      } catch (err) {
        console.warn("Background market price update loop failed:", err);
      }
    }, 30000); // 30 seconds interval is safe for free-tier rate limits

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

    // SPA fallback for development mode: Transform and serve index.html
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tesla Stock Investment server running on port ${PORT}`);
    console.log(`- Local Access: http://localhost:${PORT}`);
  });
}

startServer();
