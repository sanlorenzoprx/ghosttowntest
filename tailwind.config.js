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
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        score: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
