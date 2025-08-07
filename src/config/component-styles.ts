/**
 * Component Styles - Reusable Tailwind class patterns
 * These patterns ensure consistent styling across all components
 */

export const componentStyles = {
  // Layout containers
  pageContainer: 'p-4 h-full overflow-y-auto',
  headerContainer: 'flex justify-between items-center mb-6 pb-4 border-b border-border',
  title: 'text-2xl font-semibold text-text m-0',
  subtitle: 'text-lg font-medium text-text mb-2',
  
  // Cards
  card: 'bg-background border border-border rounded-lg p-4 cursor-pointer transition-all duration-200 shadow-sm hover:border-primary hover:shadow-md hover:-translate-y-0.5',
  cardHeader: 'mb-3',
  cardTitle: 'flex justify-between items-start mb-2',
  cardContent: 'space-y-2',
  cardFooter: 'mt-4 pt-3 border-t border-border',
  
  // Lists
  listContainer: 'space-y-4',
  listItem: 'bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors',
  listItemSelected: 'bg-background border-2 border-primary rounded-lg p-4',
  
  // Status badges
  statusBadge: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
  statusPending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  statusApproved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  statusRejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  statusDraft: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  statusSubmitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  
  // Empty states
  emptyState: 'flex flex-col items-center justify-center text-center py-12 px-4 text-text',
  emptyIcon: 'w-16 h-16 mb-4 opacity-50 text-muted',
  emptyTitle: 'text-xl font-semibold mb-2 text-text',
  emptyDescription: 'text-sm mb-6 opacity-80 max-w-sm',
  
  // Loading states
  loadingContainer: 'flex justify-center items-center h-48',
  loadingText: 'text-sm text-muted',
  
  // Buttons
  buttonPrimary: 'bg-primary text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity',
  buttonSecondary: 'bg-background border border-border text-text px-4 py-2 rounded-md hover:bg-hover transition-colors',
  buttonGhost: 'text-text hover:bg-hover px-4 py-2 rounded-md transition-colors',
  
  // Forms
  input: 'w-full px-3 py-2 border border-border rounded-md bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
  textarea: 'w-full px-3 py-2 border border-border rounded-md bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none',
  
  // Navigation
  navItem: 'flex items-center px-3 py-2 rounded-md text-text hover:bg-hover transition-colors',
  navItemActive: 'flex items-center px-3 py-2 rounded-md bg-primary text-white',
  
  // Grid layouts
  gridContainer: 'grid gap-4',
  gridCols1: 'grid-cols-1',
  gridCols2: 'grid-cols-2',
  gridCols3: 'grid-cols-3',
  gridColsAuto: 'grid-cols-auto',
  gridColsAutoFill: 'grid-cols-auto-fill',
  
  // Responsive
  responsiveGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  responsiveContainer: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // Spacing utilities
  spaceY: {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
  
  // Text utilities
  text: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  },
  
  // Font weights
  font: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }
};

export type ComponentStyles = typeof componentStyles; 