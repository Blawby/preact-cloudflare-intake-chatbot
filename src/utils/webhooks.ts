interface WebhookConfig {
  enabled: boolean;
  url: string;
  secret: string;
  events: {
    matterCreation: boolean;
    matterDetails: boolean;
    contactForm: boolean;
    appointment: boolean;
  };
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
  };
}

interface WebhookPayload {
  event: 'matterCreation' | 'matterDetails' | 'contactForm' | 'appointment';
  timestamp: string;
  sessionId: string;
  teamId: string;
  data: any;
}

/**
 * Send webhook data to the configured endpoint
 */
export async function sendWebhook(
  webhookConfig: WebhookConfig,
  event: 'matterCreation' | 'matterDetails' | 'contactForm' | 'appointment',
  data: any,
  sessionId: string,
  teamId: string
): Promise<boolean> {
  // Check if webhooks are enabled and this event is configured
  if (!webhookConfig.enabled || !webhookConfig.events[event]) {
    console.log(`Webhook ${event} not enabled or configured`);
    return false;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    sessionId,
    teamId,
    data
  };

  // Add webhook secret to headers for authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': webhookConfig.secret,
    'User-Agent': 'Blawby-Chatbot/1.0'
  };

  let retries = 0;
  const maxRetries = webhookConfig.retryConfig.maxRetries;

  while (retries <= maxRetries) {
    try {
      console.log(`Sending webhook ${event} to ${webhookConfig.url}`, payload);
      
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`Webhook ${event} sent successfully`);
        return true;
      } else {
        console.warn(`Webhook ${event} failed with status ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      retries++;
      console.error(`Webhook ${event} attempt ${retries} failed:`, error);
      
      if (retries <= maxRetries) {
        const delay = webhookConfig.retryConfig.retryDelay * 1000 * retries; // Exponential backoff
        console.log(`Retrying webhook ${event} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`Webhook ${event} failed after ${maxRetries} retries`);
        return false;
      }
    }
  }

  return false;
}

/**
 * Send contact form webhook
 */
export async function sendContactFormWebhook(
  webhookConfig: WebhookConfig,
  formData: any,
  sessionId: string,
  teamId: string
): Promise<boolean> {
  return sendWebhook(webhookConfig, 'contactForm', {
    contactInfo: {
      email: formData.email,
      phone: formData.phone,
      name: formData.name || 'Not provided'
    },
    matterDetails: formData.matterDetails,
    urgency: formData.urgency,
    location: formData.location,
    additionalInfo: formData.additionalInfo,
    submittedAt: new Date().toISOString()
  }, sessionId, teamId);
}

/**
 * Send matter creation webhook
 */
export async function sendMatterCreationWebhook(
  webhookConfig: WebhookConfig,
  matterData: any,
  sessionId: string,
  teamId: string
): Promise<boolean> {
  return sendWebhook(webhookConfig, 'matterCreation', {
    matterType: matterData.matterType,
    description: matterData.description,
    urgency: matterData.urgency,
    location: matterData.location,
    additionalInfo: matterData.additionalInfo,
    aiAnswers: matterData.aiAnswers,
    matterSummary: matterData.matterSummary,
    qualityScore: matterData.qualityScore,
    contactInfo: matterData.contactInfo,
    createdAt: new Date().toISOString()
  }, sessionId, teamId);
}

/**
 * Send appointment webhook
 */
export async function sendAppointmentWebhook(
  webhookConfig: WebhookConfig,
  appointmentData: any,
  sessionId: string,
  teamId: string
): Promise<boolean> {
  return sendWebhook(webhookConfig, 'appointment', {
    scheduledDateTime: appointmentData.scheduledDateTime,
    timeSlot: appointmentData.timeSlot,
    service: appointmentData.service,
    contactInfo: appointmentData.contactInfo,
    notes: appointmentData.notes,
    scheduledAt: new Date().toISOString()
  }, sessionId, teamId);
} 