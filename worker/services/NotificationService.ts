import { Logger } from '../utils/logger.js';
import type { Env } from '../types.js';
import type { Team } from './TeamService.js';

export interface NotificationRequest {
  type: 'lawyer_review' | 'matter_created' | 'payment_required';
  teamConfig: Team | null;
  matterInfo?: {
    type: string;
    urgency?: string;
    complexity?: string;
    description?: string;
  };
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Safely extracts owner email from team configuration
 * @param teamConfig - Team configuration object
 * @returns Owner email string or undefined if not available
 */
function extractOwnerEmail(teamConfig: Team | null): string | undefined {
  if (!teamConfig?.config?.ownerEmail) {
    return undefined;
  }
  
  const ownerEmail = teamConfig.config.ownerEmail;
  if (typeof ownerEmail !== 'string' || ownerEmail.trim().length === 0) {
    return undefined;
  }
  
  return ownerEmail.trim();
}

export class NotificationService {
  constructor(private env: Env) {
    // Initialize Logger with environment variables for Cloudflare Workers compatibility
    Logger.initialize({
      DEBUG: env.DEBUG,
      NODE_ENV: env.NODE_ENV
    });
  }

  async sendLawyerReviewNotification(request: NotificationRequest): Promise<void> {
    const { teamConfig, matterInfo } = request;
    
    try {
      const { EmailService } = await import('./EmailService.js');
      const emailService = new EmailService(this.env.RESEND_API_KEY);
      
      const ownerEmail = extractOwnerEmail(teamConfig);
      if (!ownerEmail) {
        Logger.info('No owner email configured for team - skipping lawyer review notification');
        return;
      }

      await emailService.send({
        from: 'noreply@blawby.com',
        to: ownerEmail,
        subject: `Urgent Legal Matter Review Required - ${matterInfo?.type || 'Unknown'}`,
        text: `A new urgent legal matter requires immediate review:

Matter Type: ${matterInfo?.type || 'Unknown'}
Urgency: ${matterInfo?.urgency || 'Standard'}
Complexity: ${matterInfo?.complexity || 'Standard'}
Description: ${matterInfo?.description || 'No description provided'}

Please review this matter as soon as possible.`
      });

      Logger.info('Lawyer review notification sent successfully');
    } catch (error) {
      Logger.warn('Failed to send lawyer review notification:', error);
    }
  }

  async sendMatterCreatedNotification(request: NotificationRequest): Promise<void> {
    const { teamConfig, matterInfo, clientInfo } = request;
    
    try {
      const { EmailService } = await import('./EmailService.js');
      const emailService = new EmailService(this.env.RESEND_API_KEY);
      
      const ownerEmail = extractOwnerEmail(teamConfig);
      if (!ownerEmail) {
        Logger.info('No owner email configured for team - skipping matter creation notification');
        return;
      }

      await emailService.send({
        from: 'noreply@blawby.com',
        to: ownerEmail,
        subject: `New Legal Matter Created - ${matterInfo?.type || 'Unknown'}`,
        text: `A new legal matter has been created:

Client: ${clientInfo?.name || 'Unknown'}
Contact: ${clientInfo?.email || 'No email'}, ${clientInfo?.phone || 'No phone'}
Matter Type: ${matterInfo?.type || 'Unknown'}
Description: ${matterInfo?.description || 'No description provided'}
Urgency: ${matterInfo?.urgency || 'Standard'}

Please review and take appropriate action.`
      });

      Logger.info('Matter creation notification sent successfully');
    } catch (error) {
      Logger.warn('Failed to send matter creation notification:', error);
    }
  }

  async sendPaymentRequiredNotification(request: NotificationRequest): Promise<void> {
    const { teamConfig, matterInfo, clientInfo } = request;
    
    try {
      const { EmailService } = await import('./EmailService.js');
      const emailService = new EmailService(this.env.RESEND_API_KEY);
      
      const ownerEmail = extractOwnerEmail(teamConfig);
      if (!ownerEmail) {
        Logger.info('No owner email configured for team - skipping payment notification');
        return;
      }

      await emailService.send({
        from: 'noreply@blawby.com',
        to: ownerEmail,
        subject: `Payment Required - ${matterInfo?.type || 'Unknown'} Matter`,
        text: `A payment is required for a new legal matter:

Client: ${clientInfo?.name || 'Unknown'}
Contact: ${clientInfo?.email || 'No email'}, ${clientInfo?.phone || 'No phone'}
Matter Type: ${matterInfo?.type || 'Unknown'}
Description: ${matterInfo?.description || 'No description provided'}

Payment link has been sent to the client. Please monitor payment status.`
      });

      Logger.info('Payment required notification sent successfully');
    } catch (error) {
      Logger.warn('Failed to send payment required notification:', error);
    }
  }
}
