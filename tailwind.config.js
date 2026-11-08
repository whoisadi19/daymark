/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        root: '#0A0A0C',
        smoked: '#161618',
        crimson: '#D71921',
        'crimson-glow': '#FF4D54',
        ivory: '#ECECEF',
      },
      fontFamily: {
        ndot: ['"DotGothic16"', '"Silkscreen"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        ndot: '0.04em',
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.02em',
      },
      borderRadius: {
        '28': '28px',
        '32': '32px',
      },
      boxShadow: {
        'smoked-glass': '0 20px 50px rgba(0,0,0,0.6)',
        'crimson-glow': '0 12px 30px rgba(215,25,33,0.35)',
        'crimson-soft': '0 0 40px rgba(215,25,33,0.25)',
      }
    },
  },
  plugins: [],
}
