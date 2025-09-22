import { Logger } from './logger.js';
import { CRITICAL_TOOLS, ALERT_THRESHOLDS, type CriticalTool } from './toolConfig.js';

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
    
    // Parameter validation
    if (typeof toolName !== 'string' || toolName.trim().length === 0) {
      Logger.error('❌ Tool Usage Monitor: Invalid toolName parameter', {
        toolName,
        success,
        timestamp: now.toISOString(),
        error: 'toolName must be a non-empty string'
      });
      return;
    }
    
    // Coerce success to boolean if it's not already
    let successValue: boolean;
    if (typeof success === 'boolean') {
      successValue = success;
    } else if (typeof success === 'string') {
      successValue = (success as string).toLowerCase() === 'true';
    } else if (typeof success === 'number') {
      successValue = success !== 0;
    } else {
      Logger.error('❌ Tool Usage Monitor: Invalid success parameter', {
        toolName,
        success,
        timestamp: now.toISOString(),
        error: 'success must be a boolean, string, or number'
      });
      return;
    }
    
    try {
      // Guard against unexpected non-Map state
      if (!(this.stats instanceof Map)) {
        Logger.error('❌ Tool Usage Monitor: stats is not a Map', {
          toolName,
          success: successValue,
          timestamp: now.toISOString(),
          error: 'this.stats is not a Map instance'
        });
        return;
      }
      
      const existing = this.stats.get(toolName);
      
      if (existing) {
        existing.count++;
        existing.lastUsed = now;
        if (!successValue) {
          existing.errors++;
        }
      } else {
        this.stats.set(toolName, {
          toolName,
          count: 1,
          lastUsed: now,
          errors: successValue ? 0 : 1
        });
      }

      // Log tool usage for monitoring
      const currentStats = this.stats.get(toolName);
      Logger.info('🔧 Tool Usage:', {
        toolName,
        success: successValue,
        totalCount: currentStats?.count || 0,
        errorCount: currentStats?.errors || 0,
        timestamp: now.toISOString()
      });
    } catch (error) {
      Logger.error('❌ Tool Usage Monitor: Runtime error in recordToolUsage', {
        toolName,
        success: successValue,
        timestamp: now.toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Get tool usage statistics
   */
  static getStats(): ToolUsageStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get the list of critical tools to monitor
   */
  private static getCriticalTools(): readonly CriticalTool[] {
    return CRITICAL_TOOLS;
  }

  /**
   * Evaluate tool usage and generate appropriate alerts
   */
  private static evaluateToolUsage(toolName: string, stats: ToolUsageStats | undefined): void {
    const now = new Date();
    
    if (!stats) {
      this.logNeverUsed(toolName);
      return;
    }
    
    const hoursSinceLastUse = (now.getTime() - stats.lastUsed.getTime()) / (1000 * 60 * 60);
    
    // Check for stale usage (regardless of count)
    if (hoursSinceLastUse > ALERT_THRESHOLDS.STALE_HOURS) {
      this.logStaleUsage(toolName, stats, hoursSinceLastUse);
    }
    
    // Check error rate only if we have enough calls
    if (stats.count > ALERT_THRESHOLDS.MIN_CALLS_FOR_ERROR_RATE) {
      this.logHighErrorRate(toolName, stats);
    }
  }

  /**
   * Log alert for tools that have never been used
   */
  private static logNeverUsed(toolName: string): void {
    Logger.warn('🚨 Tool Usage Alert:', {
      toolName,
      issue: 'Tool has never been used',
      recommendation: 'Check if tool is properly registered and available',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log alert for tools with stale usage
   */
  private static logStaleUsage(toolName: string, stats: ToolUsageStats, hoursSinceLastUse: number): void {
    Logger.warn('🚨 Tool Usage Alert:', {
      toolName,
      issue: 'Tool has not been used in 24+ hours',
      lastUsed: stats.lastUsed.toISOString(),
      hoursSinceLastUse: Math.round(hoursSinceLastUse),
      totalCalls: stats.count,
      recommendation: 'Check if tool calling logic is working correctly',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log alert for tools with high error rates
   */
  private static logHighErrorRate(toolName: string, stats: ToolUsageStats): void {
    const errorRate = stats.errors / stats.count;
    
    if (errorRate > ALERT_THRESHOLDS.ERROR_RATE_THRESHOLD) {
      Logger.warn('🚨 Tool Error Rate Alert:', {
        toolName,
        errorRate: Math.round(errorRate * 100) + '%',
        totalCalls: stats.count,
        errors: stats.errors,
        recommendation: 'Investigate tool execution failures',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check for alerting conditions
   * In production, this would send alerts to monitoring services
   */
  static checkAlerts(): void {
    const criticalTools = this.getCriticalTools();
    
    for (const toolName of criticalTools) {
      try {
        const stats = this.stats.get(toolName);
        this.evaluateToolUsage(toolName, stats);
      } catch (error) {
        Logger.error('❌ Tool Usage Monitor: Error evaluating tool usage', {
          toolName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
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
