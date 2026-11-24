import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f5fc', 100: '#dbe6f6', 200: '#b4c9ea', 300: '#86a5d9', 400: '#5a80c2', 600: '#17479a', 700: '#103a7d', 800: '#0b2d5e', 900: '#081f44', 950: '#04122b' },
        lagoon: { 50: '#e9fbf6', 100: '#c9f4e7', 200: '#9be8d1', 300: '#62d6b8', 400: '#2fc7a0', 500: '#12ad86', 600: '#0b8f6d', 700: '#0a7358' },
        ocean: { 50: '#eef7fe', 100: '#d9ecfb', 400: '#4ba0e6', 500: '#1d7fd1', 600: '#1668b0' },
        sand: { 50: '#fbf8f3', 100: '#f5efe4', 200: '#ebe1cd' },
        coral: { 400: '#ff8a78', 500: '#f4604f', 600: '#d94a3a' },
        line: '#e5eaf2',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(8, 31, 68, 0.04), 0 10px 30px -12px rgba(8, 31, 68, 0.14)',
        lift: '0 2px 4px rgba(8, 31, 68, 0.05), 0 22px 50px -18px rgba(8, 31, 68, 0.28)',
        glow: '0 8px 24px -8px rgba(18, 173, 134, 0.55)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        script: ['"Segoe Script"', '"Brush Script MT"', '"Snell Roundhand"', 'cursive'],
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: { 'fade-up': 'fade-up .6s cubic-bezier(.2,.7,.2,1) both', float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};

export default config;
