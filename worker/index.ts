export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
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
    <div class="status ok">✅ Database: D1 (blawby-ai-chatbot)</div>
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
        // In a real implementation, this would query the database
        const mockTeams = [
          { id: 'test-team', name: 'Test Law Firm', config: { consultationFee: 150, requiresPayment: true } },
          { id: 'family-law-team', name: 'Family Law Specialists', config: { consultationFee: 200, requiresPayment: true } },
          { id: 'criminal-defense-team', name: 'Criminal Defense Attorneys', config: { consultationFee: 300, requiresPayment: true } },
          { id: 'demo', name: 'Demo Law Firm', config: { consultationFee: 0, requiresPayment: false } }
        ];
        teamConfig = mockTeams.find(team => team.id === body.teamId);
      }

      // Create team-specific system prompt
      const systemPrompt = teamConfig 
        ? `You are a helpful legal assistant for ${teamConfig.name}. Provide clear, professional, and accurate legal information. Always remind users that you are an AI assistant and recommend consulting with a qualified attorney for specific legal advice.${teamConfig.config.requiresPayment ? ` Consultation fee: $${teamConfig.config.consultationFee}.` : ' Free consultation available.'}`
        : 'You are a helpful legal assistant for Blawby AI. Provide clear, professional, and accurate legal information. Always remind users that you are an AI assistant and recommend consulting with a qualified attorney for specific legal advice.';

      // Generate AI response
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          ...body.messages
        ],
        stream: false
      });

      return new Response(JSON.stringify({ 
        response: response.response,
        timestamp: new Date().toISOString(),
        sessionId: body.sessionId || null
      }), {
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

async function handleTeams(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    try {
      // Mock team data for now - will be replaced with database queries
      const teams = [
        { 
          id: 'test-team', 
          name: 'Test Law Firm', 
          config: { 
            aiModel: 'llama',
            consultationFee: 150,
            requiresPayment: true,
            availableServices: ['family-law', 'criminal-defense', 'civil-litigation']
          } 
        },
        { 
          id: 'family-law-team', 
          name: 'Family Law Specialists', 
          config: { 
            aiModel: 'llama',
            consultationFee: 200,
            requiresPayment: true,
            availableServices: ['divorce', 'child-custody', 'adoption', 'prenuptial-agreements']
          } 
        },
        { 
          id: 'criminal-defense-team', 
          name: 'Criminal Defense Attorneys', 
          config: { 
            aiModel: 'llama',
            consultationFee: 300,
            requiresPayment: true,
            availableServices: ['dui-defense', 'drug-charges', 'assault', 'white-collar-crime']
          } 
        },
        { 
          id: 'demo', 
          name: 'Demo Law Firm', 
          config: { 
            aiModel: 'llama',
            consultationFee: 0,
            requiresPayment: false,
            availableServices: ['general-consultation', 'legal-advice']
          } 
        }
      ];

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