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
          DEFAULT: '#064E3B',
          foreground: '#FDFBF7',
        },
        dust: {
          50: '#FDFBF7',
          100: '#F4F0E8',
          200: '#E7E1D6',
          800: '#374151',
          900: '#1F2937',
          950: '#111827',
        },
        // Keep legacy utility names mapped to the restrained three-color system.
        blue: {
          50: '#F1F7F4', 100: '#DCEEE7', 200: '#B9DBCE', 300: '#8DC2AD',
          400: '#5DA48D', 500: '#2F8069', 600: '#14634E', 700: '#0D553F',
          800: '#064E3B', 900: '#043B2D', 950: '#02291F',
        },
        green: {
          50: '#F1F7F4', 100: '#DCEEE7', 200: '#B9DBCE', 300: '#8DC2AD',
          400: '#5DA48D', 500: '#2F8069', 600: '#14634E', 700: '#0D553F',
          800: '#064E3B', 900: '#043B2D', 950: '#02291F',
        },
        orange: {
          50: '#F1F7F4', 100: '#DCEEE7', 200: '#B9DBCE', 300: '#8DC2AD',
          400: '#5DA48D', 500: '#2F8069', 600: '#14634E', 700: '#0D553F',
          800: '#064E3B', 900: '#043B2D', 950: '#02291F',
        },
        purple: {
          50: '#FDFBF7', 100: '#F4F0E8', 200: '#E7E1D6', 300: '#D6CFC2',
          400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
          800: '#1F2937', 900: '#111827', 950: '#0B1220',
        },
        yellow: {
          50: '#FDFBF7', 100: '#F4F0E8', 200: '#E7E1D6', 300: '#D6CFC2',
          400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
          800: '#1F2937', 900: '#111827', 950: '#0B1220',
        },
        red: {
          50: '#F4F0E8', 100: '#E7E1D6', 200: '#D6CFC2', 300: '#9CA3AF',
          400: '#6B7280', 500: '#4B5563', 600: '#374151', 700: '#1F2937',
          800: '#111827', 900: '#0B1220', 950: '#030712',
        },
        ghost: {
          ink: '#1F2937',
          paper: '#FDFBF7',
          rust: '#064E3B',
          gold: '#2F8069',
          dusk: '#374151',
          sand: '#F4F0E8',
          sage: '#14634E',
          forest: '#064E3B',
          cream: '#FDFBF7',
          charcoal: '#1F2937',
        }
      },
      boxShadow: {
        lantern: '0 12px 32px -12px rgba(6, 78, 59, 0.24)',
        dust: '0 2px 12px rgba(31, 41, 55, 0.08)',
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
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Source Sans 3', 'Source Sans Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slab: ['Playfair Display', 'Georgia', 'serif'],
        score: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
