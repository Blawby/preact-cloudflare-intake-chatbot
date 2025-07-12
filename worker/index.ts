/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
}

// Optimized interfaces with better typing
interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  teamId?: string;
  sessionId?: string;
}

interface ContactForm {
  email: string;
  phoneNumber: string;
  matterDetails: string;
  teamId: string;
  urgency?: string;
}

interface MatterCreationRequest {
  teamId: string;
  service?: string;
  step: 'service-selection' | 'questions' | 'matter-review' | 'matter-details' | 'complete';
  currentQuestionIndex?: number;
  answers?: Record<string, string | { question: string; answer: string }>;
  description?: string;
  urgency?: string;
  sessionId?: string;
}

interface TeamConfig {
  requiresPayment?: boolean;
  consultationFee?: number;
  ownerEmail?: string;
  serviceQuestions?: Record<string, string[]>;
  availableServices?: string[];
  webhooks?: {
    enabled?: boolean;
    url?: string;
    secret?: string;
    events?: {
      matterCreation?: boolean;
      matterDetails?: boolean;
      contactForm?: boolean;
      appointment?: boolean;
    };
    retryConfig?: {
      maxRetries?: number;
      retryDelay?: number; // in seconds
    };
  };
}

// Optimized helper functions
async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON");
  }
}

// CORS headers - defined once for reuse
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Optimized AI Service with caching and timeouts
class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ai: any, private env: Env) {}
  
  async runLLM(messages: any[], model: string = '@cf/meta/llama-3.1-8b-instruct') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const result = await this.ai.run(model, {
        messages,
        max_tokens: 500,
        temperature: 0.4,
      });
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
  
  async getTeamConfig(teamId: string): Promise<TeamConfig> {
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.config;
    }

    try {
      const teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(teamId).first();
      if (teamRow) {
        const config = JSON.parse(teamRow.config as string);
        this.teamConfigCache.set(teamId, { config, timestamp: Date.now() });
        return config;
      }
    } catch (error) {
      console.warn('Failed to fetch team config:', error);
    }
    
    return {};
  }
}

// Optimized Email Service
class EmailService {
  constructor(private apiKey: string) {}
  
  async send(email: { from: string; to: string; subject: string; text: string }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(email),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Email failed: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}

// Webhook Service for secure webhook delivery
class WebhookService {
  constructor(private env: Env) {}

