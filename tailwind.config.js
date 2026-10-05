/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/web/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        paper: '#0f0e0d',
        well: '#141210',
        surface: '#191715',
        surface2: '#211e1b',
        surface3: '#2a2521',
        ink: '#f3eee8',
        visitors: '#8dbdf0',
        revenue: '#e07b5f',
        revenueHover: '#ef8a6b',
        onRevenue: '#1b0f0a',
        revenueSoft: '#6b3a2c',
        visitorsSoft: '#24445f',
      },
      boxShadow: { card: '0 1px 2px rgba(0,0,0,0.45), 0 1px 1px rgba(0,0,0,0.25)' },
    },
  },
  plugins: [],
};
