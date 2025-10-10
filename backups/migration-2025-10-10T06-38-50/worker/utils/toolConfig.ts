/**
 * Configuration for tool usage monitoring
 */

/**
 * Critical tools that should be monitored for usage patterns
 * These tools are essential for the application's core functionality
 */
export const CRITICAL_TOOLS = [
  'show_contact_form',
  'create_matter'
] as const;

/**
 * Alert thresholds for tool monitoring
 */
export const ALERT_THRESHOLDS = {
  /** Hours after which a tool is considered stale if not used */
  STALE_HOURS: 24,
  /** Minimum number of calls before computing error rate */
  MIN_CALLS_FOR_ERROR_RATE: 10,
  /** Error rate threshold (0.5 = 50%) */
  ERROR_RATE_THRESHOLD: 0.5
} as const;

export type CriticalTool = typeof CRITICAL_TOOLS[number];
