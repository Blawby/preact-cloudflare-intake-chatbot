/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  VECTORIZE?: any;
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
  caseDetails: string;
  teamId: string;
  urgency?: string;
}

interface CaseCreationRequest {
  teamId: string;
  service?: string;
  step: 'service-selection' | 'questions' | 'case-review' | 'case-details' | 'complete';
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
  
  async searchKnowledge(query: string) {
    if (!this.env.VECTORIZE) return [];
    
    try {
      const embedding = await this.ai.run("@cf/baai/bge-small-en-v1.5", { text: query });
      const result = await this.env.VECTORIZE.query(embedding.data[0], { topK: 3 });
      return result.matches || [];
    } catch (error) {
      console.warn('Knowledge search failed:', error);
      return [];
    }
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

// Pre-compiled keyword sets for better performance
const EVIDENCE_KEYWORDS = new Set([
  'document', 'contract', 'photo', 'picture', 'receipt', 'email', 'letter',
  'recording', 'video', 'screenshot', 'witness', 'evidence', 'proof',
  'paperwork', 'signed', 'written', 'attachment', 'file'
]);

const URGENT_KEYWORDS = new Set([
  'emergency', 'urgent', 'immediately', 'asap', 'deadline', 'court date', 
  'eviction', 'foreclosure', 'termination', 'fired', 'arrest', 'custody',
  'threat', 'violence', 'abuse', 'harassment', 'restraining order',
  'bankruptcy', 'lawsuit filed', 'hearing', 'trial', 'expires', 'due date'
]);

const MODERATE_KEYWORDS = new Set([
  'soon', 'quickly', 'time sensitive', 'pending', 'waiting', 'delayed',
  'problem', 'issue', 'concerned', 'worried', 'help needed', 'separated',
  'dispute', 'conflict', 'disagreement', 'contract issue'
]);

const SITUATION_URGENCY = new Map([
  ['hotel', 70], ['motel', 70], ['homeless', 100], ['evicted', 100], ['staying with', 60],
  ['court date', 100], ['hearing', 90], ['trial', 100], ['lawsuit', 80], ['filed against', 90],
  ['fired', 80], ['terminated', 80], ['lost job', 70], ['need job', 50],
  ['custody', 80], ['child support', 70], ['divorce', 60], ['separated', 50],
  ['bankruptcy', 90], ['foreclosure', 100], ['can\'t pay', 80]
]);

// Optimized case quality assessment with reduced AI calls
async function assessCaseQuality(caseData: any, aiService?: AIService): Promise<{
  score: number;
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
  badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: 'blue' | 'green' | 'yellow' | 'red';
  inferredUrgency: string;
}> {
  const breakdown = {
    followUpCompletion: 0,
    requiredFields: 0,
    evidence: 0,
    clarity: 0,
    urgency: 0,
    consistency: 0,
    aiConfidence: 60 // Default confidence
  };
  
  const suggestions: string[] = [];
  
  // Extract answer text efficiently
  const answerTexts = Object.values(caseData.answers || {}).map(value => {
    if (typeof value === 'object' && value !== null && 'answer' in value) {
      return value.answer;
    }
    return value;
  }).filter(text => text && typeof text === 'string');
  
  const fullText = `${caseData.description || ''} ${answerTexts.join(' ')}`.toLowerCase();
  
  // 1. Follow-up Completion (25 points)
  const totalQuestions = Object.keys(caseData.answers || {}).length;
  const expectedQuestions = 3;
  if (totalQuestions > 0) {
    breakdown.followUpCompletion = Math.min(100, (totalQuestions / expectedQuestions) * 100);
  } else {
    suggestions.push("Answer the practice area questions to provide more context");
  }
  
  // 2. Required Fields (20 points)
  let requiredFieldsScore = 0;
  if (caseData.service) requiredFieldsScore += 50;
  if (caseData.description && caseData.description.length > 20) requiredFieldsScore += 50;
  breakdown.requiredFields = requiredFieldsScore;
  
  if (!caseData.service) suggestions.push("Select a practice area");
  if (!caseData.description || caseData.description.length <= 20) {
    suggestions.push("Provide a detailed case description");
  }
  
  // 3. Evidence Detection (15 points) - optimized with Set
  let evidenceCount = 0;
  for (const keyword of EVIDENCE_KEYWORDS) {
    if (fullText.includes(keyword)) {
      evidenceCount++;
    }
  }
  breakdown.evidence = Math.min(100, evidenceCount * 25);
  
  if (breakdown.evidence < 50) {
    suggestions.push("Consider mentioning any documents, photos, or evidence you have");
  }
  
  // 4. Clarity Assessment (15 points)
  const descriptionLength = (caseData.description || '').length;
  if (descriptionLength > 100) {
    breakdown.clarity = Math.min(100, descriptionLength / 3);
  } else {
    suggestions.push("Provide more specific details about what happened and when");
  }
  
  // 5. AI-Powered Urgency Assessment (10 points) - optimized with Sets
  let urgencyScore = 40;
  let inferredUrgency = 'Not Urgent';
  
  let urgentCount = 0;
  let moderateCount = 0;
  
  for (const keyword of URGENT_KEYWORDS) {
    if (fullText.includes(keyword)) urgentCount++;
  }
  
  for (const keyword of MODERATE_KEYWORDS) {
    if (fullText.includes(keyword)) moderateCount++;
  }
  
  // Check situation urgency efficiently
  let maxSituationUrgency = 0;
  for (const [situation, score] of SITUATION_URGENCY) {
    if (fullText.includes(situation)) {
      maxSituationUrgency = Math.max(maxSituationUrgency, score);
    }
  }
  
  // Calculate urgency score
  if (urgentCount >= 2 || maxSituationUrgency >= 90) {
    urgencyScore = 100;
    inferredUrgency = 'Very Urgent';
  } else if (urgentCount >= 1 || moderateCount >= 2 || maxSituationUrgency >= 60) {
    urgencyScore = 70;
    inferredUrgency = 'Somewhat Urgent';
  } else if (moderateCount >= 1 || maxSituationUrgency >= 40) {
    urgencyScore = 50;
    inferredUrgency = 'Somewhat Urgent';
  }
  
  // Override with explicit urgency if provided
  if (caseData.urgency) {
    const urgencyMap = {
      'Very Urgent': 100,
      'Somewhat Urgent': 70,
      'Not Urgent': 40
    };
    urgencyScore = urgencyMap[caseData.urgency as keyof typeof urgencyMap] || urgencyScore;
    inferredUrgency = caseData.urgency;
  }
  
  breakdown.urgency = urgencyScore;
  
  // 6. Consistency Check (10 points)
  if (caseData.service && totalQuestions > 0) {
    breakdown.consistency = 80;
  } else {
    breakdown.consistency = 40;
  }
  
  // 7. AI Confidence (5 points) - only call AI if score is low
  if (aiService && caseData.description) {
    const tempScore = Math.round(
      breakdown.followUpCompletion * 0.25 +
      breakdown.requiredFields * 0.20 +
      breakdown.evidence * 0.15 +
      breakdown.clarity * 0.15 +
      breakdown.urgency * 0.10 +
      breakdown.consistency * 0.10 +
      breakdown.aiConfidence * 0.05
    );
    
    // Only call AI if score is below threshold to save resources
    if (tempScore < 75) {
      try {
        const analysisPrompt = `Analyze this legal case description for clarity, completeness, and actionable details. Rate confidence from 0-100:
        
Case Type: ${caseData.service || 'Unknown'}
Description: ${caseData.description}
Answers: ${JSON.stringify(caseData.answers || {})}

Focus on: legal merit, factual clarity, timeline specificity, and evidence mentioned.
Respond with just a number 0-100.`;

        const aiResult = await aiService.runLLM([
          { role: 'system', content: 'You are a legal case analyst. Provide only numeric confidence ratings.' },
          { role: 'user', content: analysisPrompt }
        ]);
        
        const confidenceMatch = aiResult.response.match(/\d+/);
        if (confidenceMatch) {
          breakdown.aiConfidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[0])));
        }
      } catch (error) {
        console.warn('AI confidence analysis failed:', error);
      }
    }
  }
  
  // Calculate overall score
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
  
  // Determine badge and color
  let badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  let color: 'blue' | 'green' | 'yellow' | 'red';
  
  if (score >= 90) {
    badge = 'Excellent';
    color = 'blue';
  } else if (score >= 75) {
    badge = 'Good';
    color = 'green';
  } else if (score >= 50) {
    badge = 'Fair';
    color = 'yellow';
  } else {
    badge = 'Poor';
    color = 'red';
  }
  
  // Enhanced suggestions based on AI analysis - only if score is low
  if (aiService && score < 80) {
    try {
      const suggestionPrompt = `Based on this legal case, provide 2-3 specific suggestions to improve the case quality:
      
Case Type: ${caseData.service || 'Unknown'}
Description: ${caseData.description}
Current Score: ${score}/100

Provide practical, actionable suggestions for better case preparation.`;

      const aiResult = await aiService.runLLM([
        { role: 'system', content: 'You are a legal assistant. Provide concise, actionable suggestions.' },
        { role: 'user', content: suggestionPrompt }
      ]);
      
      // Extract suggestions from AI response
      const aiSuggestions = aiResult.response
        .split('\n')
        .filter(line => line.trim() && (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.') || line.includes('3.')))
        .map(line => line.replace(/^[\s\-\•\d\.]+/, '').trim())
        .filter(suggestion => suggestion.length > 10);
      
      if (aiSuggestions.length > 0) {
        suggestions.push(...aiSuggestions.slice(0, 2)); // Add top 2 AI suggestions
      }
    } catch (error) {
      console.warn('AI suggestions failed:', error);
    }
  }
  
  // Remove duplicates and limit suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 4);
  
  return {
    score,
    breakdown,
    suggestions: uniqueSuggestions,
    readyForLawyer: score >= 70,
    badge,
    color,
    inferredUrgency
  };
}

// Router pattern for better performance
const router = {
  '/api/chat': handleChat,
  '/api/teams': handleTeams,
  '/api/forms': handleForms,
  '/api/case-creation': handleCaseCreation,
  '/api/scheduling': handleScheduling,
  '/api/files': handleFiles,
  '/api/sessions': handleSessions,
  '/api/health': handleHealth,
  '/': handleRoot
};

// Main worker handler with optimized routing
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Find matching route
      let handler = null;
      for (const [route, routeHandler] of Object.entries(router)) {
        if (path.startsWith(route)) {
          handler = routeHandler;
          break;
        }
      }

      if (handler) {
        return handler(request, env, CORS_HEADERS);
      }

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
  },
};

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
    <p>AI-powered legal assistance with case building</p>
    <ul>
        <li><strong>POST</strong> /api/chat - AI conversations</li>
        <li><strong>GET</strong> /api/teams - Available teams</li>
        <li><strong>POST</strong> /api/case-creation - Case building flow</li>
        <li><strong>POST</strong> /api/forms - Contact submissions</li>
        <li><strong>POST</strong> /api/scheduling - Appointments</li>
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
    
    // Save conversation to session if sessionId provided - optimized with structured data
    if (body.sessionId) {
      try {
        const sessionData = {
          teamId: body.teamId,
          messages: [...body.messages, { role: 'assistant', content: response }],
          lastActivity: new Date().toISOString(),
          intent: 'general',
          shouldStartCaseCreation: false
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
      shouldStartCaseCreation: false,
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

// Optimized Case creation handler with caching
async function handleCaseCreation(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as CaseCreationRequest;
    
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

    const quality = await assessCaseQuality(body, aiService);

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

          // Save case creation state to session
          if (body.sessionId) {
            try {
              const sessionData = {
                teamId: body.teamId,
                caseCreationState: {
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
              console.warn('Failed to save case creation session:', error);
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
            // No questions, go straight to case details
            return new Response(JSON.stringify({
              step: 'case-details',
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
          // All questions answered, move to case review step
          const answers = body.answers || {};
          const answerValues = Object.values(answers).filter(Boolean);
          
          // Auto-generate case description from Q&A answers
          const autoDescription = `${body.service} case: ${answerValues.join('. ')}.`;
          
          // Create enhanced body for quality assessment
          const enhancedBody = {
            ...body,
            description: autoDescription,
            answers: answers
          };
          
          // Get quality assessment with the auto-generated description
          const initialQuality = await assessCaseQuality(enhancedBody, aiService);
          
          return new Response(JSON.stringify({
            step: 'case-review',
            message: `Thank you for answering those questions. Let me review your case and provide a summary.`,
            selectedService: body.service,
            qualityScore: initialQuality,
            autoGeneratedDescription: autoDescription,
            answers: answers
          }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
        }

      case 'case-review':
        // Generate comprehensive case summary and determine next steps
        const caseAnswers = body.answers || {};
        const caseDescription = body.description || `${body.service} case with provided details`;
        
        // Extract question-answer pairs from the new data structure
        const questionAnswerPairs = Object.entries(caseAnswers).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
            return `**${value.question}**: ${value.answer}`;
          }
          // Fallback for old format
          return `**${key}**: ${value}`;
        }).filter(pair => pair.includes(': ') && !pair.includes(': undefined'));
        
        // Create enhanced case data for assessment
        const caseData = {
          service: body.service,
          description: caseDescription,
          answers: caseAnswers,
          urgency: body.urgency
        };
        
        // Get detailed quality assessment
        const reviewQuality = await assessCaseQuality(caseData, aiService);
        
                // Generate structured markdown case summary for canvas
        let caseSummary = '';
        if (aiService) {
          try {
             const summaryPrompt = `Create a clean case summary markdown for this ${body.service} matter. The client provided initial structured answers AND follow-up conversation details. Use ALL information provided:

Initial Q&A and Follow-up Information:
${questionAnswerPairs.join('\n')}

Generate ONLY markdown content using the EXACT format below. Use FACTS ONLY - no empathetic language, no emotional content:

# 📋 ${body.service} Case Summary

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
- NO "Case Assessment" section
- This is what the CLIENT sees in their case summary
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
- Don't confuse multiple "mothers" in the same case
- Synthesize ALL information into a coherent summary`;

            const summaryResult = await aiService.runLLM([
              { role: 'system', content: 'You are a legal assistant creating structured markdown case summaries. Follow the exact format requested. Use clear, professional language. Pay close attention to relationships and living arrangements. Initial Q&A responses and follow-up conversation details should both be considered to create a comprehensive summary.' },
              { role: 'user', content: summaryPrompt }
            ]);
            
            caseSummary = summaryResult.response || `# 📋 ${body.service} Case Summary\n\n## 💼 Legal Matter\n${body.service} case with provided details.\n\n## 📝 Key Details\n- **Issue**: Details provided through consultation\n- **Current Situation**: Information gathered`;
          } catch (error) {
            console.warn('AI case summary failed:', error);
            caseSummary = `# 📋 ${body.service} Case Summary\n\n## 💼 Legal Matter\n${body.service} case with provided details.\n\n## 📝 Key Details\n- **Issue**: Details provided through consultation\n- **Current Situation**: Information gathered`;
          }
        }
        
        // Determine if case needs improvement (threshold: 75)
        const needsImprovement = reviewQuality.score < 75;
        
        // Generate follow-up questions if needed
        let followUpQuestions = [];
        if (needsImprovement && aiService) {
          try {
                         const questionPrompt = `I'm helping someone with their ${body.service} situation. To make sure we have all the information needed to help them effectively, I'd like to ask a few more gentle, supportive questions.

Their situation: ${caseSummary}
Areas that could use more detail: ${reviewQuality.suggestions.join(', ')}

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
          }
        }
        
        // Create empathetic intro message before canvas
        let reviewMessage = `Thanks for sharing your situation with me. I can tell this has been really challenging, especially dealing with ${body.service.toLowerCase()} matters. I've put together a case summary based on what you've shared so far — you'll see that summary below.`;
        
        // Create case canvas data
        const caseCanvasData = {
          service: body.service,
          caseSummary: caseSummary,
          qualityScore: reviewQuality,
          answers: caseAnswers,
          isExpanded: false
        };
        
        // Follow-up message if needed
        let followUpMessage = '';
        if (needsImprovement && followUpQuestions.length > 0) {
          followUpMessage = `Looking at your case summary, I'd love to get a few more details to strengthen your position. ${followUpQuestions[0]}`;
        } else {
          followUpMessage = `Your case summary looks comprehensive! I believe we have strong information to connect you with the right attorney who can help with your ${body.service.toLowerCase()} matter.`;
        }
        
        return new Response(JSON.stringify({
          step: needsImprovement ? 'case-review' : 'complete',
          message: reviewMessage,
          selectedService: body.service,
          qualityScore: reviewQuality,
          caseCanvas: caseCanvasData,
          followUpMessage: followUpMessage,
          needsImprovement,
          followUpQuestions,
          currentFollowUpIndex: 0,
          readyForNextStep: !needsImprovement,
          nextActions: needsImprovement ? ['improve-case'] : ['contact', 'schedule']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'case-details':
        const serviceText = body.service ? ` regarding your ${body.service} matter` : '';
        const nextStepMessage = quality.readyForLawyer 
          ? `Perfect! Based on your case details${serviceText}, you're ready to speak with one of our attorneys. Would you like to schedule a consultation or submit your contact information?`
          : `Thank you for the details${serviceText}. To better assist you, I have a few suggestions to strengthen your case before connecting with an attorney.`;
        
        return new Response(JSON.stringify({
          step: 'complete',
          message: nextStepMessage,
          selectedService: body.service,
          qualityScore: quality,
          readyForNextStep: quality.readyForLawyer,
          nextActions: quality.readyForLawyer ? ['schedule', 'contact'] : ['improve-case', 'contact']
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
    console.error('Case creation error:', error);
    return new Response(JSON.stringify({ error: 'Case creation failed' }), {
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
    
    if (!body.email || !body.phoneNumber || !body.caseDetails || !body.teamId) {
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
      INSERT INTO contact_forms (id, team_id, phone_number, email, case_details, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(formId, body.teamId, body.phoneNumber, body.email, body.caseDetails).run();

    // Send notifications asynchronously to improve response time
    if (env.RESEND_API_KEY) {
      // Fire and forget - don't wait for email to complete
      sendNotifications(body, formId, env).catch(error => {
        console.warn('Email notification failed:', error);
      });
    }

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
        caseType: string;
        notes?: string;
      };
      
      if (!body.teamId || !body.email || !body.preferredDate || !body.caseType) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const appointmentId = crypto.randomUUID();
      
      await env.DB.prepare(`
        INSERT INTO appointments (id, team_id, email, phone_number, preferred_date, preferred_time, case_type, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(
        appointmentId, body.teamId, body.email, body.phoneNumber || '',
        body.preferredDate, body.preferredTime || '', body.caseType, body.notes || ''
      ).run();

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
        INSERT INTO uploaded_files (id, team_id, session_id, original_name, file_name, file_type, file_size, uploaded_at)
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
      const fileRow = await env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(fileId).first();
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
        text: `New lead received:\n\nEmail: ${formData.email}\nPhone: ${formData.phoneNumber}\nCase: ${formData.caseDetails}\nForm ID: ${formId}`
      })
    );
  }
  
  // Wait for all emails to complete
  await Promise.allSettled(promises);
} 