  // Generate HMAC signature for webhook security
  private async generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
      signature = await this.generateSignature(payloadString, teamConfig.webhooks.secret);
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
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
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

// Simplified matter quality assessment (no AI calls)
interface QualityAssessment {
  score: number;
  readyForLawyer: boolean;
  breakdown: {
    answerQuality: number;
    answerCompleteness: number;
    answerRelevance: number;
    answerLength: number;
    serviceSpecificity: number;
    urgencyIndication: number;
    evidenceMentioned: number;
    timelineProvided: number;
  };
  issues: string[];
  suggestions: string[];
  confidence: 'high' | 'medium' | 'low';
}

function assessMatterQuality(matterData: any): QualityAssessment {
  const answers = matterData.answers || {};
  const answerEntries = Object.entries(answers);
  
  // Initialize assessment
  const assessment: QualityAssessment = {
    score: 0,
    readyForLawyer: false,
    breakdown: {
      answerQuality: 0,
      answerCompleteness: 0,
      answerRelevance: 0,
      answerLength: 0,
      serviceSpecificity: 0,
      urgencyIndication: 0,
      evidenceMentioned: 0,
      timelineProvided: 0
    },
    issues: [],
    suggestions: [],
    confidence: 'low'
  };

  // 1. Analyze answer quality and length
  let totalAnswerLength = 0;
  let meaningfulAnswers = 0;
  let totalAnswers = answerEntries.length;
  
  for (const [key, value] of answerEntries) {
    const answer = typeof value === 'string' ? value : (value as any)?.answer || '';
    const question = typeof value === 'string' ? key : (value as any)?.question || key;
    
    // Check if answer is meaningful (not just 1-3 characters)
    if (answer.length >= 10) {
      meaningfulAnswers++;
      totalAnswerLength += answer.length;
    } else if (answer.length <= 3) {
      assessment.issues.push(`Answer "${answer}" is too short for question "${question}"`);
    }
  }

  // Calculate answer quality metrics
  assessment.breakdown.answerQuality = totalAnswers > 0 ? (meaningfulAnswers / totalAnswers) * 100 : 0;
  assessment.breakdown.answerLength = totalAnswers > 0 ? Math.min((totalAnswerLength / totalAnswers) / 5, 100) : 0; // Normalize to 100

  // 2. Check service specificity
  if (matterData.service && matterData.service !== 'General Inquiry') {
    assessment.breakdown.serviceSpecificity = 100;
  } else if (matterData.service === 'General Inquiry') {
    assessment.breakdown.serviceSpecificity = 50;
    assessment.suggestions.push('Consider specifying the exact type of legal matter');
  } else {
    assessment.breakdown.serviceSpecificity = 0;
    assessment.issues.push('No legal service area specified');
  }

  // 3. Analyze content for urgency indicators
  const urgencyKeywords = ['urgent', 'emergency', 'immediate', 'asap', 'quickly', 'soon', 'deadline', 'court date', 'hearing'];
  const content = JSON.stringify(answers).toLowerCase();
  const hasUrgency = urgencyKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.urgencyIndication = hasUrgency ? 100 : 0;

  // 4. Check for evidence/documentation mentions
  const evidenceKeywords = ['document', 'contract', 'letter', 'email', 'text', 'photo', 'video', 'receipt', 'bill', 'court order', 'agreement'];
  const hasEvidence = evidenceKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.evidenceMentioned = hasEvidence ? 100 : 0;

  // 5. Check for timeline information
  const timelineKeywords = ['yesterday', 'today', 'tomorrow', 'last week', 'last month', 'next week', 'next month', 'date', 'when', 'since'];
  const hasTimeline = timelineKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.timelineProvided = hasTimeline ? 100 : 0;

  // 6. Calculate overall score with weighted components
  const weights = {
    answerQuality: 0.25,
    answerLength: 0.20,
    serviceSpecificity: 0.15,
    urgencyIndication: 0.10,
    evidenceMentioned: 0.10,
    timelineProvided: 0.10,
    answerCompleteness: 0.10
  };

  assessment.score = Math.round(
    assessment.breakdown.answerQuality * weights.answerQuality +
    assessment.breakdown.answerLength * weights.answerLength +
    assessment.breakdown.serviceSpecificity * weights.serviceSpecificity +
    assessment.breakdown.urgencyIndication * weights.urgencyIndication +
    assessment.breakdown.evidenceMentioned * weights.evidenceMentioned +
    assessment.breakdown.timelineProvided * weights.timelineProvided +
    (totalAnswers >= 3 ? 100 : totalAnswers * 33.33) * weights.answerCompleteness
  );

  // 7. Determine if ready for lawyer
  assessment.readyForLawyer = assessment.score >= 70 && meaningfulAnswers >= 2;

  // 8. Set confidence level
  if (assessment.score >= 80 && meaningfulAnswers >= 3) {
    assessment.confidence = 'high';
  } else if (assessment.score >= 60 && meaningfulAnswers >= 2) {
    assessment.confidence = 'medium';
  } else {
    assessment.confidence = 'low';
  }

  // 9. Generate suggestions based on issues
  if (assessment.breakdown.answerQuality < 50) {
    assessment.suggestions.push('Please provide more detailed answers to the questions');
  }
  if (assessment.breakdown.evidenceMentioned === 0) {
    assessment.suggestions.push('Consider mentioning any relevant documents or evidence');
  }
  if (assessment.breakdown.timelineProvided === 0) {
    assessment.suggestions.push('Include timeline information about when events occurred');
  }
  if (totalAnswers < 3) {
    assessment.suggestions.push('Answer more questions to provide a complete picture');
  }

  return assessment;
}

// Helper function to log chat messages to database
async function logChatMessage(
  env: Env,
  sessionId: string,
  teamId: string | undefined,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  try {
    const messageId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO chat_logs (id, session_id, team_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(messageId, sessionId, teamId || null, role, content).run();
  } catch (error) {
    console.warn('Failed to log chat message:', error);
  }
}

// Helper function to store matter Q&A pairs
async function storeMatterQuestion(
  env: Env,
  matterId: string | undefined,
  teamId: string | undefined,
  question: string,
  answer: string,
  source: 'ai-form' | 'human-entry' | 'followup' = 'ai-form'
): Promise<void> {
  try {
    const questionId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO matter_questions (id, matter_id, team_id, question, answer, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(questionId, matterId || null, teamId || null, question, answer, source).run();
  } catch (error) {
    console.warn('Failed to store matter question:', error);
  }
}

// Helper function to create a new matter record
async function createMatterRecord(
  env: Env,
  teamId: string,
  sessionId: string,
  service: string,
  description: string,
  urgency: string = 'normal'
): Promise<string> {
  try {
    const matterId = crypto.randomUUID();
    
    // Generate matter number (e.g., MAT-2024-001)
    const year = new Date().getFullYear();
    const matterNumberResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matters 
      WHERE team_id = ? AND strftime('%Y', created_at) = ?
    `).bind(teamId, year.toString()).first();
    
    const count = (matterNumberResult as any)?.count || 0;
    const matterNumber = `MAT-${year}-${(count + 1).toString().padStart(3, '0')}`;
    
    // Create matter record
    await env.DB.prepare(`
      INSERT INTO matters (
        id, team_id, matter_type, title, description, status, priority, 
        lead_source, matter_number, custom_fields, created_at
      ) VALUES (?, ?, ?, ?, ?, 'lead', ?, 'website', ?, ?, datetime('now'))
    `).bind(
      matterId,
      teamId,
      service,
      `${service} Matter`,
      description,
      urgency === 'urgent' ? 'high' : urgency === 'somewhat urgent' ? 'normal' : 'low',
      matterNumber,
      JSON.stringify({ sessionId, source: 'ai-intake' })
    ).run();
    
    return matterId;
  } catch (error) {
    console.warn('Failed to create matter record:', error);
    throw error;
  }
}

// Helper function to store AI-generated summaries
async function storeAISummary(
  env: Env,
  matterId: string | undefined,
  summary: string,
  modelUsed: string,
  promptSnapshot: string
): Promise<void> {
  try {
    const summaryId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO ai_generated_summaries (id, matter_id, summary, model_used, prompt_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(summaryId, matterId || null, summary, modelUsed, promptSnapshot).run();
  } catch (error) {
    console.warn('Failed to store AI summary:', error);
  }
}

// Optimized route handlers
async function handleHealth(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleRoot(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Blawby AI Chatbot API</title>
    <style>body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; }</style>
</head>
<body>
    <h1>🤖 Blawby AI Chatbot API</h1>
    <p>AI-powered legal assistance with matter building</p>
    <ul>
        <li><strong>POST</strong> /api/chat - AI conversations</li>
        <li><strong>GET</strong> /api/teams - Available teams</li>
        <li><strong>POST</strong> /api/matter-creation - Matter building flow</li>
        <li><strong>POST</strong> /api/forms - Contact submissions</li>
        <li><strong>POST</strong> /api/scheduling - Appointments</li>
        <li><strong>POST</strong> /api/feedback - AI feedback collection</li>
        <li><strong>GET</strong> /api/export - Training data export</li>
        <li><strong>GET</strong> /api/webhooks/logs - Webhook delivery logs</li>
        <li><strong>POST</strong> /api/webhooks/retry - Retry failed webhooks</li>
        <li><strong>GET</strong> /api/webhooks/stats - Webhook statistics</li>
        <li><strong>POST</strong> /api/webhooks/test - Test webhook delivery</li>
    </ul>
    <p>✅ API operational</p>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Optimized Chat handler with caching
async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as ChatRequest;
    
    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team config using cached service
    const aiService = new AIService(env.AI, env);
    const teamConfig = body.teamId ? await aiService.getTeamConfig(body.teamId) : {};

    // Generate AI response with optimized prompt
    const systemPrompt = teamConfig 
      ? `You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful. Help users feel heard and supported while organizing their legal matters. ${teamConfig.requiresPayment ? `We do have a consultation fee of $${teamConfig.consultationFee}, but we'll make sure you're prepared before connecting you with an attorney.` : 'We offer free consultations to help you understand your options.'}`
      : 'You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful.';

    const aiResult = await aiService.runLLM([
      { role: 'system', content: systemPrompt },
      ...body.messages.slice(-3) // Keep last 3 messages for context
    ]);

    const response = aiResult.response || "I'm here to help with your legal needs. What can I assist you with?";
    
    // Log chat messages to database for AI training
    if (body.sessionId) {
      // Log user messages (only the most recent one to avoid duplicates)
      const lastUserMessage = body.messages[body.messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await logChatMessage(env, body.sessionId, body.teamId, 'user', lastUserMessage.content);
      }
      
      // Log assistant response
      await logChatMessage(env, body.sessionId, body.teamId, 'assistant', response);
    }
    
    // Save conversation to session if sessionId provided - optimized with structured data
    if (body.sessionId) {
      try {
        const sessionData = {
          teamId: body.teamId,
          messages: [...body.messages, { role: 'assistant', content: response }],
          lastActivity: new Date().toISOString(),
          intent: 'general',
          shouldStartMatterCreation: false
        };

        await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(sessionData), {
          expirationTtl: 24 * 60 * 60 // 24 hours
        });
      } catch (error) {
        console.warn('Failed to save session:', error);
      }
    }

    return new Response(JSON.stringify({
      response,
      intent: 'general',
      shouldStartMatterCreation: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Chat service unavailable' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Optimized Matter creation handler with caching
async function handleMatterCreation(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as MatterCreationRequest;
    
    if (!body.teamId || !body.step) {
      return new Response(JSON.stringify({ error: 'Missing teamId or step' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team config using cached service
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(body.teamId);
    
    if (!teamConfig || Object.keys(teamConfig).length === 0) {
      return new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const quality = assessMatterQuality(body);

          switch (body.step) {
      case 'service-selection':
        // If no service selected yet, show service options
        if (!body.service) {
          const services = teamConfig.availableServices || [
            'Family Law', 
            'Small Business and Nonprofits', 
            'Employment Law', 
            'Tenant Rights Law', 
            'Probate and Estate Planning', 
            'Special Education and IEP Advocacy'
          ];
          
          const response = {
            step: 'service-selection',
            message: 'What type of legal matter do you need help with?',
            services,
            qualityScore: quality
          };

          // Save matter creation state to session
          if (body.sessionId) {
            try {
              const sessionData = {
                teamId: body.teamId,
                matterCreationState: {
                  step: 'service-selection',
                  data: body,
                  timestamp: new Date().toISOString()
                },
                lastActivity: new Date().toISOString()
              };

              await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(sessionData), {
                expirationTtl: 24 * 60 * 60 // 24 hours
              });
            } catch (error) {
              console.warn('Failed to save matter creation session:', error);
            }
          }

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Service was selected, move to questions
          const questions = teamConfig.serviceQuestions?.[body.service] || [
            `Tell me more about your ${body.service} situation.`,
            'When did this issue begin?',
            'What outcome are you hoping for?'
          ];

          // Send matter creation webhook (when service is first selected)
          const webhookService = new WebhookService(env);
          const matterCreationPayload = {
            event: 'matter_creation',
            timestamp: new Date().toISOString(),
            teamId: body.teamId,
            sessionId: body.sessionId,
            matter: {
              service: body.service,
              qualityScore: quality,
              step: 'service-selected',
              totalQuestions: questions.length,
              hasQuestions: questions.length > 0
            }
          };

          // Fire and forget webhook - don't wait for completion
          webhookService.sendWebhook(body.teamId, 'matter_creation', matterCreationPayload, teamConfig)
            .catch(error => console.warn('Matter creation webhook failed:', error));
          
          if (questions.length > 0) {
            return new Response(JSON.stringify({
              step: 'questions',
              message: questions[0],
              currentQuestion: 1,
              totalQuestions: questions.length,
              selectedService: body.service,
              qualityScore: quality
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // No questions, go straight to matter details
            return new Response(JSON.stringify({
              step: 'matter-details',
              message: `Thank you for selecting ${body.service}. Please provide a detailed description of your situation.`,
              selectedService: body.service,
              qualityScore: quality
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

      case 'questions':
        const questions = teamConfig.serviceQuestions?.[body.service!] || [
          `Tell me more about your ${body.service} situation.`,
          'When did this issue begin?',
          'What outcome are you hoping for?'
        ];
        const currentIndex = body.currentQuestionIndex || 0;
        
        if (currentIndex < questions.length) {
          return new Response(JSON.stringify({
            step: 'questions',
            message: questions[currentIndex],
            currentQuestion: currentIndex + 1,
            totalQuestions: questions.length,
            selectedService: body.service,
            qualityScore: quality,
            questionText: questions[currentIndex] // Include the actual question text
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
                } else {
          // All questions answered, move to matter review step
          const answers = body.answers || {};
          const answerValues = Object.values(answers).filter(Boolean);
          
          // Auto-generate matter description from Q&A answers
          const autoDescription = `${body.service} matter: ${answerValues.join('. ')}.`;
          
          // Create enhanced body for quality assessment
          const enhancedBody = {
            ...body,
            description: autoDescription,
            answers: answers
          };
          
          // Get quality assessment with the auto-generated description
          const initialQuality = assessMatterQuality(enhancedBody);
          
          return new Response(JSON.stringify({
            step: 'matter-review',
            message: `Thank you for answering those questions. Let me review your matter and provide a summary.`,
            selectedService: body.service,
            qualityScore: initialQuality,
            autoGeneratedDescription: autoDescription,
            answers: answers
          }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
        }

      case 'matter-review':
        // Generate comprehensive matter summary and determine next steps
        const matterAnswers = body.answers || {};
        const matterDescription = body.description || `${body.service} matter with provided details`;
        
        // Extract question-answer pairs from the new data structure
        const questionAnswerPairs = Object.entries(matterAnswers).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
            return `**${value.question}**: ${value.answer}`;
          }
          // Fallback for old format
          return `**${key}**: ${value}`;
        }).filter(pair => pair.includes(': ') && !pair.includes(': undefined'));
        
        // Create enhanced matter data for assessment
        const matterData = {
          service: body.service,
          description: matterDescription,
          answers: matterAnswers,
          urgency: body.urgency
        };
        
        // Get detailed quality assessment
        const reviewQuality = assessMatterQuality(matterData);
        
                // Generate structured markdown matter summary for canvas
        let matterSummary = '';
        let matterId: string | undefined;
        
        // Create actual matter record in database first
        try {
          matterId = await createMatterRecord(
            env,
            body.teamId,
            body.sessionId || '',
            body.service,
            matterDescription,
            body.urgency
          );
        } catch (error) {
          console.warn('Failed to create matter record:', error);
          // Continue without matter record if creation fails
        }
        
        // Try to generate AI summary, but fallback gracefully if it fails
        if (aiService) {
          try {
             const summaryPrompt = `Create a clean matter summary markdown for this ${body.service} matter. The client provided initial structured answers AND follow-up conversation details. Use ALL information provided:

Initial Q&A and Follow-up Information:
${questionAnswerPairs.join('\n')}

Generate ONLY markdown content using the EXACT format below. Use FACTS ONLY - no empathetic language, no emotional content:

# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
[State the specific legal issue in clear terms]

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: [what the problem is]
- **Timeline**: [when events occurred] 
- **Current Situation**: [current status]
- **Evidence/Documentation**: [any documents or evidence mentioned]

## 🎯 Objective
[What the client is seeking to achieve]

CRITICAL REQUIREMENTS: 
- Use BOTH initial Q&A responses AND follow-up conversation details
- Use only factual, objective language
- NO "Your Responses" section - DO NOT repeat back the Q&A
- NO internal assessments, scores, or AI analysis
- NO quality ratings or percentages  
- NO suggestions for improvement
- NO "Matter Assessment" section
- This is what the CLIENT sees in their matter summary
- Keep it clean and professional
- ONLY include the 3 sections shown above: Legal Matter, Key Details, and Objective

IMPORTANT FOR FAMILY LAW CASES:
- Be very careful about relationships and who is who
- "im with my mom" = client is living with their own mother/grandmother
- "they are with their mother" = children are with their mother (who is the client's spouse/partner)
- "their mother" in context of children = the other parent (client's spouse/partner)
- Client and spouse/partner are different people
- Children live with spouse/partner, not with client's mother
- Keep relationships clear and simple
- Don't confuse multiple "mothers" in the same matter
- Synthesize ALL information into a coherent summary`;

            const summaryResult = await aiService.runLLM([
              { role: 'system', content: 'You are a legal assistant creating structured markdown matter summaries. Follow the exact format requested. Use clear, professional language. Pay close attention to relationships and living arrangements. Initial Q&A responses and follow-up conversation details should both be considered to create a comprehensive summary.' },
              { role: 'user', content: summaryPrompt }
            ]);
            
            matterSummary = summaryResult.response || `# 📋 ${body.service} Matter Summary\n\n## 💼 Legal Matter\n${body.service} matter with provided details.\n\n## 📝 Key Details\n- **Issue**: Details provided through consultation\n- **Current Situation**: Information gathered`;
            
            // Store AI-generated summary linked to the matter
            if (matterSummary && matterId) {
              await storeAISummary(
                env,
                matterId,
                matterSummary,
                '@cf/meta/llama-3.1-8b-instruct',
                summaryPrompt
              );
            }
          } catch (error) {
            console.warn('AI matter summary failed:', error);
            // Create a basic summary from the Q&A data
            const basicSummary = `# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
${body.service} matter with details provided through consultation.

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: ${questionAnswerPairs.length > 0 ? questionAnswerPairs[0].split(': ')[1] || 'Details provided through consultation' : 'Information gathered through Q&A'}
- **Current Situation**: ${questionAnswerPairs.length > 1 ? questionAnswerPairs[1].split(': ')[1] || 'Under review' : 'Under review'}

## 🎯 Objective
${questionAnswerPairs.length > 2 ? questionAnswerPairs[2].split(': ')[1] || 'Seeking legal assistance' : 'Seeking legal assistance'}`;
            
            matterSummary = basicSummary;
          }
        } else {
          // No AI service available, create basic summary
          matterSummary = `# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
${body.service} matter with details provided through consultation.

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: ${questionAnswerPairs.length > 0 ? questionAnswerPairs[0].split(': ')[1] || 'Details provided through consultation' : 'Information gathered through Q&A'}
- **Current Situation**: ${questionAnswerPairs.length > 1 ? questionAnswerPairs[1].split(': ')[1] || 'Under review' : 'Under review'}

## 🎯 Objective
${questionAnswerPairs.length > 2 ? questionAnswerPairs[2].split(': ')[1] || 'Seeking legal assistance' : 'Seeking legal assistance'}`;
        }
        
        // Store matter Q&A pairs linked to the matter
        if (matterId && matterAnswers) {
          Object.entries(matterAnswers).forEach(async ([key, value]) => {
            if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
              await storeMatterQuestion(
                env,
                matterId,
                body.teamId,
                value.question,
                value.answer,
                'ai-form'
              );
            }
          });
        }
        
        // Determine if matter needs improvement (more strict threshold)
        const needsImprovement = reviewQuality.score < 70 || reviewQuality.breakdown.answerQuality < 60;
        
        // Generate follow-up questions if needed
        let followUpQuestions = [];
        if (needsImprovement && aiService) {
          try {
                         const questionPrompt = `I'm helping someone with their ${body.service} situation. To make sure we have all the information needed to help them effectively, I'd like to ask a few more gentle, supportive questions.

Their situation: ${matterSummary}
Current score: ${reviewQuality.score}/100

Please suggest 2-3 conversational, empathetic follow-up questions that:
1. Feel natural and caring, not interrogative
2. Gather the most important missing information
3. Use phrases like "Can you tell me more about..." or "I'd love to understand..."
4. Acknowledge this might be difficult to discuss

Write each question as if you're a supportive friend or counselor asking for clarification.`;

            const questionResult = await aiService.runLLM([
              { role: 'system', content: 'You are a legal assistant. Generate specific, actionable follow-up questions.' },
              { role: 'user', content: questionPrompt }
            ]);
            
            // Parse questions from AI response
            const rawQuestions = questionResult.response
              .split('\n')
              .filter(line => line.trim() && (line.includes('?') || line.includes('1.') || line.includes('2.') || line.includes('3.')))
              .map(line => line.replace(/^[\s\-\•\d\.]+/, '').trim())
              .filter(q => q.length > 10 && q.includes('?'));
            
            followUpQuestions = rawQuestions.slice(0, 3);
          } catch (error) {
            console.warn('AI follow-up questions failed:', error);
            // Provide default follow-up questions if AI fails
            followUpQuestions = [
              `Can you tell me more about when this ${body.service.toLowerCase()} issue first started?`,
              `I'd love to understand what outcome you're hoping for in this situation.`,
              `Is there anything else about your ${body.service.toLowerCase()} matter that you think would be important for us to know?`
            ];
          }
        }
        
        // Create matter canvas data
        const matterCanvasData = {
          matterId: matterId,
          matterNumber: matterNumber,
          service: body.service,
          matterSummary: matterSummary,
          qualityScore: reviewQuality,
          answers: matterAnswers
        };
        
        // Improved follow-up message logic to avoid redundancy
        let followUpMessage = '';
        if (needsImprovement) {
          if (followUpQuestions.length > 0) {
            // Use the first AI-generated follow-up question directly
            followUpMessage = followUpQuestions[0];
          } else if (reviewQuality.issues.length > 0 && reviewQuality.issues[0].includes('too short')) {
            followUpMessage = `I noticed some of your answers were quite brief. To help you get the best legal assistance, could you provide more details?`;
          } else {
            followUpMessage = `To make sure we have everything needed for your ${body.service.toLowerCase()} matter, I'd love to get a few more details. Can you tell me more about your situation?`;
          }
        } else {
          // High quality matter - provide positive feedback
          if (reviewQuality.score >= 85) {
            followUpMessage = `Excellent! Your matter summary is comprehensive and well-detailed. You've provided everything we need to connect you with the right attorney for your ${body.service.toLowerCase()} matter.`;
          } else if (reviewQuality.score >= 75) {
            followUpMessage = `Great! Your matter summary looks comprehensive. You've provided strong information to connect you with the right attorney who can help with your ${body.service.toLowerCase()} matter.`;
          } else {
            followUpMessage = `Your matter summary looks good! You've provided the information we need to connect you with the right attorney for your ${body.service.toLowerCase()} matter.`;
          }
        }

        // Send matter details webhook (when matter review is completed)
        const webhookService = new WebhookService(env);
        const matterDetailsPayload = {
          event: 'matter_details',
          timestamp: new Date().toISOString(),
          teamId: body.teamId,
          sessionId: body.sessionId,
          matterId: matterId,
          matter: {
            matterId: matterId,
            matterNumber: matterNumber,
            service: body.service,
            description: matterDescription,
            summary: matterSummary,
            answers: matterAnswers,
            qualityScore: {
              score: reviewQuality.score,
              readyForLawyer: reviewQuality.readyForLawyer,
              needsImprovement,
              threshold: 75
            },
            followUpQuestions,
            urgency: body.urgency,
            questionAnswerPairs,
            readyForNextStep: !needsImprovement,
            nextActions: needsImprovement ? ['improve-matter'] : ['contact', 'schedule']
          }
        };

        // Fire and forget webhook - don't wait for completion
        webhookService.sendWebhook(body.teamId, 'matter_details', matterDetailsPayload, teamConfig)
          .catch(error => console.warn('Matter details webhook failed:', error));
        
        return new Response(JSON.stringify({
          step: needsImprovement ? 'matter-review' : 'complete',
          message: followUpMessage,
          selectedService: body.service,
          qualityScore: reviewQuality,
          matterCanvas: matterCanvasData,
          followUpMessage: followUpMessage,
          needsImprovement,
          followUpQuestions,
          currentFollowUpIndex: 0,
          readyForNextStep: !needsImprovement,
          nextActions: needsImprovement ? ['improve-matter'] : ['contact', 'schedule']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'matter-details':
        const serviceText = body.service ? ` regarding your ${body.service} matter` : '';
        const nextStepMessage = quality.readyForLawyer 
          ? `Perfect! Based on your matter details${serviceText}, you're ready to speak with one of our attorneys. Would you like to schedule a consultation or submit your contact information?`
          : `Thank you for the details${serviceText}. To better assist you, I have a few suggestions to strengthen your matter before connecting with an attorney.`;
        
        return new Response(JSON.stringify({
          step: 'complete',
          message: nextStepMessage,
          selectedService: body.service,
          qualityScore: quality,
          readyForNextStep: quality.readyForLawyer,
          nextActions: quality.readyForLawyer ? ['schedule', 'contact'] : ['improve-matter', 'contact']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid step' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Matter creation error:', error);
    return new Response(JSON.stringify({ error: 'Matter creation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Optimized Forms handler with better error handling
async function handleForms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
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
      sendNotifications(body, formId, env).catch(error => {
        console.warn('Email notification failed:', error);
      });
    }

    // Send contact form webhook
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

    // Fire and forget webhook - don't wait for completion
    webhookService.sendWebhook(body.teamId, 'contact_form', contactFormPayload, teamConfig)
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

// Optimized Teams handler with caching
async function handleTeams(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Use prepared statement for better performance
    const stmt = env.DB.prepare('SELECT id, name, config FROM teams');
    const rows = await stmt.all();
    
    const teams = rows.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      config: JSON.parse(row.config || '{}')
    }));

    return new Response(JSON.stringify(teams), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Teams error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch teams' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Scheduling handler
async function handleScheduling(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as {
        teamId: string;
        email: string;
        phoneNumber: string;
        preferredDate: string;
        preferredTime: string;
        matterType: string;
        notes?: string;
      };
      
      if (!body.teamId || !body.email || !body.preferredDate || !body.matterType) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const appointmentId = crypto.randomUUID();
      
      await env.DB.prepare(`
        INSERT INTO appointments (id, team_id, client_email, client_phone, preferred_date, preferred_time, matter_type, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(
        appointmentId, body.teamId, body.email, body.phoneNumber || '',
        body.preferredDate, body.preferredTime || '', body.matterType, body.notes || ''
      ).run();

      // Send appointment webhook
      const aiService = new AIService(env.AI, env);
      const teamConfig = await aiService.getTeamConfig(body.teamId);
      const webhookService = new WebhookService(env);
      const appointmentPayload = {
        event: 'appointment',
        timestamp: new Date().toISOString(),
        teamId: body.teamId,
        appointmentId,
        appointment: {
          clientEmail: body.email,
          clientPhone: body.phoneNumber,
          preferredDate: body.preferredDate,
          preferredTime: body.preferredTime,
          matterType: body.matterType,
          notes: body.notes,
          status: 'pending'
        }
      };

      // Fire and forget webhook - don't wait for completion
      webhookService.sendWebhook(body.teamId, 'appointment', appointmentPayload, teamConfig)
        .catch(error => console.warn('Appointment webhook failed:', error));

      return new Response(JSON.stringify({
        success: true,
        appointmentId,
        message: 'Appointment requested successfully. We will contact you within 24 hours.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Scheduling error:', error);
      return new Response(JSON.stringify({ error: 'Scheduling failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (request.method === 'GET') {
    const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    return new Response(JSON.stringify({
      availableSlots: timeSlots,
      timezone: 'America/New_York'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Session handler
async function handleSessions(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Get session data
  if (path.startsWith('/api/sessions/') && request.method === 'GET') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sessionData = await env.CHAT_SESSIONS.get(sessionId);
      if (!sessionData) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(sessionData, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session retrieval error:', error);
      return new Response(JSON.stringify({ error: 'Session retrieval failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Save session data
  if (path === '/api/sessions' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { sessionId: string; data: any };
      const { sessionId, data } = body;
      
      if (!sessionId || !data) {
        return new Response(JSON.stringify({ error: 'Session ID and data required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store session data with TTL of 24 hours
      await env.CHAT_SESSIONS.put(sessionId, JSON.stringify(data), {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session save error:', error);
      return new Response(JSON.stringify({ error: 'Session save failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Delete session data
  if (path.startsWith('/api/sessions/') && request.method === 'DELETE') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await env.CHAT_SESSIONS.delete(sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session deletion error:', error);
      return new Response(JSON.stringify({ error: 'Session deletion failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid session endpoint' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Files handler
async function handleFiles(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // File upload endpoint
  if (path === '/api/files/upload' && request.method === 'POST') {
    try {
      if (!env.FILES_BUCKET) {
        return new Response(JSON.stringify({ error: 'File storage not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;
      const teamId = formData.get('teamId') as string;
      const sessionId = formData.get('sessionId') as string;

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate file type and size
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
        'video/mp4', 'video/webm', 'video/ogg'
      ];

      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: 'File type not allowed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomUUID();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const fileName = `${teamId}/${sessionId}/${timestamp}-${randomId}.${fileExtension}`;

      // Upload to R2
      const fileBuffer = await file.arrayBuffer();
      await env.FILES_BUCKET.put(fileName, fileBuffer, {
        httpMetadata: {
          contentType: file.type,
          contentDisposition: `attachment; filename="${file.name}"`
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          teamId: teamId || 'unknown',
          sessionId: sessionId || 'unknown'
        }
      });

      // Store file metadata in database
      const fileId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO files (id, team_id, session_id, original_name, file_name, file_type, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(fileId, teamId, sessionId, file.name, fileName, file.type, file.size).run();

      return new Response(JSON.stringify({
        success: true,
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: `/api/files/${fileId}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('File upload error:', error);
      return new Response(JSON.stringify({ error: 'File upload failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // File download endpoint
  if (path.startsWith('/api/files/') && request.method === 'GET') {
    try {
      const fileId = path.split('/').pop();
      if (!fileId) {
        return new Response(JSON.stringify({ error: 'File ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get file metadata from database
      const fileRow = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(fileId).first();
      if (!fileRow) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!env.FILES_BUCKET) {
        return new Response(JSON.stringify({ error: 'File storage not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get file from R2
      const object = await env.FILES_BUCKET.get(fileRow.file_name as string);
      if (!object) {
        return new Response(JSON.stringify({ error: 'File not found in storage' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Return file with appropriate headers
      return new Response(object.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': fileRow.file_type as string,
          'Content-Disposition': `attachment; filename="${fileRow.original_name}"`,
          'Content-Length': fileRow.file_size?.toString() || '0'
        }
      });

    } catch (error) {
      console.error('File download error:', error);
      return new Response(JSON.stringify({ error: 'File download failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid file endpoint' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Feedback handler
async function handleFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as {
      sessionId: string;
      teamId?: string;
      rating?: number;
      thumbsUp?: boolean;
      comments?: string;
      intent?: string;
    };
    
    if (!body.sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const feedbackId = crypto.randomUUID();
    
    await env.DB.prepare(`
      INSERT INTO ai_feedback (id, session_id, team_id, rating, thumbs_up, comments, intent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      feedbackId,
      body.sessionId,
      body.teamId || null,
      body.rating || null,
      body.thumbsUp || null,
      body.comments || null,
      body.intent || null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Feedback error:', error);
    return new Response(JSON.stringify({ error: 'Feedback submission failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Data export handler
async function handleExport(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const dataType = url.searchParams.get('type');
    const teamId = url.searchParams.get('teamId');
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    if (!dataType) {
      return new Response(JSON.stringify({ error: 'Data type required (chat_logs, matter_questions, ai_summaries, ai_feedback)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let query = '';
    let params: any[] = [];

    switch (dataType) {
      case 'chat_logs':
        query = `SELECT * FROM chat_logs ${teamId ? 'WHERE team_id = ?' : ''} ORDER BY timestamp DESC LIMIT ?`;
        params = teamId ? [teamId, limit] : [limit];
        break;
      
      case 'matter_questions':
        query = `SELECT * FROM matter_questions ${teamId ? 'WHERE team_id = ?' : ''} ORDER BY created_at DESC LIMIT ?`;
        params = teamId ? [teamId, limit] : [limit];
        break;
      
      case 'ai_summaries':
        query = `SELECT * FROM ai_generated_summaries ORDER BY created_at DESC LIMIT ?`;
        params = [limit];
        break;
      
      case 'ai_feedback':
        query = `SELECT * FROM ai_feedback ${teamId ? 'WHERE team_id = ?' : ''} ORDER BY created_at DESC LIMIT ?`;
        params = teamId ? [teamId, limit] : [limit];
        break;
      
      case 'training_pairs':
        // Export chat logs formatted as training pairs
        query = `
          SELECT 
            c1.content as user_message,
            c2.content as assistant_message,
            c1.team_id,
            c1.timestamp
          FROM chat_logs c1
          JOIN chat_logs c2 ON c1.session_id = c2.session_id
          WHERE c1.role = 'user' 
            AND c2.role = 'assistant'
            AND c2.timestamp > c1.timestamp
            ${teamId ? 'AND c1.team_id = ?' : ''}
          ORDER BY c1.timestamp DESC
          LIMIT ?
        `;
        params = teamId ? [teamId, limit] : [limit];
        break;
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid data type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      dataType,
      count: results.results.length,
      data: results.results
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${dataType}_export_${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Data export failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Webhook management handler
async function handleWebhooks(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/webhooks/logs - Get webhook logs
  if (path === '/api/webhooks/logs' && request.method === 'GET') {
    try {
      const teamId = url.searchParams.get('teamId');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const status = url.searchParams.get('status'); // 'pending', 'success', 'failed', 'retry'

      let query = 'SELECT * FROM webhook_logs';
      let params: any[] = [];

      if (teamId || status) {
        query += ' WHERE';
        const conditions = [];
        
        if (teamId) {
          conditions.push(' team_id = ?');
          params.push(teamId);
        }
        
        if (status) {
          conditions.push(' status = ?');
          params.push(status);
        }
        
        query += conditions.join(' AND');
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const stmt = env.DB.prepare(query);
      const results = await stmt.bind(...params).all();

      return new Response(JSON.stringify({
        success: true,
        logs: results.results,
        count: results.results.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook logs error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhook logs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/webhooks/retry - Retry failed webhooks
  if (path === '/api/webhooks/retry' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { webhookId?: string; teamId?: string };

      if (body.webhookId) {
        // Retry specific webhook
        const webhookLog = await env.DB.prepare(
          'SELECT * FROM webhook_logs WHERE id = ? AND status IN (?, ?)'
        ).bind(body.webhookId, 'failed', 'retry').first();

        if (!webhookLog) {
          return new Response(JSON.stringify({ error: 'Webhook not found or not retryable' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get team config and retry webhook
        const aiService = new AIService(env.AI, env);
        const teamConfig = await aiService.getTeamConfig(webhookLog.team_id as string);
        const webhookService = new WebhookService(env);
        
        const payload = JSON.parse(webhookLog.payload as string);
        
        // Reset webhook status and retry
        await env.DB.prepare(`
          UPDATE webhook_logs 
          SET status = 'pending', updated_at = datetime('now')
          WHERE id = ?
        `).bind(body.webhookId).run();

        // Fire and forget retry
        webhookService.sendWebhook(
          webhookLog.team_id as string,
          webhookLog.webhook_type as 'matter_creation' | 'matter_details' | 'contact_form' | 'appointment',
          payload,
          teamConfig
        ).catch(error => console.warn('Webhook retry failed:', error));

        return new Response(JSON.stringify({
          success: true,
          message: 'Webhook retry initiated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else if (body.teamId) {
        // Retry all failed webhooks for a team
        const failedWebhooks = await env.DB.prepare(
          'SELECT * FROM webhook_logs WHERE team_id = ? AND status IN (?, ?) LIMIT 10'
        ).bind(body.teamId, 'failed', 'retry').all();

        const aiService = new AIService(env.AI, env);
        const teamConfig = await aiService.getTeamConfig(body.teamId);
        const webhookService = new WebhookService(env);

        let retryCount = 0;
        for (const webhook of failedWebhooks.results) {
          const payload = JSON.parse(webhook.payload as string);
          
          // Reset webhook status
          await env.DB.prepare(`
            UPDATE webhook_logs 
            SET status = 'pending', updated_at = datetime('now')
            WHERE id = ?
          `).bind(webhook.id).run();

          // Fire and forget retry
          webhookService.sendWebhook(
            webhook.team_id as string,
            webhook.webhook_type as 'matter_creation' | 'matter_details' | 'contact_form' | 'appointment',
            payload,
            teamConfig
          ).catch(error => console.warn('Webhook retry failed:', error));

          retryCount++;
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Initiated retry for ${retryCount} failed webhooks`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        return new Response(JSON.stringify({ error: 'webhookId or teamId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('Webhook retry error:', error);
      return new Response(JSON.stringify({ error: 'Failed to retry webhook' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/webhooks/stats - Get webhook statistics
  if (path === '/api/webhooks/stats' && request.method === 'GET') {
    try {
      const teamId = url.searchParams.get('teamId');
      
      let baseQuery = 'SELECT status, COUNT(*) as count FROM webhook_logs';
      let params: any[] = [];

      if (teamId) {
        baseQuery += ' WHERE team_id = ?';
        params.push(teamId);
      }

      baseQuery += ' GROUP BY status';

      const stmt = env.DB.prepare(baseQuery);
      const results = await stmt.bind(...params).all();

      const stats = results.results.reduce((acc: any, row: any) => {
        acc[row.status] = row.count;
        return acc;
      }, {});

      return new Response(JSON.stringify({
        success: true,
        stats: {
          pending: stats.pending || 0,
          success: stats.success || 0,
          failed: stats.failed || 0,
          retry: stats.retry || 0,
          total: Object.values(stats).reduce((sum: number, count: any) => sum + count, 0)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook stats error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhook stats' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/webhooks/test - Test webhook functionality
  if (path === '/api/webhooks/test' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { 
        teamId: string; 
        webhookType: 'matter_creation' | 'matter_details' | 'contact_form' | 'appointment';
        testPayload?: any;
      };

      if (!body.teamId || !body.webhookType) {
        return new Response(JSON.stringify({ error: 'teamId and webhookType required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get team config
      const aiService = new AIService(env.AI, env);
      const teamConfig = await aiService.getTeamConfig(body.teamId);

      if (!teamConfig.webhooks?.enabled) {
        return new Response(JSON.stringify({ error: 'Webhooks not enabled for this team' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create test payload
      const testPayload = body.testPayload || {
        event: body.webhookType,
        timestamp: new Date().toISOString(),
        teamId: body.teamId,
        test: true,
        data: {
          message: 'This is a test webhook payload'
        }
      };

      // Send test webhook
      const webhookService = new WebhookService(env);
      await webhookService.sendWebhook(body.teamId, body.webhookType, testPayload, teamConfig);

      return new Response(JSON.stringify({
        success: true,
        message: 'Test webhook sent successfully',
        webhookUrl: teamConfig.webhooks.url,
        payload: testPayload
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook test error:', error);
      return new Response(JSON.stringify({ error: 'Failed to send test webhook' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid webhook endpoint' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Optimized notification sender with cached team config
async function sendNotifications(formData: ContactForm, formId: string, env: Env) {
  const emailService = new EmailService(env.RESEND_API_KEY);
  
  // Send client confirmation and team notification in parallel for better performance
  const promises = [];
  
  // Client confirmation
  promises.push(
    emailService.send({
      from: 'noreply@blawby.com',
      to: formData.email,
      subject: 'Thank you for contacting our law firm',
      text: `Thank you for your inquiry. Reference ID: ${formId}. We will contact you within 24 hours.`
    })
  );

  // Team notification using cached config
  const aiService = new AIService(env.AI, env);
  const teamConfig = await aiService.getTeamConfig(formData.teamId);
  
  if (teamConfig.ownerEmail) {
    promises.push(
      emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: `New Lead: ${formData.email}`,
        text: `New lead received:\n\nEmail: ${formData.email}\nPhone: ${formData.phoneNumber}\nMatter: ${formData.matterDetails}\nForm ID: ${formId}`
      })
    );
  }
  
  // Wait for all emails to complete
  await Promise.allSettled(promises);
} 

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (path.startsWith('/api/chat')) return handleChat(request, env, CORS_HEADERS);
    if (path.startsWith('/api/teams')) return handleTeams(request, env, CORS_HEADERS);
    if (path.startsWith('/api/forms')) return handleForms(request, env, CORS_HEADERS);
    if (path.startsWith('/api/matter-creation')) return handleMatterCreation(request, env, CORS_HEADERS);
    if (path.startsWith('/api/scheduling')) return handleScheduling(request, env, CORS_HEADERS);
    if (path.startsWith('/api/files')) return handleFiles(request, env, CORS_HEADERS);
    if (path.startsWith('/api/sessions')) return handleSessions(request, env, CORS_HEADERS);
    if (path.startsWith('/api/feedback')) return handleFeedback(request, env, CORS_HEADERS);
    if (path.startsWith('/api/export')) return handleExport(request, env, CORS_HEADERS);
    if (path.startsWith('/api/webhooks')) return handleWebhooks(request, env, CORS_HEADERS);
    if (path === '/api/health') return handleHealth(request, env, CORS_HEADERS);
    if (path === '/') return handleRoot(request, env, CORS_HEADERS);

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

export default { fetch: handleRequest }; 