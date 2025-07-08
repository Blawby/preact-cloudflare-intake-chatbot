/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  teamId?: string;
  sessionId?: string;
}

interface ContactFormSubmission {
  email: string;
  phoneNumber: string;
  caseDetails: string;
  teamId: string;
  conversationId?: string;
}

interface CaseCreationRequest {
  teamId: string;
  service: string;
  step: 'service-selection' | 'ai-questions' | 'case-details' | 'urgency-selection';
  currentQuestionIndex?: number;
  answers?: Record<string, string>;
  description?: string;
  urgency?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API routes
      if (path.startsWith('/api/chat')) {
        return handleChat(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/teams')) {
        return handleTeams(request, env, corsHeaders);
      }

      if (path.startsWith('/api/forms')) {
        return handleForms(request, env, corsHeaders);
      }

      if (path.startsWith('/api/case-creation')) {
        return handleCaseCreation(request, env, corsHeaders);
      }

      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          environment: 'production'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Favicon
      if (path === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }

      // Root route - API documentation
      if (path === '/') {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blawby AI Chatbot API</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .endpoint { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb; }
        .method { font-weight: bold; color: #059669; }
        .url { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .description { color: #6b7280; margin-top: 5px; }
        .example { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 14px; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.ok { background: #dcfce7; color: #166534; }
        .status.error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <h1>🤖 Blawby AI Chatbot API</h1>
    <p>Welcome to the Blawby AI Chatbot API. This service provides AI-powered legal assistance through Cloudflare Workers AI.</p>
    
    <h2>📋 Available Endpoints</h2>
    
    <div class="endpoint">
        <div class="method">GET</div>
        <div class="url">/api/health</div>
        <div class="description">Health check endpoint to verify API status</div>
        <div class="example">
curl -X GET "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/health"
        </div>
    </div>

    <div class="endpoint">
        <div class="method">GET</div>
        <div class="url">/api/teams</div>
        <div class="description">Retrieve available law firm teams and their configurations</div>
        <div class="example">
curl -X GET "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams"
        </div>
    </div>

    <div class="endpoint">
        <div class="method">POST</div>
        <div class="url">/api/chat</div>
        <div class="description">Send messages to the AI legal assistant and receive responses</div>
        <div class="example">
curl -X POST "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, I need help with a legal question about contracts."}
    ],
    "teamId": "test-team",
    "sessionId": "optional-session-id"
  }'
        </div>
    </div>

    <h2>🔧 API Status</h2>
    <div class="status ok">✅ API is operational</div>
    <div class="status ok">✅ AI Model: Llama 3.1 8B</div>
    <div class="status ok">✅ Database: D1 (your-ai-chatbot)</div>
    <div class="status ok">✅ KV Storage: Chat Sessions</div>

    <h2>📚 Documentation</h2>
    <p>This API is designed to integrate with the Blawby AI legal assistant frontend. For more information about the project, see the <a href="https://github.com/your-repo/preact-chat-gpt-interface" target="_blank">GitHub repository</a>.</p>

    <h2>🔗 Integration</h2>
    <p>To integrate with your frontend application, use the endpoints above with proper CORS headers. The API supports cross-origin requests and returns JSON responses.</p>

    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>Blawby AI Chatbot API • Powered by Cloudflare Workers AI</p>
    </footer>
</body>
</html>`;
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await request.json() as ChatRequest;
      
      // Validate input
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request: messages array is required and must not be empty' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate message format
      for (const message of body.messages) {
        if (!message.role || !message.content) {
          return new Response(JSON.stringify({ 
            error: 'Invalid message format: each message must have role and content' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Get team configuration if teamId is provided
      let teamConfig = null;
      if (body.teamId) {
        // Query the database for the team config
        const teamRow = await env.DB.prepare(`SELECT id, name, config FROM teams WHERE id = ?`).bind(body.teamId).first();
        if (teamRow) {
          let configObj = {};
          try {
            configObj = JSON.parse(teamRow.config);
          } catch (e) {
            console.warn('Failed to parse team config JSON:', e);
          }
          teamConfig = {
            id: teamRow.id,
            name: teamRow.name,
            config: configObj
          };
        }
      }

      // Enhanced intent detection
      const lastUserMessage = body.messages[body.messages.length - 1]?.content || '';
      const lowerMessage = lastUserMessage.toLowerCase();
      
      let detectedIntent = 'general_inquiry';
      
      // Check for urgent legal help / consultation requests
      if (lowerMessage.includes('lawyer') || lowerMessage.includes('attorney') || lowerMessage.includes('legal help') || 
          lowerMessage.includes('asap') || lowerMessage.includes('urgent') || lowerMessage.includes('emergency') ||
          lowerMessage.includes('need help') || lowerMessage.includes('talk to') || lowerMessage.includes('speak with')) {
        detectedIntent = 'schedule_consultation';
      } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || lowerMessage.includes('consultation')) {
        detectedIntent = 'schedule_consultation';
      } else if (lowerMessage.includes('services') || lowerMessage.includes('practice areas') || lowerMessage.includes('specialties') ||
                 lowerMessage.includes('what do you do') || lowerMessage.includes('types of cases')) {
        detectedIntent = 'learn_services';
      } else if (lowerMessage.includes('contact form') || lowerMessage.includes('fill out form') || lowerMessage.includes('submit form') ||
                 lowerMessage.includes('application') || lowerMessage.includes('apply for')) {
        detectedIntent = 'contact_form';
      }

      // Create team-specific system prompt with intent awareness
      const systemPrompt = teamConfig 
        ? `You are a concise legal assistant for ${teamConfig.name}. Keep responses brief (2-3 sentences max) and actionable. Focus on immediate next steps. Always remind users you're an AI assistant and recommend consulting a qualified attorney.${teamConfig.config.requiresPayment ? ` Consultation fee: $${teamConfig.config.consultationFee}.` : ' Free consultation available.'}`
        : 'You are a concise legal assistant for Blawby AI. Keep responses brief (2-3 sentences max) and actionable. Focus on immediate next steps. Always remind users you\'re an AI assistant and recommend consulting a qualified attorney.';

      // Generate intent-aware response - ALWAYS encourage form completion
      let aiResponse;
      
      if (detectedIntent === 'schedule_consultation') {
        // Urgent consultation requests
        aiResponse = {
          response: `I understand you need immediate legal assistance. Let me connect you with one of our attorneys right away. What's your email address?`,
          intent: detectedIntent,
          shouldStartForm: true
        };
      } else if (detectedIntent === 'learn_services') {
        // Service inquiries - provide info then collect contact
        aiResponse = {
          response: `Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. For personalized legal advice, I'd recommend speaking directly with one of our attorneys. Let me help you get in touch with them. What's your email address?`,
          intent: detectedIntent,
          shouldStartForm: true
        };
      } else if (detectedIntent === 'contact_form') {
        // Direct form requests
        aiResponse = {
          response: `Perfect! I can help you with our contact form. I'll need your email address, phone number, and some details about your case. Let's start with your email address.`,
          intent: detectedIntent,
          shouldStartForm: true
        };
      } else {
        // General inquiries - encourage form completion
        aiResponse = {
          response: `I understand you need legal assistance. To provide you with the best help, I'd like to connect you with one of our qualified attorneys. What's your email address so they can get back to you?`,
          intent: detectedIntent,
          shouldStartForm: true
        };
      }

      // Include payment info if payment is required
      const responseData: any = {
        response: aiResponse.response,
        intent: aiResponse.intent,
        shouldStartForm: aiResponse.shouldStartForm,
        timestamp: new Date().toISOString(),
        sessionId: body.sessionId || null
      };

      // Add payment information if team requires payment
      if (teamConfig && teamConfig.config?.requiresPayment) {
        responseData.payment = {
          required: true,
          amount: teamConfig.config.consultationFee,
          paymentLink: teamConfig.config.paymentLink || null
        };
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('AI Error:', error);
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleForms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await request.json() as ContactFormSubmission;
      
      // Validate required fields
      if (!body.email || !body.phoneNumber || !body.caseDetails || !body.teamId) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: email, phoneNumber, caseDetails, teamId' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid email format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate phone number
      const phoneDigits = body.phoneNumber.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return new Response(JSON.stringify({ 
          error: 'Invalid phone number format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate unique ID for the form submission
      const formId = crypto.randomUUID();
      
      // Insert form submission into database
      const result = await env.DB.prepare(`
        INSERT INTO contact_forms (
          id, conversation_id, team_id, phone_number, email, case_details, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        formId,
        body.conversationId || null,
        body.teamId,
        body.phoneNumber,
        body.email,
        body.caseDetails
      ).run();

      if (result.success) {
        // Get team configuration to send notifications
        const teamRow = await env.DB.prepare(`SELECT id, name, config FROM teams WHERE id = ?`).bind(body.teamId).first();
        let teamConfig = null;
        if (teamRow) {
          let configObj = {};
          try {
            configObj = JSON.parse(teamRow.config);
          } catch (e) {
            console.warn('Failed to parse team config JSON:', e);
          }
          teamConfig = {
            id: teamRow.id,
            name: teamRow.name,
            config: configObj
          };
        }
        if (teamConfig) {
          try {
            await sendEmailNotifications(body, formId, teamConfig, env);
          } catch (error) {
            console.warn('Email notifications failed:', error.message);
            // Continue without email - form submission still succeeds
          }
        } else {
          console.warn(`Team with ID ${body.teamId} not found for form submission ${formId}`);
        }

        return new Response(JSON.stringify({ 
          success: true,
          formId,
          message: 'Form submitted successfully. A lawyer will contact you within 24 hours.',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error('Database insertion failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to submit form',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleTeams(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    try {
      // Load all teams from the database
      const rows = await env.DB.prepare('SELECT id, name, config FROM teams').all();
      const teams = rows.results.map((row: any) => {
        let configObj = {};
        try {
          configObj = JSON.parse(row.config);
        } catch (e) {
          console.warn('Failed to parse team config JSON:', e);
        }
        return {
          id: row.id,
          name: row.name,
          config: configObj
        };
      });
      return new Response(JSON.stringify(teams), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Teams Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch teams',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
} 

// Send email notifications via Resend
async function sendEmailNotifications(
  formData: ContactFormSubmission, 
  formId: string, 
  teamConfig: any,
  env: Env
): Promise<void> {
  // Skip email if no API key is configured
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email notifications');
    return;
  }
  
  try {
    // Get team owner email (you'll need to add this to your teams table)
    const teamOwnerEmail = teamConfig?.config?.ownerEmail || 'admin@blawby.com';
    
    // Send confirmation email to client
    const clientEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@blawby.com',
        to: formData.email,
        subject: 'Thank you for contacting our law firm',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Thank you for contacting ${teamConfig?.name || 'our law firm'}</h2>
            <p>We have received your inquiry and a lawyer will review your case details.</p>
            <p><strong>Reference ID:</strong> ${formId}</p>
            <p><strong>Case Details:</strong> ${formData.caseDetails}</p>
            <p>You can expect to hear from us within 24 hours.</p>
            <p>If you have any urgent questions, please don't hesitate to reach out.</p>
            <br>
            <p>Best regards,<br>${teamConfig?.name || 'The Legal Team'}</p>
          </div>
        `
      })
    });

    if (!clientEmailResponse.ok) {
      console.error('Failed to send client email:', await clientEmailResponse.text());
    }

    // Send notification email to team owner
    const ownerEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@blawby.com',
        to: teamOwnerEmail,
        subject: `New Lead: ${formData.email} - ${teamConfig?.name || 'Law Firm'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Lead Received</h2>
            <p><strong>Form ID:</strong> ${formId}</p>
            <p><strong>Client Email:</strong> ${formData.email}</p>
            <p><strong>Client Phone:</strong> ${formData.phoneNumber}</p>
            <p><strong>Case Details:</strong> ${formData.caseDetails}</p>
            <p><strong>Team:</strong> ${teamConfig?.name || 'Unknown'}</p>
            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
            <br>
            <p>Please review and contact the client within 24 hours.</p>
          </div>
        `
      })
    });

    if (!ownerEmailResponse.ok) {
      console.error('Failed to send owner email:', await ownerEmailResponse.text());
    }

    console.log('Email notifications sent successfully');
  } catch (error) {
    console.error('Error sending email notifications:', error);
    // Don't throw - email failure shouldn't break form submission
  }
}

