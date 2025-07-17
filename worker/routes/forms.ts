import { Env } from './health';
import { parseJsonBody } from '../utils';

interface ContactForm {
  email: string;
  phoneNumber: string;
  matterDetails: string;
  teamId: string;
  urgency?: string;
}

export async function handleForms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as ContactForm;
    
    if (!body.email || !body.phoneNumber || !body.matterDetails || !body.teamId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email with optimized regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formId = crypto.randomUUID();
    
    // Store form with optimized query
    await env.DB.prepare(`
      INSERT INTO contact_forms (id, team_id, phone_number, email, matter_details, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(formId, body.teamId, body.phoneNumber, body.email, body.matterDetails).run();

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
            to: body.email,
            subject: 'Thank you for contacting our law firm',
            text: `Thank you for your inquiry. Reference ID: ${formId}. We will contact you within 24 hours.`
          })
        );

        // Team notification using cached config
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const teamConfig = await aiService.getTeamConfig(body.teamId);
        
        if (teamConfig.ownerEmail) {
          promises.push(
            emailService.send({
              from: 'noreply@blawby.com',
              to: teamConfig.ownerEmail,
              subject: `New Lead: ${body.email}`,
              text: `New lead received:\n\nEmail: ${body.email}\nPhone: ${body.phoneNumber}\nMatter: ${body.matterDetails}\nForm ID: ${formId}`
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
    const teamConfig = await aiService.getTeamConfig(body.teamId);
    const webhookService = new WebhookService(env);
    const contactFormPayload = {
      event: 'contact_form',
      timestamp: new Date().toISOString(),
      teamId: body.teamId,
      formId,
      contactForm: {
        email: body.email,
        phoneNumber: body.phoneNumber,
        matterDetails: body.matterDetails,
        urgency: body.urgency,
        status: 'pending'
      }
    };

    // Debug logging for webhook config
    console.warn('Contact form webhook config:', JSON.stringify(teamConfig.webhooks));
    console.warn('Contact form webhook event enabled:', teamConfig.webhooks?.events?.contactForm);

    // Fire and forget webhook - don't wait for completion
    webhookService.sendWebhook(body.teamId, 'contact_form', contactFormPayload, teamConfig)
      .then(() => console.warn('Contact form webhook sent!'))
      .catch(error => console.warn('Contact form webhook failed:', error));

    return new Response(JSON.stringify({
      success: true,
      formId,
      message: 'Form submitted successfully. A lawyer will contact you within 24 hours.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Form error:', error);
    return new Response(JSON.stringify({ error: 'Form submission failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 