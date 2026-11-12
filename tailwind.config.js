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
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12',
        15: '0.15',
        35: '0.35',
        55: '0.55',
        65: '0.65',
        68: '0.68',
        72: '0.72',
        76: '0.76',
        82: '0.82',
      },
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
          DEFAULT: '#0B6B50',
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
          50: '#EEF8F3', 100: '#D9F0E5', 200: '#B4E0CC', 300: '#84C9AC',
          400: '#4DAE8A', 500: '#1F9070', 600: '#0F7A5C', 700: '#0B6B50',
          800: '#095A44', 900: '#074A38', 950: '#04352A',
        },
        green: {
          50: '#EEF8F3', 100: '#D9F0E5', 200: '#B4E0CC', 300: '#84C9AC',
          400: '#4DAE8A', 500: '#1F9070', 600: '#0F7A5C', 700: '#0B6B50',
          800: '#095A44', 900: '#074A38', 950: '#04352A',
        },
        orange: {
          50: '#EEF8F3', 100: '#D9F0E5', 200: '#B4E0CC', 300: '#84C9AC',
          400: '#4DAE8A', 500: '#1F9070', 600: '#0F7A5C', 700: '#0B6B50',
          800: '#095A44', 900: '#074A38', 950: '#04352A',
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
        // Warm neutrals replace Tailwind's cool grays so text and borders sit well on cream.
        gray: {
          50: '#FAF7F2', 100: '#F4EFE7', 200: '#E9E2D7', 300: '#D8D0C3',
          400: '#A29D94', 500: '#6C736D', 600: '#545C57', 700: '#3F4944',
          800: '#2A3430', 900: '#1D2A26', 950: '#141D1A',
        },
        ghost: {
          ink: '#1D2A26',
          paper: '#FFFBF5',
          rust: '#0B6B50',
          gold: '#FFD27A',
          dusk: '#3F4944',
          sand: '#FBF3E7',
          sage: '#0F7A5C',
          forest: '#0B6B50',
          cream: '#FFFBF5',
          charcoal: '#1D2A26',
          // Colored panel that replaces the old near-black panels. White text stays readable on it.
          pine: '#0E6650',
        },
        // Daylight palette for marketing and first-run screens.
        day: {
          canvas: '#FFFBF5',
          peach: '#FFF1E3',
          butter: '#FFF6D6',
          mint: '#EAF6EF',
          sky: '#EAF3FB',
          ink: '#1D2A26',
          soft: '#4A5752',
          coral: '#D0521F',
          'coral-hover': '#B94616',
          sun: '#FFC94D',
          leaf: '#0F7A5C',
        },
      },
      maxWidth: {
        reading: '44rem',
        decision: '68rem',
        workspace: '88rem',
      },
      borderRadius: {
        // The whole scale is a step softer than Tailwind's default so nothing looks boxy.
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        field: '0.625rem',
        card: '0.875rem',
        panel: '1.125rem',
        evidence: '1.375rem',
      },
      boxShadow: {
        quiet: '0 1px 2px rgba(32, 37, 35, 0.05)',
        lift: '0 10px 24px -18px rgba(32, 37, 35, 0.28)',
        lantern: '0 12px 28px -18px rgba(169, 79, 42, 0.32)',
        soft: '0 1px 2px rgba(29, 42, 38, 0.04), 0 12px 32px -12px rgba(29, 42, 38, 0.14)',
        pop: '0 2px 4px rgba(29, 42, 38, 0.05), 0 24px 56px -20px rgba(29, 42, 38, 0.24)',
        cta: '0 10px 26px -8px rgba(208, 82, 31, 0.55)',
        dust: '0 2px 12px rgba(32, 37, 35, 0.08)',
      },
      backgroundImage: {
        'ghost-noise': 'radial-gradient(rgba(255,253,248,.16) .7px, transparent .7px)',
      },
      fontFamily: {
        display: ['Fraunces', 'Newsreader', 'Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
        sans: ['Source Sans 3', 'Source Sans Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slab: ['Fraunces', 'Newsreader', 'Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
        score: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
