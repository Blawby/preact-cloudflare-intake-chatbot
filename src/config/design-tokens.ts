/**
 * Design Tokens for consistent styling across the application
 * These tokens define spacing, colors, and other design values
 */

export const designTokens = {
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
  },
  colors: {
    primary: 'var(--accent-color)',
    background: 'var(--bg-color)',
    text: 'var(--text-color)',
    border: 'var(--border-color)',
    muted: 'var(--text-muted)',
    hover: 'var(--hover-color)',
  },
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out',
  }
};

export type DesignTokens = typeof designTokens; 