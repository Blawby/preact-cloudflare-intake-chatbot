import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { runIntakeChain } from '../chains/intakeChain';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleAgent(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  try {
    const body = await parseJsonBody(request);
    const { messages, teamId, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      throw HttpErrors.badRequest('Messages array is required');
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || !latestMessage.content) {
      throw HttpErrors.badRequest('No message content provided');
    }

    // Run the intake chain
    const result = await runIntakeChain({
      message: latestMessage.content,
      messages: messages,
      teamId,
      sessionId,
      env
    });

    // Handle actions from the chain
    if (result.actions && result.actions.length > 0) {
      for (const action of result.actions) {
        switch (action.name) {
          case 'request_lawyer_approval':
            await handleLawyerApproval(env, action.parameters, teamId);
            break;
          case 'schedule_consultation':
            await handleScheduleConsultation(env, action.parameters, teamId);
            break;
          case 'send_information_packet':
            await handleSendInformation(env, action.parameters, teamId);
            break;
          case 'send_urgent_notification':
            await handleUrgentNotification(env, action.parameters, teamId);
            break;
        }
      }
    }

    return createSuccessResponse({
      response: result.response,
      workflow: result.workflow,
      actions: result.actions || [],
      metadata: result.metadata || {},
      sessionId
    }, corsHeaders);

  } catch (error) {
    return handleError(error, corsHeaders);
  }
}

async function handleLawyerApproval(env: Env, params: any, teamId: string) {
  // Implementation for lawyer approval action
  console.log('Lawyer approval requested:', params);
  
  try {
    // Get team config for notification
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(teamId);
    
    if (teamConfig.ownerEmail && env.RESEND_API_KEY) {
      const { EmailService } = await import('../services/EmailService.js');
      const emailService = new EmailService(env.RESEND_API_KEY);
      
      await emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: 'New Matter Requires Review',
        text: `A new legal matter requires your review.\n\nMatter Details: ${JSON.stringify(params, null, 2)}`
      });
    } else {
      console.log('Email service not configured - skipping email notification');
    }
  } catch (error) {
    console.warn('Failed to send lawyer approval email:', error);
    // Don't fail the request if email fails
  }
}

async function handleScheduleConsultation(env: Env, params: any, teamId: string) {
  // Implementation for scheduling consultation
  console.log('Consultation scheduling requested:', params);
  
  // This would integrate with your existing scheduling system
  // For now, just log the request
}

async function handleSendInformation(env: Env, params: any, teamId: string) {
  // Implementation for sending information packet
  console.log('Information packet requested:', params);
  
  // This would send relevant legal information to the client
  // For now, just log the request
}

async function handleUrgentNotification(env: Env, params: any, teamId: string) {
  // Implementation for urgent notifications
  console.log('Urgent notification requested:', params);
  
  try {
    // Get team config for urgent notification
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(teamId);
    
    if (teamConfig.ownerEmail && env.RESEND_API_KEY) {
      const { EmailService } = await import('../services/EmailService.js');
      const emailService = new EmailService(env.RESEND_API_KEY);
      
      await emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: 'URGENT: Legal Matter Requires Immediate Attention',
        text: `URGENT: A legal matter requires immediate attention.\n\nMatter Details: ${JSON.stringify(params, null, 2)}`
      });
    } else {
      console.log('Email service not configured - skipping urgent notification');
    }
  } catch (error) {
    console.warn('Failed to send urgent notification email:', error);
    // Don't fail the request if email fails
  }
} 