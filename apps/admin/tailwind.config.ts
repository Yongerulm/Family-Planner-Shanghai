import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', hover: '#1d4ed8' },
        danger: { DEFAULT: '#dc2626', hover: '#b91c1c' },
      },
    },
  },
  plugins: [],
};

export default config;
