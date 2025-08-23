/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom color scheme - keeping your custom colors
      colors: {
        // Primary colors (brand colors - dark blue theme)
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#2d3748',
          900: '#1a202c',
          950: '#0f1419',
        },
        // Accent colors (gold theme)
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4af37',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        // Light theme colors
        light: {
          bg: '#ffffff',
          text: '#1a1a1a',
          'message-bg-user': '#f0f0f0',
          'message-bg-ai': '#ffffff',
          border: '#e5e5e5',
          'input-bg': '#ffffff',
          hover: '#f5f5f5',
          accent: '#d4af37',
        },
        // Dark theme colors
        dark: {
          bg: '#030712',
          text: '#ffffff',
          'message-bg-user': '#111827',
          'message-bg-ai': '#0a0f1a',
          border: '#10131a',
          'input-bg': '#0a0f1a',
          hover: '#111827',
          accent: '#d4af37',
        },
      },

    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

