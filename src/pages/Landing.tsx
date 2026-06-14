import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TESLA_LOGO = 'https://i.ibb.co/7Jb1sW11/glowing-tesla-icon-stockcake-removebg-preview.png';

const heroBrands = [
  {
    name: 'Stripe',
    style: {
      fontFamily: 'Georgia, serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: '15px',
    },
  },
  {
    name: 'Coinbase',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontWeight: 900,
      letterSpacing: '0.08em',
      fontSize: '13px',
      textTransform: 'uppercase',
    },
  },
  {
    name: 'Uniswap',
    style: {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontWeight: 600,
      letterSpacing: '0.01em',
      fontSize: '15px',
      fontStyle: 'italic',
    },
  },
  {
    name: 'Aave',
    style: {
      fontFamily: 'Courier New, monospace',
      fontWeight: 700,
      letterSpacing: '0.12em',
      fontSize: '13px',
      textTransform: 'uppercase',
    },
  },
  {
    name: 'Compound',
    style: {
      fontFamily: 'Palatino, Book Antiqua, serif',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      fontSize: '16px',
    },
  },
  {
    name: 'MakerDAO',
    style: {
      fontFamily: 'Impact, Arial Narrow, sans-serif',
      fontWeight: 400,
      letterSpacing: '0.04em',
      fontSize: '14px',
    },
  },
  {
    name: 'Chainlink',
    style: {
      fontFamily: 'Verdana, sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.03em',
      fontSize: '13px',
    },
  },
];

const backerBrands = [
  {
    name: 'Fundamental Labs',
    style: {
      fontFamily: 'Times New Roman, serif',
      fontWeight: 400,
      letterSpacing: '0.02em',
      fontSize: '14px',
    },
  },
  {
    name: 'KUCOIN',
    style: {
      fontFamily: 'Arial Black, sans-serif',
      fontWeight: 900,
      letterSpacing: '0.08em',
      fontSize: '16px',
    },
  },
  {
    name: 'NGC',
    style: {
      fontFamily: 'Impact, sans-serif',
      fontWeight: 700,
      letterSpacing: '0.05em',
      fontSize: '18px',
    },
  },
  {
    name: 'NxGen',
    style: {
      fontFamily: 'Georgia, serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      fontSize: '17px',
    },
  },
  {
    name: 'Matter Labs',
    style: {
      fontFamily: 'Helvetica, sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '15px',
    },
  },
  {
    name: 'DEXTools',
    style: {
      fontFamily: 'Verdana, sans-serif',
      fontWeight: 700,
      letterSpacing: '0.06em',
      fontSize: '14px',
      textTransform: 'uppercase',
    },
  },
  {
    name: 'NGRAVE',
    style: {
      fontFamily: 'Courier New, monospace',
      fontWeight: 700,
      letterSpacing: '0.18em',
      fontSize: '14px',
    },
  },
  {
    name: 'Polychain',
    style: {
      fontFamily: 'Palatino, serif',
      fontWeight: 500,
      letterSpacing: '0.03em',
      fontSize: '15px',
    },
  },
];

