import { Env } from './health';
import { parseJsonBody } from '../utils';

export async function handleWebhooks(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
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
        const { AIService } = await import('../services/AIService.js');
        const { WebhookService } = await import('../services/WebhookService.js');
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

        const { AIService } = await import('../services/AIService.js');
        const { WebhookService } = await import('../services/WebhookService.js');
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
      const { AIService } = await import('../services/AIService.js');
      const aiService = new AIService(env.AI, env);
      const teamConfig = await aiService.getTeamConfig(body.teamId);

      if (!teamConfig.webhooks?.enabled) {
        return new Response(JSON.stringify({ error: 'Webhooks not enabled for this team' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create test payload based on webhook type
      let testPayload;
      if (body.testPayload) {
        testPayload = body.testPayload;
      } else if (body.webhookType === 'contact_form') {
        testPayload = {
          event: body.webhookType,
          timestamp: new Date().toISOString(),
          teamId: body.teamId,
          formId: crypto.randomUUID(),
          contactForm: {
            email: "test@example.com",
            phoneNumber: "+1234567890",
            urgency: "high",
            matterDetails: "This is a test matter from webhook",
            status: "pending"
          }
        };
      } else {
        testPayload = {
          event: body.webhookType,
          timestamp: new Date().toISOString(),
          teamId: body.teamId,
          test: true,
          data: {
            message: 'This is a test webhook payload'
          }
        };
      }

      // Send test webhook
      const { WebhookService } = await import('../services/WebhookService.js');
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

  // POST /api/webhooks/clear-cache - Clear team config cache
  if (path === '/api/webhooks/clear-cache' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { teamId?: string };
      
      const { AIService } = await import('../services/AIService.js');
      const aiService = new AIService(env.AI, env);
      aiService.clearCache(body.teamId);

      return new Response(JSON.stringify({
        success: true,
        message: body.teamId ? `Cache cleared for team ${body.teamId}` : 'All caches cleared'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Clear cache error:', error);
      return new Response(JSON.stringify({ error: 'Failed to clear cache' }), {
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