import { TeamConfig, Env } from './AIService.js';

// Webhook Service for secure webhook delivery
export class WebhookService {
  constructor(private env: Env) {}

  // Simplified webhook handling - agent handles complex logic

  // Simplified webhook sending
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

    const webhookUrl = teamConfig.webhooks.url;
    const payloadString = JSON.stringify(payload);

    // Send webhook
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Blawby-Webhook/1.0',
        'X-Webhook-Event': webhookType,
        'X-Webhook-Timestamp': new Date().toISOString(),
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`Webhook failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send webhook:', error);
    }
  }

  // Agent handles retry logic - no manual retry needed
} 