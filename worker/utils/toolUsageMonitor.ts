import { Logger } from './logger.js';

/**
 * Simple tool usage monitoring for alerting
 * In production, this could be integrated with external monitoring services
 */

interface ToolUsageStats {
  toolName: string;
  count: number;
  lastUsed: Date;
  errors: number;
}

class ToolUsageMonitor {
  private static stats: Map<string, ToolUsageStats> = new Map();
  private static readonly ALERT_THRESHOLD = 0; // Alert if tool usage drops to 0 over 24h
  private static readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record tool usage
   */
  static recordToolUsage(toolName: string, success: boolean = true): void {
    const now = new Date();
    const existing = this.stats.get(toolName);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = now;
      if (!success) {
        existing.errors++;
      }
    } else {
      this.stats.set(toolName, {
        toolName,
        count: 1,
        lastUsed: now,
        errors: success ? 0 : 1
      });
    }

    // Log tool usage for monitoring
    Logger.info('🔧 Tool Usage:', {
      toolName,
      success,
      totalCount: this.stats.get(toolName)?.count || 0,
      errorCount: this.stats.get(toolName)?.errors || 0,
      timestamp: now.toISOString()
    });
  }

  /**
   * Get tool usage statistics
   */
  static getStats(): ToolUsageStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Check for alerting conditions
   * In production, this would send alerts to monitoring services
   */
  static checkAlerts(): void {
    const now = new Date();
    const criticalTools = ['show_contact_form', 'create_matter'];
    
    for (const toolName of criticalTools) {
      const stats = this.stats.get(toolName);
      
      if (!stats) {
        // Tool has never been used - this might be a problem
        Logger.warn('🚨 Tool Usage Alert:', {
          toolName,
          issue: 'Tool has never been used',
          recommendation: 'Check if tool is properly registered and available'
        });
        continue;
      }
      
      const hoursSinceLastUse = (now.getTime() - stats.lastUsed.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastUse > 24 && stats.count === 0) {
        Logger.warn('🚨 Tool Usage Alert:', {
          toolName,
          issue: 'Tool has not been used in 24+ hours',
          lastUsed: stats.lastUsed.toISOString(),
          hoursSinceLastUse: Math.round(hoursSinceLastUse),
          recommendation: 'Check if tool calling logic is working correctly'
        });
      }
      
      // Check error rate
      const errorRate = stats.errors / stats.count;
      if (stats.count > 10 && errorRate > 0.5) {
        Logger.warn('🚨 Tool Error Rate Alert:', {
          toolName,
          errorRate: Math.round(errorRate * 100) + '%',
          totalCalls: stats.count,
          errors: stats.errors,
          recommendation: 'Investigate tool execution failures'
        });
      }
    }
  }

  /**
   * Reset statistics (useful for testing)
   */
  static reset(): void {
    this.stats.clear();
  }
}

export { ToolUsageMonitor };
