import { Logger } from '../utils/logger.js';

export interface NotificationRequest {
  type: 'lawyer_review' | 'matter_created' | 'payment_required';
  teamConfig: any;
  matterInfo?: {
    type: string;
    complexity?: string;
    description?: string;
  };
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export class NotificationService {
  constructor(private env: any) {}

  async sendLawyerReviewNotification(request: NotificationRequest): Promise<void> {
    const { teamConfig, matterInfo } = request;
    
    try {
      const { EmailService } = await import('./EmailService.js');
      const emailService = new EmailService(this.env);
      
      const ownerEmail = teamConfig?.config?.ownerEmail;
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
      const emailService = new EmailService(this.env);
      
      const ownerEmail = teamConfig?.config?.ownerEmail;
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
      const emailService = new EmailService(this.env);
      
      const ownerEmail = teamConfig?.config?.ownerEmail;
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
