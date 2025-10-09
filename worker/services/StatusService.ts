import type { Env } from '../types.js';

export interface StatusUpdate {
  id: string;
  sessionId: string;
  teamId: string;
  type: 'file_processing' | 'document_analysis' | 'background_task' | 'system_notification' | 'matter_update';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  progress?: number; // 0-100
  data?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface StatusSubscription {
  sessionId: string;
  teamId: string;
  lastSeen: number;
}

export class StatusService {
  private static readonly STATUS_PREFIX = 'status:';
  private static readonly SUBSCRIPTION_PREFIX = 'sub:';
  private static readonly STATUS_TTL = 24 * 60 * 60; // 24 hours
  private static readonly SUBSCRIPTION_TTL = 60 * 60; // 1 hour
  private static readonly DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
  private static readonly MAX_BACKOFF_INTERVAL = 30000; // 30 seconds

  /**
   * Create or update a status entry
   */
  static async setStatus(
    env: Env,
    statusUpdate: Omit<StatusUpdate, 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<void> {
    const now = Date.now();
    const status: StatusUpdate = {
      ...statusUpdate,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + (StatusService.STATUS_TTL * 1000)
    };

    const key = `${StatusService.STATUS_PREFIX}${status.id}`;
    await env.CHAT_SESSIONS.put(key, JSON.stringify(status), {
      expirationTtl: StatusService.STATUS_TTL
    });

    console.log(`Status updated: ${status.type} - ${status.status} for session ${status.sessionId}`);
  }

  /**
   * Get a specific status by ID
   */
  static async getStatus(env: Env, statusId: string): Promise<StatusUpdate | null> {
    const key = `${StatusService.STATUS_PREFIX}${statusId}`;
    const result = await env.CHAT_SESSIONS.get(key);
    
    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result) as StatusUpdate;
    } catch (error) {
      console.error('Failed to parse status:', error);
      return null;
    }
  }

