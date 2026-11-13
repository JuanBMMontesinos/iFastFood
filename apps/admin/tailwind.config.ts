import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#EA1D2C', // Vermelho característico marketplace delivery
          dark: '#1E1E1E',
          surface: '#F8F9FA',
        },
      },
    },
  },
  plugins: [],
};

export default config;
