import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          500: '#fb923c',
          600: '#cc460f',
          700: '#9a3412',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
