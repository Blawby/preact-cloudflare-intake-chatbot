import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleExport(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
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