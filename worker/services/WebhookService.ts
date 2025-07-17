import { TeamConfig, Env } from './AIService.js';

// Webhook Service for secure webhook delivery
export class WebhookService {
  constructor(private env: Env) {}

  // Generate HMAC-SHA256 signature using Web Crypto API
  private async generateHMACSHA256(message: string, key: string): Promise<string> {
    // Convert string key to Uint8Array
    const keyBytes = new TextEncoder().encode(key);
    const messageBytes = new TextEncoder().encode(message);

    // Import the HMAC key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    // Sign the message
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageBytes,
    );

    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Generate a webhook signature for client-side use (Stripe-like format)
  private async generateWebhookSignature(payload: string, signingKey: string, timestamp: number | null = null): Promise<string> {
    // Use current timestamp if not provided
    if (timestamp === null || timestamp === undefined) {
      timestamp = Math.floor(Date.now() / 1000);
    }

    // Create signed payload (timestamp.payload)
    const signedPayload = `${timestamp}.${payload}`;

    // Generate HMAC-SHA256 signature
    const signature = await this.generateHMACSHA256(signedPayload, signingKey);

    // Return in Stripe-like format
    return `t=${timestamp},v1=${signature}`;
  }

  // Extract signing key from webhook secret (matches Laravel logic)
  private extractSigningKeyFromSecret(webhookSecret: string): string {
    // If it's a signed secret (starts with wh_), extract the signature part as signing key
    if (webhookSecret.startsWith('wh_')) {
      const parts = webhookSecret.split('.');
      if (parts.length >= 2) {
        // Use the signature part (first 12 characters of HMAC) as the signing key
        const signature = parts[0].replace('wh_', '');
        return signature;
      }
    }
    
    // If it's a simple secret, return as-is
    return webhookSecret;
  }

  // Send webhook with retry logic
  async sendWebhook(
    teamId: string,
    webhookType: 'matter_creation' | 'matter_details' | 'contact_form' | 'appointment',
    payload: any,
    teamConfig: TeamConfig
  ): Promise<void> {
    // Check if webhooks are enabled and configured
    if (!teamConfig.webhooks?.enabled || !teamConfig.webhooks?.url) {
      console.log(`Webhooks not enabled for team ${teamId}`);
      return;
    }

    // Check if this specific event type is enabled
    const eventEnabled = teamConfig.webhooks.events?.[
      webhookType === 'matter_creation' ? 'matterCreation' :
      webhookType === 'matter_details' ? 'matterDetails' :
      webhookType === 'contact_form' ? 'contactForm' :
      'appointment'
    ];

    if (!eventEnabled) {
      console.log(`Webhook event ${webhookType} not enabled for team ${teamId}`);
      return;
    }

    const webhookId = crypto.randomUUID();
    const webhookUrl = teamConfig.webhooks.url;
    const payloadString = JSON.stringify(payload);

    // Generate signature if secret is provided
    let signature = '';
    if (teamConfig.webhooks.secret) {
      const signingKey = this.extractSigningKeyFromSecret(teamConfig.webhooks.secret);
      signature = await this.generateWebhookSignature(payloadString, signingKey);
    }

    // Log webhook attempt (create table if it doesn't exist)
    try {
      await this.env.DB.prepare(`
        INSERT INTO webhook_logs (id, team_id, webhook_type, webhook_url, payload, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(webhookId, teamId, webhookType, webhookUrl, payloadString).run();
    } catch (error) {
      console.warn('Failed to log webhook attempt:', error);
      // Continue with webhook delivery even if logging fails
    }

    // Send webhook
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Blawby-Webhook/1.0',
        'X-Webhook-ID': webhookId,
        'X-Webhook-Event': webhookType,
        'X-Webhook-Timestamp': new Date().toISOString(),
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseBody = await response.text();

        // Update webhook log with result
        try {
          if (response.ok) {
            await this.env.DB.prepare(`
              UPDATE webhook_logs 
              SET status = 'success', http_status = ?, response_body = ?, completed_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).bind(response.status, responseBody, webhookId).run();
          } else {
            await this.env.DB.prepare(`
              UPDATE webhook_logs 
              SET status = 'failed', http_status = ?, response_body = ?, error_message = ?, updated_at = datetime('now')
              WHERE id = ?
            `).bind(response.status, responseBody, `HTTP ${response.status}: ${response.statusText}`, webhookId).run();
            
            // Schedule retry if configured
            await this.scheduleRetry(webhookId, teamConfig);
          }
        } catch (error) {
          console.warn('Failed to update webhook log:', error);
        }

      } catch (error) {
        clearTimeout(timeout);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        try {
          await this.env.DB.prepare(`
            UPDATE webhook_logs 
            SET status = 'failed', error_message = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(errorMessage, webhookId).run();
          
          // Schedule retry if configured
          await this.scheduleRetry(webhookId, teamConfig);
        } catch (dbError) {
          console.warn('Failed to update webhook log on error:', dbError);
        }
      }
    } catch (outerError) {
      console.warn('Failed to send webhook:', outerError);
    }
  }

  // Schedule webhook retry with exponential backoff
  private async scheduleRetry(webhookId: string, teamConfig: TeamConfig): Promise<void> {
    const maxRetries = teamConfig.webhooks?.retryConfig?.maxRetries || 3;
    const baseDelay = teamConfig.webhooks?.retryConfig?.retryDelay || 60; // 1 minute default

    // Get current retry count
    const webhookLog = await this.env.DB.prepare(
      'SELECT retry_count FROM webhook_logs WHERE id = ?'
    ).bind(webhookId).first();

    const currentRetryCount = (webhookLog?.retry_count as number) || 0;

    if (currentRetryCount < maxRetries) {
      // Calculate next retry time with exponential backoff
      const delaySeconds = baseDelay * Math.pow(2, currentRetryCount);
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

      await this.env.DB.prepare(`
        UPDATE webhook_logs 
        SET status = 'retry', retry_count = ?, next_retry_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(currentRetryCount + 1, nextRetryAt.toISOString(), webhookId).run();

      console.log(`Scheduled webhook retry ${currentRetryCount + 1}/${maxRetries} for ${webhookId} at ${nextRetryAt.toISOString()}`);
    } else {
      console.log(`Max retries reached for webhook ${webhookId}`);
    }
  }
} 