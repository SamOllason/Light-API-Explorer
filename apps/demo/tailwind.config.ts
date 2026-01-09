import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pet-shop themed primary palette (warm coral / sea glass)
        primary: {
          50: '#fff8f6',
          100: '#ffece8',
          200: '#ffd6c9',
          300: '#ffbfa8',
          400: '#ff9a78',
          500: '#ff7a59',
          600: '#ff623f',
          700: '#e14f30',
          800: '#b03b24',
          900: '#7a2818',
        },
      },
    },
  },
  plugins: [],
};

export default config;
