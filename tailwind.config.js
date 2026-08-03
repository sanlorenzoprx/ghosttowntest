/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
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
        canvas: '#F7F3EB',
        surface: {
          DEFAULT: '#FFFDF8',
          raised: '#FFFFFF',
          stone: '#E8E1D5',
          muted: '#F0EBE2',
        },
        ink: {
          DEFAULT: '#202523',
          soft: '#4C5550',
          muted: '#6E756F',
          inverse: '#FFFDF8',
        },
        primary: {
          DEFAULT: '#064E3B',
          foreground: '#FDFBF7',
        },
        rust: {
          DEFAULT: '#A94F2A',
          hover: '#8B3F21',
          foreground: '#FFFDF8',
          soft: '#F4E3D9',
        },
        evidence: {
          DEFAULT: '#A94F2A',
          soft: '#F4E3D9',
          border: '#D8A187',
        },
        pass: {
          DEFAULT: '#28735E',
          soft: '#E3F0EA',
        },
        watch: {
          DEFAULT: '#A56A17',
          soft: '#F8EED8',
        },
        stop: {
          DEFAULT: '#AE3F3F',
          soft: '#F8E3E1',
        },
        dust: {
          50: '#FDFBF7',
          100: '#F4F0E8',
          200: '#E7E1D6',
          800: '#374151',
          900: '#1F2937',
          950: '#111827',
        },
        // Legacy utilities keep their HEAD meanings for untouched product-flow components.
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
        },
      },
      maxWidth: {
        reading: '44rem',
        decision: '68rem',
        workspace: '88rem',
      },
      borderRadius: {
        field: '0.625rem',
        card: '0.875rem',
        panel: '1.125rem',
        evidence: '1.375rem',
      },
      boxShadow: {
        quiet: '0 1px 2px rgba(32, 37, 35, 0.05)',
        lift: '0 10px 24px -18px rgba(32, 37, 35, 0.28)',
        lantern: '0 12px 28px -18px rgba(169, 79, 42, 0.32)',
        dust: '0 2px 12px rgba(32, 37, 35, 0.08)',
      },
      backgroundImage: {
        'ghost-noise': 'radial-gradient(rgba(255,253,248,.16) .7px, transparent .7px)',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
        sans: ['Source Sans 3', 'Source Sans Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slab: ['Newsreader', 'Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
        score: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