async function handleCaseCreation(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await request.json() as CaseCreationRequest;
      
      // Validate input
      if (!body.teamId || !body.service || !body.step) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request: teamId, service, and step are required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get team configuration
      const teamRow = await env.DB.prepare(`SELECT id, name, config FROM teams WHERE id = ?`).bind(body.teamId).first();
      if (!teamRow) {
        return new Response(JSON.stringify({ 
          error: 'Team not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let teamConfig = {};
      try {
        teamConfig = JSON.parse(teamRow.config);
      } catch (e) {
        console.warn('Failed to parse team config JSON:', e);
      }

      // Handle different steps
      switch (body.step) {
        case 'service-selection':
          const serviceQuestions = teamConfig.serviceQuestions?.[body.service] || [];
          if (serviceQuestions.length > 0) {
            return new Response(JSON.stringify({
              step: 'ai-questions',
              currentQuestionIndex: 0,
              question: serviceQuestions[0],
              totalQuestions: serviceQuestions.length,
              message: `Thank you for selecting ${body.service}. Let me ask you a few specific questions to better understand your situation and provide more targeted assistance.`,
              questions: serviceQuestions
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            return new Response(JSON.stringify({
              step: 'case-details',
              message: `Thank you for sharing that you're dealing with a ${body.service} matter. Now, could you please provide a brief description of your situation? What happened and what are you hoping to achieve?`
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case 'ai-questions':
          const questions = teamConfig.serviceQuestions?.[body.service] || [];
          const currentIndex = body.currentQuestionIndex || 0;
          const nextIndex = currentIndex + 1;
          
          if (nextIndex < questions.length) {
            // More questions to ask
            return new Response(JSON.stringify({
              step: 'ai-questions',
              currentQuestionIndex: nextIndex,
              question: questions[nextIndex],
              totalQuestions: questions.length,
              message: `Thank you for that information.`,
              questions: questions
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // All questions answered, move to case details
            const answersSummary = Object.entries(body.answers || {})
              .map(([question, answer]) => `**${question}**\n${answer}`)
              .join('\n\n');
            
            return new Response(JSON.stringify({
              step: 'case-details',
              message: `Thank you for providing those details. Based on your responses:\n\n${answersSummary}\n\nNow, could you please provide a brief overall description of your situation? What happened and what are you hoping to achieve?`,
              answers: body.answers
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case 'case-details':
          return new Response(JSON.stringify({
            step: 'urgency-selection',
            message: `Thank you for sharing those details. I understand your situation involves ${body.service} and you've described: "${body.description}"\n\nHow urgent is this matter?`,
            urgencyOptions: [
              { value: 'Very Urgent', label: 'Very Urgent - Immediate action needed' },
              { value: 'Somewhat Urgent', label: 'Somewhat Urgent - Within a few weeks' },
              { value: 'Not Urgent', label: 'Not Urgent - Can wait a month or more' }
            ]
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'urgency-selection':
          // Create comprehensive case summary
          let caseSummary = `**Case Summary:**\n- **Type:** ${body.service}\n- **Description:** ${body.description}\n- **Urgency:** ${body.urgency}`;
          
          if (body.answers && Object.keys(body.answers).length > 0) {
            caseSummary += '\n\n**Additional Details:**';
            Object.entries(body.answers).forEach(([question, answer]) => {
              caseSummary += `\n- **${question}** ${answer}`;
            });
          }
          
          caseSummary += `\n\nBased on your comprehensive case details, I can help connect you with an attorney who specializes in ${body.service}. Would you like me to start the process of connecting you with a lawyer?`;
          
          return new Response(JSON.stringify({
            step: 'complete',
            message: caseSummary,
            caseData: {
              service: body.service,
              description: body.description,
              urgency: body.urgency,
              answers: body.answers
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        default:
          return new Response(JSON.stringify({ 
            error: 'Invalid step' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Case creation error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to process case creation',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
} 