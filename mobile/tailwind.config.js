/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fafc',
        surface: '#ffffff',
        ink: '#0f172a',
        copy: '#64748b',
        line: '#e2e8f0',
        brand: {
          DEFAULT: '#2861f5',
          dark: '#1d4ed8',
          soft: '#b9cbff',
          subtle: '#eff6ff',
        },
        glucose: '#10b981',
        heart: '#fb7185',
        meal: '#f59e0b',
        medication: '#7c2ae8',
        prediction: '#9f24f2',
        warning: '#f59e0b',
        danger: '#e11d48',
      },
      borderRadius: {
        card: '28px',
        'card-lg': '30px',
      },
      boxShadow: {
        card: '0 4px 14px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
