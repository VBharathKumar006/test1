/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#090B10',
          sidebar: '#0D1018',
          surface: '#121722',
          surface2: '#171D29',
          elevated: '#1C2432',
          border: '#1F2737',
          borderSubtle: 'rgba(255, 255, 255, 0.07)',
          borderHover: 'rgba(139, 124, 255, 0.35)',
        },
        brand: {
          primary: '#8B7CFF',
          primaryHover: '#7A69FA',
          secondary: '#6C9BFF',
          highlight: '#A78BFA',
          glow: 'rgba(139, 124, 255, 0.15)',
        },
        status: {
          success: '#34D399',
          successBg: 'rgba(52, 211, 153, 0.12)',
          warning: '#FBBF24',
          warningBg: 'rgba(251, 191, 36, 0.12)',
          error: '#FB7185',
          errorBg: 'rgba(251, 113, 133, 0.12)',
          info: '#6C9BFF',
          infoBg: 'rgba(108, 155, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'subtle': '8px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glow-primary': '0 0 24px -4px rgba(139, 124, 255, 0.3)',
        'glow-subtle': '0 0 16px -2px rgba(139, 124, 255, 0.15)',
      },
    },
  },
  plugins: [],
}
