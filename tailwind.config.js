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
        primary: {
          DEFAULT: '#0071E3',
          foreground: '#FFFFFF',
        },
        dust: {
          50: '#FBFBFD',
          100: '#F5F5F7',
          200: '#E8E8ED',
          800: '#2C2C2E',
          900: '#1D1D1F',
          950: '#050505',
        },
        ghost: {
          ink: '#1D1D1F',
          paper: '#F5F5F7',
          rust: '#0071E3',
          gold: '#FF9F0A',
          dusk: '#2C2C2E',
          sand: '#E8E8ED',
          sage: '#248A3D',
        },
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        lantern: '0 18px 50px -20px rgba(0, 113, 227, 0.45)',
        dust: '0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px rgba(0, 0, 0, 0.06)',
        elevated: '0 2px 8px rgba(0, 0, 0, 0.05), 0 24px 70px rgba(0, 0, 0, 0.10)',
        premium: '0 30px 100px rgba(0, 0, 0, 0.22)',
        'inner-hairline': 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
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
        display: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        sans: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif'],
        slab: ['ui-serif', 'Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
        score: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
