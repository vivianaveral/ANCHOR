import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0074EF',
          50:  '#EEF5FF',
          100: '#DCEAFF',
          600: '#005FCC',
        },
      },
    },
  },
  plugins: [],
};

export default config;
