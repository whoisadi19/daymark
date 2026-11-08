/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        panel: 'var(--bg-panel)',
        ink: 'var(--bg-ink)',
        'text-ink': 'var(--text-primary)',
        'text-dim': 'var(--text-muted)',
        'grid-line': 'var(--border-grid)',
        'braun-orange': 'var(--accent-orange)',
        'ochre-amber': 'var(--accent-amber)',
        'forest-olive': 'var(--accent-olive)',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        widest: '0.12em',
      },
      boxShadow: {
        'mechanical': 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 1px 2px rgba(0, 0, 0, 0.08)',
        'mechanical-pressed': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
        'ink-plate': 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}
