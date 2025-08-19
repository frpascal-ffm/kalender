import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand)',
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        ring: 'var(--ring)'
      },
      borderRadius: {
        DEFAULT: 'var(--radius)'
      }
    }
  },
  plugins: []
}

export default config
