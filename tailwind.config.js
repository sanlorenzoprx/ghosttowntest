/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#B7410E',
          foreground: '#FAF9F6',
        },
        dust: {
          50: '#FAF9F6',
          100: '#F0E6D6',
          200: '#E4D3B9',
          800: '#3A291C',
          900: '#2D1B0E',
          950: '#0F0F0F',
        },
        ghost: {
          ink: '#0F0F0F',
          paper: '#FAF9F6',
          rust: '#B7410E',
          gold: '#D4AF37',
          dusk: '#27364A',
          sand: '#E9DEC9',
          sage: '#4D7C0F',
        }
      },
      boxShadow: {
        lantern: '0 12px 32px -12px rgba(183, 65, 14, 0.35)',
        dust: '0 2px 12px rgba(15, 15, 15, 0.08)',
      },
      backgroundImage: {
        'ghost-noise': 'radial-gradient(rgba(255,255,255,.11) .7px, transparent .7px)',
      },
      keyframes: {
        flicker: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.84' } },
      },
      animation: {
        flicker: 'flicker 3s ease-in-out infinite',
      },
      fontFamily: {
        display: ['Rye', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slab: ['Roboto Slab', 'Georgia', 'serif'],
        score: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
