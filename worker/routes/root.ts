import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { CORS_HEADERS } from '../utils';

export async function handleRoot(request: Request, env: Env): Promise<Response> {
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
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/html' }
  });
} 