/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#E8E6DF',
        card: '#FAF9F6',
        'card-border': '#DCD9D0',
        well: '#F2F0EA',
        'well-border': '#E5E2D9',
        ink: '#111110',
        'ink-secondary': '#686660',
        'ink-muted': '#9E9B93',
        vermilion: '#E5391A',
        amber: '#D97706',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.02em',
      },
    },
  },
  plugins: [],
}
