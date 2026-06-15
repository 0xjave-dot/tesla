# Tesla Stock Investment Platform

A high-performance trading simulation platform built with React, Vite, and Firebase. This application features real-time market data synchronization for both stocks and cryptocurrencies.

## 🚀 Features

- **Real-time Price Feeds**: Live updates every 15 seconds via Finnhub API.
- **Asset Management**: Dynamic logo rendering for top stocks (Tesla, Apple, Microsoft, Amazon, Google, NVIDIA, Meta, Netflix, SpaceX) and major Cryptocurrencies.
- **Trading Terminal**: Advanced charting using Recharts with simulated and live data fallbacks.
- **Secure Transactions**: Firestore-backed transactions for buying and selling assets with balance integrity.
- **Wallet System**: Support for BTC, PayPal, and Venmo deposit requests with administrative oversight.
- **Professional UI**: Responsive design with a dark-mode "Navy" aesthetic, flashing price indicators, and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Node.js (Express), Firebase Admin SDK.
- **Database/Auth**: Firebase Firestore & Firebase Authentication.

## 📦 Installation & Setup

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file with your Firebase and Market API keys:
   ```env
   FINNHUB_API_KEY=your_key
   ```
4. Run the development server: `npm run dev`.
5. Start the background price syncer: `npm run server` (or `node server.ts`).