/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'] },
      colors: {
        ink: '#0a0a0a',
        soft: '#71717a',
        off: '#a3a3a3',
        line: '#e5e5e5',
        bg2: '#f5f5f5',
        terra: { DEFAULT: '#C17A5A', deep: '#A9623F', darker: '#8f4f30', light: '#F5EDE8' },
        pos: '#16a34a',
        neg: '#dc2626',
        warn: '#ea580c',
        info: '#2563eb',
      },
      borderRadius: { card: '12px', btn: '8px' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        up: '0 2px 6px rgba(0,0,0,0.08), 0 14px 32px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
