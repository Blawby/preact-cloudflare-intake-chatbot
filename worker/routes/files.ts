import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleFiles(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Simplified file handling - just log for now since agent can handle uploads
  if (path === '/api/files/upload' && request.method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const teamId = formData.get('teamId') as string;
      const sessionId = formData.get('sessionId') as string;

      console.log('File upload received:', {
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
        teamId,
        sessionId
      });

      return createSuccessResponse({
        message: 'File upload received. The agent will handle your request.'
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // File download endpoint (simplified)
  if (path.startsWith('/api/files/') && request.method === 'GET') {
    try {
      const fileId = path.split('/').pop();
      console.log('File download requested:', fileId);

      return createSuccessResponse({
        message: 'File download endpoint. The agent will handle file access.'
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  throw HttpErrors.notFound('Invalid file endpoint');
} 