export default function Landing() {
  return (
    <div className="flex flex-col bg-white text-gray-900 min-h-screen">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes backers-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track, .backers-track { display: flex; width: max-content; animation-timing-function: linear; animation-iteration-count: infinite; }
        .marquee-track { animation-name: marquee; animation-duration: 22s; }
        .backers-track { animation-name: backers-marquee; animation-duration: 30s; }
      `}</style>

      <section className="h-auto sm:h-screen flex flex-col overflow-hidden relative py-12 sm:py-0">
        <nav className="static sm:absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 py-3 sm:py-5">
          <div className="max-w-[88rem] mx-auto flex items-center justify-between gap-3 sm:gap-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={TESLA_LOGO} alt="Tesla Stock Investment" className="w-6 sm:w-8 h-6 sm:h-8 object-contain" />
              <span className="text-lg sm:text-2xl font-medium tracking-tight text-blue-700">Tesla</span>
            </div>

            <div className="hidden md:flex items-center gap-4 lg:gap-8 text-xs sm:text-base text-gray-800 font-semibold transition-colors duration-200">
              <Link to="/dashboard/markets" className="hover:text-blue-700">Markets</Link>
              <Link to="/dashboard" className="hover:text-blue-700">Dashboard</Link>
              <Link to="/dashboard/portfolio" className="hover:text-blue-700">Portfolio</Link>
              <Link to="/dashboard/profile" className="hover:text-blue-700">Profile</Link>
              <Link to="/dashboard/wallet" className="hover:text-blue-700">Wallet</Link>
            </div>

            <Link
              to="/login"
              className="bg-blue-700 text-white text-xs sm:text-base font-medium px-4 sm:px-7 py-2 sm:py-2.5 rounded-full hover:bg-blue-800 transition-colors duration-200"
            >
              Open Wallet
            </Link>
          </div>
        </nav>

        <div className="flex-1 px-4 sm:px-6 pt-12 sm:pt-20 pb-6 sm:pb-6 flex items-end">
          <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden" style={{ height: 'auto' }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="object-cover absolute inset-0 w-full h-full"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4"
            />

            <div className="relative z-10 flex flex-col items-start justify-start h-full p-12 pt-36">
              <h1 className="text-blue-700 text-5xl md:text-6xl font-bold leading-tight max-w-xl mb-4" style={{ letterSpacing: '-0.04em' }}>
                Start Trading<br />Tesla Stock
              </h1>
              <p className="text-gray-800 text-base md:text-lg font-medium max-w-md mb-8 leading-relaxed" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
                Real-time trading platform for Tesla stock and top assets. Build and manage your portfolio with live market quotes and instant execution.
              </p>

              <div className="inline-flex items-center gap-3 bg-blue-700 text-white text-base md:text-lg font-medium rounded-full hover:bg-blue-800 transition-colors duration-200">
                <Link to="/register" className="inline-flex items-center gap-3 px-8 py-2">
                  <span>Get Started</span>
                </Link>
                <span className="inline-flex items-center justify-center bg-white rounded-full p-2 transition-colors duration-200">
                  <ArrowRight className="w-5 h-5 text-black" />
                </span>
              </div>

              <div className="mt-24 w-full max-w-md overflow-hidden">
                <div className="marquee-track">
                  {heroBrands.map((brand) => (
                    <div
                      key={brand.name + '-hero-1'}
                      className="mx-7 shrink-0 text-blue-400 whitespace-nowrap"
                      style={brand.style}
                    >
                      {brand.name}
                    </div>
                  ))}
                  {heroBrands.map((brand) => (
                    <div
                      key={brand.name + '-hero-2'}
                      className="mx-7 shrink-0 text-blue-400 whitespace-nowrap"
                      style={brand.style}
                    >
                      {brand.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 sm:px-6 py-12 sm:py-24">
        <div className="max-w-[88rem] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-16 items-start">
            <div>
              <h2 className="text-blue-700 text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 sm:mb-8" style={{ letterSpacing: '-0.03em' }}>
                Trade with Confidence
              </h2>
              <Link
                to="/dashboard/markets"
                className="inline-flex items-center gap-2 sm:gap-3 bg-blue-700 text-white text-sm sm:text-base font-medium px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-blue-800 transition-colors duration-200"
              >
                <span>Explore Markets</span>
                <span className="inline-flex items-center justify-center bg-white rounded-full p-1 sm:p-2">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                </span>
              </Link>
            </div>

            <p className="text-gray-800 text-lg sm:text-2xl md:text-3xl font-medium leading-relaxed">
              Access real-time Tesla stock quotes, execute instant trades, and build a diversified portfolio with live market data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="lg:col-span-2 rounded-lg sm:rounded-2xl overflow-hidden bg-blue-50" style={{ backgroundImage: 'url(https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="p-4 sm:p-7 min-h-[15rem] sm:min-h-[20rem] flex flex-col justify-between">
                <h3 className="text-blue-700 text-lg sm:text-2xl font-bold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                  Live Price Feeds
                </h3>
                <p className="text-blue-900 text-sm sm:text-base max-w-xs">
                  Real-time market data ensures you always have the latest Tesla stock prices and trading opportunities.
                </p>
              </div>
            </div>

            <div className="rounded-lg sm:rounded-2xl bg-blue-700 p-4 sm:p-7 min-h-[15rem] sm:min-h-[20rem] flex flex-col justify-between">
              <div>
                <h3 className="text-white text-lg sm:text-2xl font-bold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                  Instant<br />Execution
                </h3>
              </div>
              <p className="text-blue-100 text-sm sm:text-base">
                Execute buy and sell orders instantly. No delays, no friction — just pure trading performance.
              </p>
            </div>

            <div className="rounded-lg sm:rounded-2xl bg-blue-800 p-4 sm:p-7 min-h-[15rem] sm:min-h-[20rem] flex flex-col justify-between">
              <div>
                <h3 className="text-white text-lg sm:text-2xl font-bold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                  Portfolio<br />Tracking
                </h3>
              </div>
              <p className="text-blue-100 text-sm sm:text-base">
                Monitor your holdings in real-time. Track gains, losses, and performance metrics with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 sm:px-6">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 items-center py-8 sm:py-14">
          <div className="text-gray-800 font-semibold text-sm sm:text-base leading-relaxed">
            Trusted by leading
            <br />
            financial institutions.
          </div>

          <div className="md:col-span-3 overflow-hidden">
            <div className="backers-track">
              {backerBrands.map((brand) => (
                <div
                  key={brand.name + '-backer-1'}
                  className="mx-6 sm:mx-10 shrink-0 text-blue-400 whitespace-nowrap text-xs sm:text-base"
                  style={brand.style}
                >
                  {brand.name}
                </div>
              ))}
              {backerBrands.map((brand) => (
                <div
                  key={brand.name + '-backer-2'}
                  className="mx-6 sm:mx-10 shrink-0 text-blue-400 whitespace-nowrap text-xs sm:text-base"
                  style={brand.style}
                >
                  {brand.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 sm:px-6 py-12 sm:py-24">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          <div className="md:pr-8 md:pt-2">
            <p className="text-blue-700 font-bold text-xs sm:text-sm mb-2 uppercase tracking-widest">Trading Features</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-none mb-4 sm:mb-6 text-blue-800" style={{ letterSpacing: '-0.04em' }}>
              Advanced Tools
            </h2>
            <p className="text-gray-800 font-medium text-sm sm:text-base leading-relaxed max-w-sm">
              Powerful trading tools and features designed for serious investors. Manage your Tesla stock portfolio with institutional-grade technology.
            </p>
          </div>

          <div className="relative rounded-lg sm:rounded-3xl overflow-hidden min-h-[300px] sm:min-h-[500px] md:min-h-[720px]">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4"
            />
            <div className="relative z-10 p-4 sm:p-10 md:p-12 bg-blue-900/20 backdrop-blur-sm h-full flex flex-col justify-end">
              <div className="bg-white rounded-lg sm:rounded-3xl p-4 sm:p-8 max-w-sm shadow-2xl shadow-blue-900/40">
                <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3 sm:mb-5 text-blue-700" style={{ letterSpacing: '-0.03em' }}>
                  Start Trading
                </h3>
                <p className="text-gray-800 font-medium text-sm sm:text-base max-w-md mb-6 sm:mb-8">
                  Join thousands of investors trading Tesla stock with real-time data, zero-fee execution, and powerful portfolio management tools.
                </p>
                <Link to="/register" className="inline-flex items-center gap-3 sm:gap-4 group">
                  <span className="text-blue-700 font-bold text-sm sm:text-base">Get Started</span>
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center transition-colors duration-200 group-hover:bg-blue-200">
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-700" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
