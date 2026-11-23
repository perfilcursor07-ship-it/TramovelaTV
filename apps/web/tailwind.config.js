/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#07070a',
          900: '#0d0d12',
          850: '#12121a',
          800: '#181822',
          700: '#22222f',
          600: '#2e2e3e',
        },
        brand: {
          400: '#ff5c8a',
          500: '#ff2d6f',
          600: '#e0185a',
        },
        flame: '#ff8a1f',
        gold: '#ffc83d',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ff2d6f 0%, #ff8a1f 100%)',
        'gold-gradient': 'linear-gradient(135deg, #ffe17a 0%, #ffb21f 100%)',
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(255, 45, 111, 0.7)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,45,111,0.7)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 0 14px rgba(255,45,111,0)' },
        },
        shine: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '100%': { transform: 'translateX(220%) skewX(-20deg)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        heartPop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.8s ease-in-out infinite',
        shine: 'shine 2.6s ease-in-out infinite',
        'float-up': 'floatUp .45s ease-out both',
        'heart-pop': 'heartPop .35s ease-out',
      },
    },
  },
  plugins: [],
};
