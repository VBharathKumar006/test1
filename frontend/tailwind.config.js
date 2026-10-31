/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#09090b', // True black
          900: '#121215', // Main surface
          850: '#18181c', // Card surface
          800: '#26262b', // Borders
          700: '#3f3f46', // Muted borders
          600: '#52525b',
          500: '#71717a',
        },
        accent: {
          orange: '#f97316',
          'orange-hover': '#ea580c',
          'orange-glow': 'rgba(249, 115, 22, 0.15)',
          red: '#ef4444',
          'red-hover': '#dc2626',
          'red-glow': 'rgba(239, 68, 68, 0.15)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
