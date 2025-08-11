import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { z } from 'zod';

// File upload validation schema
const fileUploadValidationSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  teamId: z.string().min(1, 'Team ID is required'),
  sessionId: z.string().min(1, 'Session ID is required')
});

// File type validation
const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Disallowed file extensions for security
const DISALLOWED_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'msi', 'app'];

function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  // Check file extension for security FIRST (before file type)
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && DISALLOWED_EXTENSIONS.includes(extension)) {
    return { isValid: false, error: `File extension .${extension} is not allowed for security reasons` };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} is not supported` };
  }

  return { isValid: true };
}

async function storeFile(file: File, teamId: string, sessionId: string, env: Env): Promise<{ fileId: string; url: string }> {
  if (!env.FILES_BUCKET) {
    throw HttpErrors.internalServerError('File storage is not configured');
  }

  // Generate unique file ID
  const fileId = `${teamId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fileExtension = file.name.split('.').pop() || '';
  const storageKey = `uploads/${teamId}/${sessionId}/${fileId}.${fileExtension}`;

  // Store file in R2 bucket
  await env.FILES_BUCKET.put(storageKey, file, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000'
    },
    customMetadata: {
      originalName: file.name,
      teamId,
      sessionId,
      uploadedAt: new Date().toISOString()
    }
  });

  // Store file metadata in database
  const stmt = env.DB.prepare(`
    INSERT INTO files (
      id, team_id, session_id, original_name, file_name, file_path, 
      file_type, file_size, mime_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  await stmt.bind(
    fileId,
    teamId,
    sessionId,
    file.name,
    `${fileId}.${fileExtension}`,
    storageKey,
    fileExtension,
    file.size,
    file.type
  ).run();

  // Generate public URL (in production, this would be a CDN URL)
  const url = `/api/files/${fileId}`;

  return { fileId, url };
}

export async function handleFiles(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // File upload endpoint
  if (path === '/api/files/upload' && request.method === 'POST') {
    try {
      // Parse form data
      const formData = await request.formData();
      
      // Extract and validate required fields
      const file = formData.get('file') as File;
      const teamId = formData.get('teamId') as string;
      const sessionId = formData.get('sessionId') as string;

      // Validate input
      const validationResult = fileUploadValidationSchema.safeParse({ file, teamId, sessionId });
      if (!validationResult.success) {
        throw HttpErrors.badRequest('Invalid upload data', validationResult.error.errors);
      }

      // Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        throw HttpErrors.badRequest(fileValidation.error!);
      }

      // Store file
      const { fileId, url } = await storeFile(file, teamId, sessionId, env);

      console.log('File upload successful:', {
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        teamId,
        sessionId,
        url
      });

      return createSuccessResponse({
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url,
        message: 'File uploaded successfully'
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
        throw HttpErrors.badRequest('File ID is required');
      }

      // Get file metadata from database
      const stmt = env.DB.prepare(`
        SELECT * FROM files WHERE id = ? AND is_deleted = FALSE
      `);
      const fileRecord = await stmt.bind(fileId).first();

      if (!fileRecord) {
        throw HttpErrors.notFound('File not found');
      }

      // Get file from R2 bucket
      if (!env.FILES_BUCKET) {
        throw HttpErrors.internalServerError('File storage is not configured');
      }

      const fileObject = await env.FILES_BUCKET.get(fileRecord.file_path);
      if (!fileObject) {
        throw HttpErrors.notFound('File not found in storage');
      }

      // Return file with appropriate headers
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', fileRecord.mime_type || 'application/octet-stream');
      headers.set('Content-Disposition', `inline; filename="${fileRecord.original_name}"`);
      headers.set('Content-Length', fileRecord.file_size.toString());

      return new Response(fileObject.body, {
        status: 200,
        headers
      });

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  throw HttpErrors.notFound('Invalid file endpoint');
} 