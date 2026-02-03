/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'
import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

export default {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: colors.indigo[600],
          hover: colors.indigo[700],
          active: colors.indigo[800],
          light: colors.indigo[50],
          content: '#ffffff',
        },
        secondary: {
          DEFAULT: colors.slate[600],
          hover: colors.slate[700],
          light: colors.slate[100],
          content: '#ffffff',
        },
        info: {
          DEFAULT: colors.blue[500],
          light: colors.blue[50],
          content: '#ffffff',
        },
        success: {
          DEFAULT: colors.green[600],
          light: colors.green[50],
          content: '#ffffff',
        },
        warning: {
          DEFAULT: colors.amber[500],
          light: colors.amber[50],
          content: '#ffffff',
        },
        danger: {
          DEFAULT: colors.red[600],
          light: colors.red[50],
          content: '#ffffff',
        },
        background: {
          DEFAULT: colors.gray[50],
          subtle: colors.gray[100],
          dark: colors.slate[950],
          'dark-subtle': colors.slate[900],
        },
        surface: {
          DEFAULT: '#ffffff',
          hover: colors.gray[50],
          border: colors.gray[200],
          active: colors.gray[100],
          dark: colors.slate[900],
          'dark-border': colors.slate[800],
        },
        text: {
          main: colors.gray[900],
          body: colors.gray[700],
          muted: colors.gray[500],
          inverted: '#ffffff',
          'dark-main': colors.slate[50],
          'dark-body': colors.slate[300],
          'dark-muted': colors.slate[500],
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'primary': '1rem',      // Base rounding
        'secondary': '0.5rem',  // Subtle rounding
        'card': '1.5rem',       // Prominent rounding for cards
        'button': '0.875rem',   // Specific for buttons
        'input': '0.875rem',    // Specific for inputs
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    typography,
    forms,
  ],
}
