/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Use class-based dark mode to match current system
  theme: {
    extend: {
      // Preserve existing CSS custom properties
      colors: {
        // Map existing CSS variables to Tailwind colors
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
  plugins: [],
}

