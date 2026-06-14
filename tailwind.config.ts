/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          base: '#080c18',
          card: '#0d1426',
          sidebar: '#060912',
          raised: '#111e35',
        },
        accent: '#3b7bff',
        buy: '#f5a623',
        gain: '#22c55e',
        loss: '#ef4444',
        chart: '#06b6d4',
      },
      fontFamily: {
        sans: ['"TT Norms Pro"', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '600',
      },
      letterSpacing: {
        tight: '-0.03em',
        snug: '-0.015em',
      },
      maxWidth: {
        content: '88rem',
      },
    },
  },
  plugins: [],
};
