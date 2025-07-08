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
  step: 'service-selection' | 'urgency-selection' | 'ai-questions' | 'case-details' | 'ai-analysis' | 'complete';
  currentQuestionIndex?: number;
  answers?: Record<string, string>;
  description?: string;
  urgency?: string;
}

interface CaseQualityScore {
  score: number; // 0-100
  breakdown: {
    followUpCompletion: number;
    requiredFields: number;
    evidence: number;
    clarity: number;
    urgency: number;
    consistency: number;
    aiConfidence: number;
  };
  suggestions: string[];
  readyForLawyer: boolean;
  color: 'red' | 'yellow' | 'green' | 'blue';
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

      if (path.startsWith('/api/case-quality')) {
        return handleCaseQuality(request, env, corsHeaders);
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
async function calculateCaseQuality(
  service: string,
  description: string,
  answers: Record<string, string> = {},
  urgency?: string,
  teamConfig?: any
): Promise<CaseQualityScore> {
  // Initialize breakdown
  const breakdown = {
    followUpCompletion: 0,
    requiredFields: 0,
    evidence: 0,
    clarity: 0,
    urgency: 0,
    consistency: 0,
    aiConfidence: 0
  };

  // 1. Follow-up Completion (25% weight)
  const serviceQuestions = teamConfig?.serviceQuestions?.[service] || [];
  const answeredQuestions = Object.keys(answers).length;
  const totalQuestions = serviceQuestions.length;
  breakdown.followUpCompletion = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 100;

  // 2. Required Fields (20% weight)
  const hasService = !!service;
  const hasDescription = !!description && description.length > 50; // Require more detailed description
  const hasAnswers = answeredQuestions > 0;
  breakdown.requiredFields = ((hasService ? 1 : 0) + (hasDescription ? 1 : 0) + (hasAnswers ? 1 : 0)) / 3 * 100;

  // 3. Evidence (15% weight)
  // Check if user mentioned documents, photos, or evidence
  const evidenceKeywords = ['photo', 'document', 'evidence', 'proof', 'picture', 'image', 'file', 'upload', 'csv', 'pdf', 'contract', 'agreement', 'letter', 'notice', 'cease', 'desist'];
  const hasEvidence = evidenceKeywords.some(keyword => 
    description.toLowerCase().includes(keyword) || 
    Object.values(answers).some(answer => answer.toLowerCase().includes(keyword))
  );
  breakdown.evidence = hasEvidence ? 100 : 0;

  // 4. Clarity (15% weight)
  // Assess answer quality and specificity
  let clarityScore = 0;
  const totalAnswers = Object.values(answers).length;
  if (totalAnswers > 0) {
    const clarityScores = Object.values(answers).map(answer => {
      const length = answer.length;
      const hasDetails = answer.toLowerCase().includes('because') || answer.toLowerCase().includes('when') || answer.toLowerCase().includes('where') || answer.toLowerCase().includes('since') || answer.toLowerCase().includes('due to');
      const isSpecific = !answer.toLowerCase().includes('i don\'t know') && !answer.toLowerCase().includes('not sure') && !answer.toLowerCase().includes('already told you') && !answer.toLowerCase().includes('enough');
      const hasSubstance = length > 10; // Reduced from 20 to 10 for brief but valuable responses
      const hasContext = answer.toLowerCase().includes('children') || answer.toLowerCase().includes('money') || answer.toLowerCase().includes('court') || answer.toLowerCase().includes('legal') || answer.toLowerCase().includes('document') || answer.toLowerCase().includes('cease') || answer.toLowerCase().includes('desist') || answer.toLowerCase().includes('kfc') || answer.toLowerCase().includes('business') || answer.toLowerCase().includes('people') || answer.toLowerCase().includes('csv');
      const hasLegalRelevance = answer.toLowerCase().includes('cease') || answer.toLowerCase().includes('desist') || answer.toLowerCase().includes('trademark') || answer.toLowerCase().includes('copyright') || answer.toLowerCase().includes('contract') || answer.toLowerCase().includes('employment') || answer.toLowerCase().includes('child support') || answer.toLowerCase().includes('custody') || answer.toLowerCase().includes('divorce');
      return (hasSubstance ? 1 : 0) + (hasDetails ? 1 : 0) + (isSpecific ? 1 : 0) + (hasContext ? 1 : 0) + (hasLegalRelevance ? 2 : 0); // Legal relevance gets double weight
    });
    clarityScore = (clarityScores.reduce((a, b) => a + b, 0) / (totalAnswers * 6)) * 100; // 6 total possible points
  }
  breakdown.clarity = clarityScore;

  // 5. Urgency (10% weight)
  breakdown.urgency = urgency ? 100 : 0;

  // 6. Consistency (10% weight)
  // Check for contradictions in answers
  let consistencyScore = 100;
  const answersArray = Object.values(answers);
  if (answersArray.length > 1) {
    // Simple consistency check - could be enhanced with AI
    const hasContradictions = false; // Placeholder for AI-based consistency check
    consistencyScore = hasContradictions ? 50 : 100;
  }
  breakdown.consistency = consistencyScore;

  // 7. AI Confidence (5% weight)
  // This will be set by the AI analysis step
  breakdown.aiConfidence = 75; // Default value, will be updated by AI analysis

  // Calculate weighted score
  const weights = {
    followUpCompletion: 0.25,
    requiredFields: 0.20,
    evidence: 0.15,
    clarity: 0.15,
    urgency: 0.10,
    consistency: 0.10,
    aiConfidence: 0.05
  };

  const score = Math.round(
    breakdown.followUpCompletion * weights.followUpCompletion +
    breakdown.requiredFields * weights.requiredFields +
    breakdown.evidence * weights.evidence +
    breakdown.clarity * weights.clarity +
    breakdown.urgency * weights.urgency +
    breakdown.consistency * weights.consistency +
    breakdown.aiConfidence * weights.aiConfidence
  );

  // Generate suggestions
  const suggestions: string[] = [];
  if (breakdown.followUpCompletion < 100) {
    suggestions.push('Complete all follow-up questions to improve your case readiness.');
  }
  if (breakdown.requiredFields < 100) {
    if (!description || description.length <= 50) {
      suggestions.push('Provide a detailed description of your situation (at least 50 characters).');
    }
  }
  if (breakdown.evidence === 0) {
    suggestions.push('Consider uploading photos, documents, or other evidence related to your case.');
  }
  if (breakdown.clarity < 70) {
    suggestions.push('Provide more specific details about what happened, when, and why. Include relevant context like dates, amounts, and specific events.');
  }
  if (breakdown.urgency === 0) {
    suggestions.push('Specify how urgent your matter is to help prioritize your case.');
  }

  // Determine color based on score
  let color: 'red' | 'yellow' | 'green' | 'blue';
  
  if (score >= 90) {
    color = 'blue';
  } else if (score >= 75) {
    color = 'green';
  } else if (score >= 50) {
    color = 'yellow';
  } else {
    color = 'red';
  }

  return {
    score,
    breakdown,
    suggestions,
    readyForLawyer: score >= 75,
    color
  };
}

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

async function handleCaseQuality(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      
      // Validate required fields
      if (!body.teamId || !body.service) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: teamId and service are required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get team configuration
      const teamRow = await env.DB.prepare(`SELECT id, name, config FROM teams WHERE id = ?`).bind(body.teamId).first();
      if (!teamRow) {
        return new Response(JSON.stringify({ error: 'Team not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let teamConfig = {};
      try {
        teamConfig = JSON.parse(teamRow.config);
      } catch (e) {
        console.error('Error parsing team config:', e);
      }

      // Calculate quality score
      const qualityScore = await calculateCaseQuality(
        body.service,
        body.description || '',
        body.answers || {},
        body.urgency,
        teamConfig
      );

      return new Response(JSON.stringify(qualityScore), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Case quality error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
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
          // Calculate initial quality score
          const serviceQualityScore = await calculateCaseQuality(body.service, '', {}, undefined, teamConfig);
          
          return new Response(JSON.stringify({
            step: 'urgency-selection',
            message: `Thank you for selecting ${body.service}. To better understand your situation and provide appropriate assistance, I'd like to know how urgent this matter is.`,
            urgencyOptions: [
              { value: 'Very Urgent', label: 'Very Urgent - Immediate action needed' },
              { value: 'Somewhat Urgent', label: 'Somewhat Urgent - Within a few weeks' },
              { value: 'Not Urgent', label: 'Not Urgent - Can wait a month or more' }
            ],
            qualityScore: serviceQualityScore
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'urgency-selection':
          // Check if there are service-specific questions to ask
          const serviceQuestions = teamConfig.serviceQuestions?.[body.service] || [];
          const urgencyQualityScore = await calculateCaseQuality(body.service, '', {}, body.urgency, teamConfig);
          
          if (serviceQuestions.length > 0) {
            // Move to AI questions with urgency context
            return new Response(JSON.stringify({
              step: 'ai-questions',
              currentQuestionIndex: 0,
              question: serviceQuestions[0],
              totalQuestions: serviceQuestions.length,
              message: `Thank you for indicating this is ${body.urgency.toLowerCase()}. Given the urgency, let me ask you some specific questions to quickly assess your situation and provide targeted assistance.\n\n${serviceQuestions[0]}`,
              questions: serviceQuestions,
              urgency: body.urgency,
              qualityScore: urgencyQualityScore
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // No specific questions, move to case details
            return new Response(JSON.stringify({
              step: 'case-details',
              message: `Thank you for indicating this is ${body.urgency.toLowerCase()}. Now, could you please provide a brief description of your situation? What happened and what are you hoping to achieve?`,
              urgency: body.urgency,
              qualityScore: urgencyQualityScore
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
            const nextQuestionQualityScore = await calculateCaseQuality(body.service, '', body.answers || {}, body.urgency, teamConfig);
            
            return new Response(JSON.stringify({
              step: 'ai-questions',
              currentQuestionIndex: nextIndex,
              question: questions[nextIndex],
              totalQuestions: questions.length,
              message: `Thank you for that information.`,
              questions: questions,
              urgency: body.urgency,
              qualityScore: nextQuestionQualityScore
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // All questions answered, move to case details
            const answersSummary = Object.entries(body.answers || {})
              .map(([question, answer]) => `**${question}**\n${answer}`)
              .join('\n\n');
            
            const aiQuestionsQualityScore = await calculateCaseQuality(body.service, '', body.answers || {}, body.urgency, teamConfig);
            
            return new Response(JSON.stringify({
              step: 'case-details',
              message: `Thank you for providing those details. Based on your responses:\n\n${answersSummary}\n\nNow, could you please provide a brief overall description of your situation? What happened and what are you hoping to achieve?`,
              answers: body.answers,
              urgency: body.urgency,
              qualityScore: aiQuestionsQualityScore
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case 'case-details':
          // Move to AI analysis step
          const caseDetailsQualityScore = await calculateCaseQuality(body.service, body.description || '', body.answers || {}, body.urgency, teamConfig);
          
          return new Response(JSON.stringify({
            step: 'ai-analysis',
            message: `Thank you for sharing those details. Let me analyze your case to better understand your situation and determine what additional information might be needed.`,
            caseData: {
              service: body.service,
              description: body.description,
              answers: body.answers,
              urgency: body.urgency
            },
            qualityScore: caseDetailsQualityScore
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'ai-analysis':
          // Use AI to analyze the case and provide insights
          try {
            const caseSummary = Object.entries(body.answers || {})
              .map(([question, answer]) => `**${question}**\n${answer}`)
              .join('\n\n');
            
            const analysisPrompt = `You are an intelligent legal case analyst. Your job is to assess whether we have sufficient information to connect a client with a lawyer. Analyze the following case information and provide:

1. A professional summary of the case
2. Assessment of whether we have sufficient information for a qualified legal lead
3. Any missing critical information that should be gathered
4. Recommended next steps

CRITICAL INTELLIGENCE RULES:
- If the client description contains frustration or complaints about repetitive questioning (e.g., "why do you keep asking me this", "i just gave you all details"), IGNORE that description and focus on the detailed responses they provided earlier
- The detailed responses contain the actual case information - use those for analysis
- Be intelligent about recognizing when the client has provided valuable information, even if their responses are brief
- Look for specific legal issues, facts, documents, and desired outcomes in their detailed responses

Case Information:
- Practice Area: ${body.service}
- Urgency: ${body.urgency}
- Client Description: ${body.description} (Note: If this contains frustration about repetitive questions, focus on the detailed responses below)
- Detailed Responses:
${caseSummary}

Please provide a structured analysis in JSON format with the following fields:
{
  "summary": "Professional case summary based on the detailed responses",
  "sufficientInfo": true/false,
  "missingInfo": ["list of missing critical information"],
  "recommendations": ["list of recommended next steps"],
  "followUpQuestions": ["specific questions to ask if needed"],
  "readyForLawyer": true/false
}

INTELLIGENT GUIDELINES:
- Set readyForLawyer to true if the detailed responses contain enough information for a lawyer to understand their situation and provide meaningful advice
- Focus on whether a lawyer could provide meaningful advice with the information in the detailed responses
- If the client has provided comprehensive answers to all the structured questions, they likely have sufficient information`;

            const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [
                { role: 'system', content: 'You are a professional legal case analyst. Provide clear, structured analysis in JSON format.' },
                { role: 'user', content: analysisPrompt }
              ]
            });

            let analysis;
            try {
              // Try to parse the AI response as JSON
              const responseText = aiResponse.response || '';
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
              } else {
                throw new Error('No JSON found in response');
              }
            } catch (parseError) {
              // Fallback analysis if JSON parsing fails
              analysis = {
                summary: `Based on the information provided, this appears to be a ${body.service} case involving ${body.description}.`,
                sufficientInfo: false,
                missingInfo: ['More specific details about the situation', 'Timeline of events', 'Current status'],
                recommendations: ['Gather more specific information', 'Clarify timeline and current status'],
                followUpQuestions: ['Can you provide more specific details about your situation?', 'What is the current status of this situation?'],
                readyForLawyer: false
              };
            }

            // Calculate quality score first
            const completeAnalysisQualityScore = await calculateCaseQuality(body.service, body.description || '', body.answers || {}, body.urgency, teamConfig);
            
            // Only mark as ready for lawyer if AI says yes AND quality score is 90% or above
            if (analysis.readyForLawyer && analysis.sufficientInfo && completeAnalysisQualityScore.score >= 90) {
              
              // Create comprehensive case summary
              let caseSummary = `**Case Analysis Complete**\n\n${analysis.summary}\n\n**Case Summary:**\n- **Type:** ${body.service}\n- **Urgency:** ${body.urgency}\n- **Description:** ${body.description}`;
              
              if (body.answers && Object.keys(body.answers).length > 0) {
                caseSummary += '\n\n**Additional Details:**';
                Object.entries(body.answers).forEach(([question, answer]) => {
                  caseSummary += `\n- **${question}** ${answer}`;
                });
              }
              
              caseSummary += `\n\nBased on my analysis, I have sufficient information to connect you with a qualified attorney who specializes in ${body.service}. Would you like me to start the process of connecting you with a lawyer?`;
              
              return new Response(JSON.stringify({
                step: 'complete',
                message: caseSummary,
                caseData: {
                  service: body.service,
                  description: body.description,
                  urgency: body.urgency,
                  answers: body.answers
                },
                analysis: analysis,
                qualityScore: completeAnalysisQualityScore
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } else {
              // Need more information - either AI said no OR quality score is below 90%
              let followUpMessage = '';
              let newQuestions = [];
              // Use only config-driven questions
              const configQuestions = teamConfig.serviceQuestions?.[body.service] || [];
              const answeredQuestions = Object.keys(body.answers || {});
              // Only ask questions that haven't been answered
              newQuestions = configQuestions.filter(q => !answeredQuestions.includes(q));
              if (newQuestions.length > 0) {
                followUpMessage = `\n\nYour case quality score is currently ${completeAnalysisQualityScore.score}%. To connect you with a lawyer, we need to reach at least 90%. Let me ask a few more questions to gather the information needed:`;
              } else if (analysis.followUpQuestions && analysis.followUpQuestions.length > 0) {
                // If AI suggests more, but all config questions are answered, ask for a freeform description
                followUpMessage = `\n\nI need to gather a bit more information to better assist you. Please provide any additional details about your situation that you haven't already shared.`;
                newQuestions = [
                  'Please provide any additional details about your situation that you haven\'t already shared.'
                ];
              } else {
                // As a last resort, ask for a freeform description
                followUpMessage = '\n\nI need to gather a bit more information to better assist you.';
                newQuestions = ['Please provide any additional details about your situation that you haven\'t already shared.'];
              }

              // Use the already calculated quality score
              const followUpQualityScore = completeAnalysisQualityScore;

              return new Response(JSON.stringify({
                step: 'ai-questions',
                currentQuestionIndex: 0,
                question: newQuestions[0],
                totalQuestions: newQuestions.length,
                message: `**Case Analysis**\n\n${analysis.summary}${followUpMessage}`,
                questions: newQuestions,
                analysis: analysis,
                urgency: body.urgency,
                qualityScore: followUpQualityScore
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (aiError) {
            console.error('AI analysis error:', aiError);
            // Fallback to complete if AI fails, but still check quality score
            const fallbackQualityScore = await calculateCaseQuality(body.service, body.description || '', body.answers || {}, body.urgency, teamConfig);
            
            // Only proceed to complete if quality score is 90% or above
            if (fallbackQualityScore.score >= 90) {
              // Create fallback case summary
              let caseSummary = `**Case Summary:**\n- **Type:** ${body.service}\n- **Urgency:** ${body.urgency}\n- **Description:** ${body.description}`;
              
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
                },
                qualityScore: fallbackQualityScore
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } else {
              // Quality score too low, ask for more information
              // Generate new questions based on what's missing, avoiding duplicates
              const existingQuestions = Object.keys(body.answers || {});
              const existingQuestionsLower = existingQuestions.map(q => q.toLowerCase());
              let newQuestions = [];
              
              if (body.service === 'Employment Law') {
                if (!existingQuestionsLower.some(q => q.includes('discrimination') || q.includes('harassment'))) {
                  newQuestions.push('What specific type of discrimination or harassment did you experience?');
                }
                if (!existingQuestionsLower.some(q => q.includes('evidence') || q.includes('document'))) {
                  newQuestions.push('Do you have any emails, texts, or other documentation related to this issue?');
                }
                if (!existingQuestionsLower.some(q => q.includes('witness') || q.includes('coworker'))) {
                  newQuestions.push('Are there any witnesses or coworkers who can support your case?');
                }
                if (!existingQuestionsLower.some(q => q.includes('timeline') || q.includes('when'))) {
                  newQuestions.push('When exactly did this discrimination start and what were the key events?');
                }
                if (!existingQuestionsLower.some(q => q.includes('damage') || q.includes('loss'))) {
                  newQuestions.push('What damages or losses have you suffered as a result of this discrimination?');
                }
              } else if (body.service === 'Family Law') {
                if (!existingQuestionsLower.some(q => q.includes('children') || q.includes('kid'))) {
                  newQuestions.push('How many children are involved and what are their ages?');
                }
                if (!existingQuestionsLower.some(q => q.includes('income') || q.includes('salary'))) {
                  newQuestions.push('What is your current income and employment situation?');
                }
                if (!existingQuestionsLower.some(q => q.includes('custody') || q.includes('visitation'))) {
                  newQuestions.push('What type of custody or visitation arrangement are you seeking?');
                }
                if (!existingQuestionsLower.some(q => q.includes('safety') || q.includes('abuse'))) {
                  newQuestions.push('Are there any safety concerns or allegations of abuse involved?');
                }
              } else if (body.service === 'Small Business and Nonprofits') {
                if (!existingQuestionsLower.some(q => q.includes('business') || q.includes('entity'))) {
                  newQuestions.push('What type of business entity are you operating (LLC, Corporation, etc.)?');
                }
                if (!existingQuestionsLower.some(q => q.includes('contract') || q.includes('agreement'))) {
                  newQuestions.push('Do you have any contracts or agreements related to this legal issue?');
                }
                if (!existingQuestionsLower.some(q => q.includes('financial') || q.includes('money'))) {
                  newQuestions.push('What are the financial implications of this legal issue?');
                }
                if (!existingQuestionsLower.some(q => q.includes('timeline') || q.includes('deadline'))) {
                  newQuestions.push('What is the timeline or deadline for resolving this issue?');
                }
              }
              
              // If no specific questions generated, use generic ones that haven't been asked
              if (newQuestions.length === 0) {
                if (!existingQuestionsLower.some(q => q.includes('timeline') || q.includes('when'))) {
                  newQuestions.push('What is the timeline of events that led to this legal issue?');
                }
                if (!existingQuestionsLower.some(q => q.includes('outcome') || q.includes('goal'))) {
                  newQuestions.push('What specific outcome are you hoping to achieve?');
                }
                if (!existingQuestionsLower.some(q => q.includes('evidence') || q.includes('document'))) {
                  newQuestions.push('Do you have any documentation or evidence to support your case?');
                }
              }
              
              // If still no questions, use very generic ones
              if (newQuestions.length === 0) {
                newQuestions = [
                  'Can you provide more specific details about your situation?',
                  'What is the timeline of events that led to this legal issue?',
                  'What specific outcome are you hoping to achieve?'
                ];
              }
              
              const fallbackMessage = `Your case quality score is currently ${fallbackQualityScore.score}%. To connect you with a lawyer, we need to reach at least 90%. Let me ask a few more specific questions:`;
              
              return new Response(JSON.stringify({
                step: 'ai-questions',
                currentQuestionIndex: 0,
                question: newQuestions[0] || 'Can you provide more specific details about your situation?',
                totalQuestions: newQuestions.length || 1,
                message: `**Case Analysis**\n\nBased on the information provided, this appears to be a ${body.service} case.${fallbackMessage}`,
                questions: newQuestions,
                urgency: body.urgency,
                qualityScore: fallbackQualityScore
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }

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