  /**
   * Get all status updates for a session
   */
  static async getSessionStatuses(env: Env, sessionId: string): Promise<StatusUpdate[]> {
    const prefix = `${StatusService.STATUS_PREFIX}`;
    const list = await env.CHAT_SESSIONS.list({ prefix });
    
    const statuses: StatusUpdate[] = [];
    
    // Get all values in parallel for better performance
    const getPromises = list.keys.map(async (keyEntry) => {
      const value = await env.CHAT_SESSIONS.get(keyEntry.name);
      if (!value) return null;
      
      try {
        const status = JSON.parse(value) as StatusUpdate;
        if (status.sessionId === sessionId) {
          return status;
        }
      } catch (error) {
        console.error('Failed to parse status from list:', error);
      }
      return null;
    });
    
    const results = await Promise.all(getPromises);
    const validStatuses = results.filter((status): status is StatusUpdate => status !== null);

    // Sort by creation time, newest first
    return validStatuses.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get recent status updates for a session (since lastSeen timestamp)
   */
  static async getRecentStatuses(
    env: Env, 
    sessionId: string, 
    lastSeen: number
  ): Promise<StatusUpdate[]> {
    const allStatuses = await StatusService.getSessionStatuses(env, sessionId);
    return allStatuses.filter(status => status.updatedAt > lastSeen);
  }

  /**
   * Register a session subscription for real-time updates
   */
  static async subscribeSession(
    env: Env,
    sessionId: string,
    teamId: string
  ): Promise<void> {
    const subscription: StatusSubscription = {
      sessionId,
      teamId,
      lastSeen: Date.now()
    };

    const key = `${StatusService.SUBSCRIPTION_PREFIX}${sessionId}`;
    await env.CHAT_SESSIONS.put(key, JSON.stringify(subscription), {
      expirationTtl: StatusService.SUBSCRIPTION_TTL
    });
  }

  /**
   * Update subscription last seen timestamp
   */
  static async updateSubscriptionLastSeen(
    env: Env,
    sessionId: string,
    lastSeen?: number
  ): Promise<void> {
    const key = `${StatusService.SUBSCRIPTION_PREFIX}${sessionId}`;
    const existing = await env.CHAT_SESSIONS.get(key);
    
    if (existing) {
      try {
        const subscription = JSON.parse(existing) as StatusSubscription;
        subscription.lastSeen = lastSeen ?? Date.now();
        
        await env.CHAT_SESSIONS.put(key, JSON.stringify(subscription), {
          expirationTtl: StatusService.SUBSCRIPTION_TTL
        });
      } catch (error) {
        console.error('Failed to update subscription:', error);
      }
    }
  }

  /**
   * Get configurable polling interval from environment or use default
   */
  static getPollInterval(env: Env): number {
    const envInterval = env.SSE_POLL_INTERVAL;
    if (envInterval && typeof envInterval === 'string') {
      const parsed = parseInt(envInterval, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return StatusService.DEFAULT_POLL_INTERVAL;
  }

  /**
   * Calculate exponential backoff delay with cap
   */
  static calculateBackoffDelay(baseInterval: number, errorCount: number): number {
    const exponentialDelay = baseInterval * Math.pow(2, errorCount);
    return Math.min(exponentialDelay, StatusService.MAX_BACKOFF_INTERVAL);
  }

  /**
   * Unsubscribe a session
   */
  static async unsubscribeSession(env: Env, sessionId: string): Promise<void> {
    const key = `${StatusService.SUBSCRIPTION_PREFIX}${sessionId}`;
    await env.CHAT_SESSIONS.delete(key);
  }

  /**
   * Clean up expired status entries
   */
  static async cleanupExpiredStatuses(env: Env): Promise<number> {
    const prefix = `${StatusService.STATUS_PREFIX}`;
    const list = await env.CHAT_SESSIONS.list({ prefix });
    const now = Date.now();
    let cleaned = 0;

    // Process all keys in parallel for better performance
    const deletePromises = list.keys.map(async (keyEntry) => {
      const value = await env.CHAT_SESSIONS.get(keyEntry.name);
      if (!value) return false;
      
      try {
        const status = JSON.parse(value) as StatusUpdate;
        if (status.expiresAt < now) {
          await env.CHAT_SESSIONS.delete(keyEntry.name);
          return true;
        }
      } catch (_error) {
        // If we can't parse it, delete it
        await env.CHAT_SESSIONS.delete(keyEntry.name);
        return true;
      }
      return false;
    });
    
    const results = await Promise.all(deletePromises);
    cleaned = results.filter(Boolean).length;

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired status entries`);
    }

    return cleaned;
  }

  /**
   * Create a status update for file processing
   */
  static async createFileProcessingStatus(
    env: Env,
    sessionId: string,
    teamId: string,
    fileName: string,
    status: StatusUpdate['status'] = 'pending',
    progress?: number
  ): Promise<string> {
    const statusId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await StatusService.setStatus(env, {
      id: statusId,
      sessionId,
      teamId,
      type: 'file_processing',
      status,
      message: `Processing ${fileName}...`,
      progress,
      data: { fileName }
    });

    return statusId;
  }

  /**
   * Create a status update for document analysis
   */
  static async createDocumentAnalysisStatus(
    env: Env,
    sessionId: string,
    teamId: string,
    documentName: string,
    status: StatusUpdate['status'] = 'pending',
    progress?: number
  ): Promise<string> {
    const statusId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await StatusService.setStatus(env, {
      id: statusId,
      sessionId,
      teamId,
      type: 'document_analysis',
      status,
      message: `Analyzing ${documentName}...`,
      progress,
      data: { documentName }
    });

    return statusId;
  }

  /**
   * Create a system notification
   */
  static async createSystemNotification(
    env: Env,
    sessionId: string,
    teamId: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<string> {
    const statusId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await StatusService.setStatus(env, {
      id: statusId,
      sessionId,
      teamId,
      type: 'system_notification',
      status: 'completed',
      message,
      data
    });

    return statusId;
  }
}
