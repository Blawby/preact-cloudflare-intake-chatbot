import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleFiles(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // File upload endpoint
  if (path === '/api/files/upload' && request.method === 'POST') {
    try {
      if (!env.FILES_BUCKET) {
        throw HttpErrors.serviceUnavailable('File storage not configured');
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;
      const teamId = formData.get('teamId') as string;
      const sessionId = formData.get('sessionId') as string;

      // Required field checks BEFORE any DB or bucket operations
      if (!file || !teamId || !sessionId) {
        throw HttpErrors.badRequest('Missing required fields: file, teamId, or sessionId');
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
        throw HttpErrors.badRequest('File type not allowed');
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        throw HttpErrors.badRequest('File too large. Maximum size is 10MB');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = teamId + '-' + Date.now();
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
      const fileId = teamId + '-' + Date.now();
      await env.DB.prepare(`
        INSERT INTO files (id, team_id, session_id, original_name, file_name, file_type, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(fileId, teamId, sessionId, file.name, fileName, file.type, file.size).run();

      return createSuccessResponse({
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: `/api/files/${fileId}`
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // File download endpoint
  if (path.startsWith('/api/files/') && request.method === 'GET') {
    try {
      const fileId = path.split('/').pop();
      if (!fileId) {
        throw HttpErrors.badRequest('File ID required');
      }

      // Get file metadata from database
      const fileRow = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(fileId).first();
      if (!fileRow) {
        throw HttpErrors.notFound('File not found');
      }

      if (!env.FILES_BUCKET) {
        throw HttpErrors.serviceUnavailable('File storage not configured');
      }

      // Get file from R2
      const object = await env.FILES_BUCKET.get(fileRow.file_name as string);
      if (!object) {
        throw HttpErrors.notFound('File not found in storage');
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
      return handleError(error, corsHeaders);
    }
  }

  throw HttpErrors.notFound('Invalid file endpoint');
} 