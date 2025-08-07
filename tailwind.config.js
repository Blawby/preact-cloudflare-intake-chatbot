/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Use class-based dark mode to match current system
  theme: {
    extend: {
      // Standardized color scheme matching CSS custom properties
      colors: {
        // Primary colors (brand colors - gold theme)
        primary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4af37', // Exact match to --accent-color
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        // Light theme colors (exact matches to CSS variables)
        light: {
          bg: '#ffffff', // --bg-color
          text: '#1a1a1a', // --text-color
          'message-bg-user': '#f0f0f0', // --message-bg-user
          'message-bg-ai': '#ffffff', // --message-bg-ai
          border: '#e5e5e5', // --border-color
          'input-bg': '#ffffff', // --input-bg
          hover: '#f5f5f5', // --hover-color
          accent: '#d4af37', // --accent-color
        },
        // Dark theme colors (exact matches to CSS variables)
        dark: {
          bg: '#030712', // --bg-color
          text: '#ffffff', // --text-color
          'message-bg-user': '#111827', // --message-bg-user
          'message-bg-ai': '#0a0f1a', // --message-bg-ai
          border: '#10131a', // --border-color
          'input-bg': '#0a0f1a', // --input-bg
          hover: '#111827', // --hover-color
          accent: '#d4af37', // --accent-color
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Preserve existing CSS custom properties for backward compatibility
        'bg': 'var(--bg-color)',
        'text': 'var(--text-color)',
        'message-bg-user': 'var(--message-bg-user)',
        'message-bg-ai': 'var(--message-bg-ai)',
        'border': 'var(--border-color)',
        'input-bg': 'var(--input-bg)',
        'hover': 'var(--hover-color)',
        'accent': 'var(--accent-color)',
        'skeleton-start': 'var(--skeleton-start)',
        'skeleton-end': 'var(--skeleton-end)',
      },
      // Preserve existing breakpoints
      screens: {
        'xs': '480px',
        'lg': '1024px',
        'xl': '1024px',
      },
      // Preserve existing spacing and sizing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Preserve existing animations
      keyframes: {
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fadeOut': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'zoomIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'zoomOut': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'loadingDot': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        'skeleton-loading': {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slideDown': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'popIn': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'expandIn': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.3s ease-out',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'fadeOut': 'fadeOut 0.2s ease-out',
        'zoomIn': 'zoomIn 0.2s ease-out',
        'zoomOut': 'zoomOut 0.2s ease-out',
        'loadingDot': 'loadingDot 1.4s ease-in-out infinite both',
        'skeleton-loading': 'skeleton-loading 1.5s ease-in-out infinite',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'popIn': 'popIn 0.2s ease-out',
        'expandIn': 'expandIn 0.3s ease-out',
      },
      // Preserve existing border radius
      borderRadius: {
        'xl': '0.75rem',
      },
      // Preserve existing box shadows
      boxShadow: {
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

