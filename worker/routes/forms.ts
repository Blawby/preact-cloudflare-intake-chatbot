import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { contactFormSchema } from '../schemas';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleForms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  try {
    const body = await parseJsonBody(request);
    const validatedData = contactFormSchema.parse(body);

    const formId = crypto.randomUUID();
    
    // Get team info for database insert - use slug to find ULID
    const teamInfo = await env.DB.prepare('SELECT id, slug, name FROM teams WHERE slug = ?').bind(validatedData.teamId).first();
    
    // Store form with optimized query
    await env.DB.prepare(`
      INSERT INTO contact_forms (id, team_id, phone_number, email, matter_details, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(formId, teamInfo?.id || validatedData.teamId, validatedData.phoneNumber, validatedData.email, validatedData.matterDetails).run();

    // Send notifications asynchronously to improve response time
    if (env.RESEND_API_KEY) {
      // Fire and forget - don't wait for email to complete
      (async () => {
        const { EmailService } = await import('../services/EmailService.js');
        const emailService = new EmailService(env.RESEND_API_KEY);
        
        // Send client confirmation and team notification in parallel for better performance
        const promises = [];
        
        // Client confirmation
        promises.push(
          emailService.send({
            from: 'noreply@blawby.com',
            to: validatedData.email,
            subject: 'Thank you for contacting our law firm',
            text: `Thank you for your inquiry. Reference ID: ${formId}. We will contact you within 24 hours.`
          })
        );

        // Team notification using cached config
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const teamConfig = await aiService.getTeamConfig(validatedData.teamId);
        
        if (teamConfig.ownerEmail) {
          promises.push(
            emailService.send({
              from: 'noreply@blawby.com',
              to: teamConfig.ownerEmail,
              subject: `New Lead: ${validatedData.email}`,
              text: `New lead received:\n\nEmail: ${validatedData.email}\nPhone: ${validatedData.phoneNumber}\nMatter: ${validatedData.matterDetails}\nForm ID: ${formId}`
            })
          );
        }
        
        // Wait for all emails to complete
        await Promise.allSettled(promises);
      })().catch(error => {
        console.warn('Email notification failed:', error);
      });
    }

    // Send contact form webhook
    const { AIService } = await import('../services/AIService.js');
    const { WebhookService } = await import('../services/WebhookService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(validatedData.teamId);
    const webhookService = new WebhookService(env);
    
    const contactFormPayload = {
      event: 'contact_form',
      timestamp: new Date().toISOString(),
      teamId: teamInfo?.id || validatedData.teamId, // Use ULID if available, fallback to slug
      teamName: validatedData.teamId, // Human-readable team identifier (slug)
      formId,
      contactForm: {
        email: validatedData.email,
        phoneNumber: validatedData.phoneNumber,
        matterDetails: validatedData.matterDetails,
        urgency: validatedData.urgency,
        status: 'pending'
      }
    };

    // Debug logging for webhook config
    console.warn('Contact form webhook config:', JSON.stringify(teamConfig.webhooks));
    console.warn('Contact form webhook event enabled:', teamConfig.webhooks?.events?.contactForm);

    // Fire and forget webhook - don't wait for completion
    webhookService.sendWebhook(validatedData.teamId, 'contact_form', contactFormPayload, teamConfig)
      .then(() => console.warn('Contact form webhook sent!'))
      .catch(error => console.warn('Contact form webhook failed:', error));

    return createSuccessResponse({
      formId,
      message: 'Form submitted successfully. A lawyer will contact you within 24 hours.'
    }, corsHeaders);

  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 