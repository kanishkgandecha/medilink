/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── CalmCare Pro palette ─────────────────────────────
        cc: {
          primary:       '#2E86DE',
          'primary-dark':'#1a6db5',
          'primary-light':'#5DADE2',
          secondary:     '#5DADE2',
          accent:        '#1ABC9C',
          'accent-dark': '#17A085',
          bg:            '#F5F7FA',
          card:          '#FFFFFF',
          'text-primary':'#2C3E50',
          'text-secondary':'#7B8A8B',
          success:       '#27AE60',
          warning:       '#F39C12',
          danger:        '#E74C3C',
          'border':      '#E2E8F0',
        },
        // ─── Semantic alias (maps to CalmCare) ───────────────
        primary: {
          50:  '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#2E86DE',
          600: '#1a6db5',
          700: '#155a96',
          800: '#104778',
          900: '#0A3459',
        },
        accent: {
          50:  '#E8F8F5',
          100: '#D1F2EB',
          200: '#A3E4D7',
          300: '#76D7C4',
          400: '#48C9B0',
          500: '#1ABC9C',
          600: '#17A085',
          700: '#148A6E',
          800: '#117A5B',
          900: '#0E6347',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'cc-sm':  '0 1px 3px rgba(46,134,222,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'cc-md':  '0 4px 12px rgba(46,134,222,0.12), 0 2px 4px rgba(0,0,0,0.06)',
        'cc-lg':  '0 8px 24px rgba(46,134,222,0.15), 0 4px 8px rgba(0,0,0,0.08)',
        'cc-xl':  '0 20px 40px rgba(46,134,222,0.18), 0 8px 16px rgba(0,0,0,0.1)',
        'card':   '0 2px 8px rgba(44,62,80,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(44,62,80,0.12), 0 4px 8px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'card': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up':    'fadeUp 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}
