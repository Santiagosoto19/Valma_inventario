/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        pastel: {
          rose: '#F9A8D4',
          'rose-deep': '#EC4899',
          lavender: '#E9D5FF',
          'lavender-deep': '#C4B5FD',
          mint: '#A7F3D0',
          'mint-deep': '#6EE7B7',
          cream: '#FFFBF5',
          'cream-dark': '#FFF7ED',
          nequi: '#E0E7FF',
          'nequi-deep': '#A5B4FC',
          cash: '#D1FAE5',
          'cash-deep': '#6EE7B7',
          amber: '#FDE68A',
          'amber-deep': '#FCD34D',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 8px 32px -8px rgba(236, 72, 153, 0.15)',
        'soft-lg': '0 16px 48px -12px rgba(167, 139, 250, 0.2)',
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
