import type { Env } from '../types';
import { HttpErrors, handleError } from '../errorHandler';
import { z } from 'zod';
import { SessionService } from '../services/SessionService.js';
import { ActivityService } from '../services/ActivityService';
import { StatusService, type StatusUpdate } from '../services/StatusService.js';
import { Logger } from '../utils/logger';
import type { MessageBatch } from '@cloudflare/workers-types';

/**
 * Updates status with retry logic and exponential backoff
 * @param env - Environment object
 * @param statusUpdate - Status update data
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Promise that resolves when status is updated or rejects after all retries fail
 */
async function updateStatusWithRetry(
  env: Env,
  statusUpdate: Omit<StatusUpdate, 'createdAt' | 'updatedAt' | 'expiresAt'>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  createdAt?: number
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await StatusService.setStatus(env, statusUpdate, createdAt);
      Logger.info('Status update successful', {
        statusId: statusUpdate.id,
        attempt: attempt + 1,
        status: statusUpdate.status
      });
      return; // Success, exit early
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        // Final attempt failed, log to monitoring and throw
        Logger.error('Status update failed after all retries', {
          statusId: statusUpdate.id,
          status: statusUpdate.status,
          totalAttempts: maxRetries + 1,
          finalError: lastError.message,
          errorStack: lastError.stack
        });
        
        // Emit alert for critical status update failures
        Logger.error('ALERT: Critical status update failure', {
          statusId: statusUpdate.id,
          sessionId: statusUpdate.sessionId,
          teamId: statusUpdate.teamId,
          status: statusUpdate.status,
          message: statusUpdate.message,
          error: lastError.message
        });
        
        throw lastError;
      }
      
      // Calculate exponential backoff delay
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      Logger.warn('Status update attempt failed, retrying', {
        statusId: statusUpdate.id,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        nextRetryInMs: delayMs,
        error: lastError.message
      });
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// Types for document processing
interface DocumentEvent {
  key: string;
  teamId: string;
  sessionId: string;
  mime: string;
  size: number;
}

interface AutoAnalysisEvent {
  type: "analyze_uploaded_document";
  sessionId: string;
  teamId: string;
  statusId?: string;
  file: {
    key: string;
    name: string;
    mime: string;
    size: number;
  };
}

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
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/svg',
  'image/bmp',
  'image/tiff',
  'image/tif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/avi',
  'video/mov',
  'video/m4v',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/webm'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (increased for larger SVG files and other media)

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

async function storeFile(file: File, teamId: string, sessionId: string, env: Env): Promise<{ fileId: string; url: string; storageKey: string }> {
  if (!env.FILES_BUCKET) {
    throw HttpErrors.internalServerError('File storage is not configured');
  }

  // Generate unique file ID
  const fileId = `${teamId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fileExtension = file.name.split('.').pop() || '';
  const storageKey = `uploads/${teamId}/${sessionId}/${fileId}.${fileExtension}`;

  Logger.info('Storing file:', {
    fileId,
    storageKey,
    teamId,
    sessionId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  // Store file in R2 bucket. Use ArrayBuffer for broad compatibility with types
  const body: ArrayBuffer = await file.arrayBuffer();
  await env.FILES_BUCKET.put(storageKey, body, {
    httpMetadata: {
      // …existing metadata…
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

  // Enqueue for background processing if it's an analyzable file type
  const analyzableTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (analyzableTypes.includes(file.type)) {
    try {
      await env.DOC_EVENTS.send({
        key: storageKey,
        teamId,
        sessionId,
        mime: file.type,
        size: file.size
      });
      Logger.info('Enqueued file for background processing:', storageKey);
    } catch (queueError) {
      Logger.warn('Failed to enqueue file for background processing:', queueError);
      // Don't fail the upload if queue fails
    }
  }

  Logger.info('File stored in R2 successfully:', storageKey);

  // Try to store file metadata in database, but don't fail if it doesn't work
  try {
    // First check if the team exists, if not, create a minimal entry
    const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE id = ? OR slug = ?');
    const existingTeam = await teamCheckStmt.bind(teamId, teamId).first();
    
    if (!existingTeam) {
      console.log('Team not found in database, creating minimal entry:', teamId);
      // Create a minimal team entry if it doesn't exist
      const createTeamStmt = env.DB.prepare(`
        INSERT OR IGNORE INTO teams (id, slug, name, config, created_at, updated_at) 
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      await createTeamStmt.bind(
        teamId,
        teamId,
        `Team ${teamId}`,
        JSON.stringify({ aiModel: '@cf/openai/gpt-oss-20b', requiresPayment: false })
      ).run();
      console.log('Team created in database:', teamId);
    }

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

    Logger.info('File metadata stored in database successfully');
  } catch (error) {
    // Log the error but don't fail the upload
    Logger.warn('Failed to store file metadata in database:', error);
    // Continue with the upload since the file is already stored in R2
  }

  // Generate public URL (in production, this would be a CDN URL)
  const url = `/api/files/${fileId}`;

  // Create activity event for file upload (non-blocking)
  const createActivityEvent = async () => {
    try {
      const activityService = new ActivityService(env);
      const eventType = 'file_uploaded';
      const eventTitle = 'File Uploaded';
      
      await activityService.createEvent({
        type: 'session_event',
        eventType,
        title: eventTitle,
        description: `${eventTitle}: ${file.name}`,
        eventDate: new Date().toISOString(),
        actorType: 'user',
        actorId: undefined, // Don't populate created_by_lawyer_id with sessionId
        metadata: {
          sessionId,
          teamId,
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storageKey
        }
      }, teamId);
      
      Logger.info('Activity event created for file upload:', { fileId, fileName: file.name });
    } catch (error) {
      Logger.warn('Failed to create activity event for file upload:', error);
      // Errors are swallowed - don't fail the upload
    }
  };

  // Fire-and-forget activity event creation with bounded timeout
  const timeoutId = setTimeout(() => {
    Logger.warn('File activity event creation timed out');
  }, 5000);
  
  createActivityEvent()
    .finally(() => clearTimeout(timeoutId))
    .catch(error => {
      Logger.warn('File activity event creation failed:', error);
    });

  Logger.info('File upload completed:', { fileId, url, storageKey });

  return { fileId, url, storageKey };
}

export async function handleFiles(request: Request, env: Env): Promise<Response> {
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
        throw HttpErrors.badRequest('Invalid upload data', validationResult.error.issues);
      }

      // Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        throw HttpErrors.badRequest(fileValidation.error!);
      }

      const normalizedTeamId = teamId.trim();
      const normalizedSessionId = sessionId.trim();

      // Validate that trimmed IDs are not empty
      if (!normalizedTeamId) {
        throw HttpErrors.badRequest('teamId cannot be empty after trimming');
      }
      if (!normalizedSessionId) {
        throw HttpErrors.badRequest('sessionId cannot be empty after trimming');
      }

      const sessionResolution = await SessionService.resolveSession(env, {
        request,
        sessionId: normalizedSessionId,
        teamId: normalizedTeamId,
        createIfMissing: true
      });

      const resolvedTeamId = sessionResolution.session.teamId;
      const resolvedSessionId = sessionResolution.session.id;

      // Create initial status update for file processing
      let statusId: string | null = null;
      let statusCreatedAt: number | null = null;
      try {
        statusId = await StatusService.createFileProcessingStatus(
          env,
          resolvedSessionId,
          resolvedTeamId,
          file.name,
          'processing',
          10
        );
        // Get the createdAt timestamp for this statusId to preserve it across updates
        if (statusId) {
          statusCreatedAt = await StatusService.getStatusCreatedAt(env, statusId);
        }
      } catch (statusError) {
        Logger.warn('Failed to create initial file processing status:', statusError);
        // Continue without status tracking if status creation fails
      }

      // Store file with error handling
      let fileId: string, url: string, storageKey: string;
      try {
        const result = await storeFile(file, resolvedTeamId, resolvedSessionId, env);
        fileId = result.fileId;
        url = result.url;
        storageKey = result.storageKey;
      } catch (storeError) {
        // Update status to failed if we have a statusId
        if (statusId) {
          try {
            await updateStatusWithRetry(env, {
              id: statusId,
              sessionId: resolvedSessionId,
              teamId: resolvedTeamId,
              type: 'file_processing',
              status: 'failed',
              message: `File ${file.name} upload failed: ${storeError.message}`,
              progress: 0,
              data: { fileName: file.name, error: storeError.message }
            }, 3, 1000, statusCreatedAt ?? undefined);
          } catch (_statusUpdateError) {
            // Error is already logged by updateStatusWithRetry, just continue
            Logger.warn('Continuing despite status update failure for upload failure');
          }
        }
        throw storeError; // Re-throw the original error
      }

      // Update status to indicate file stored
      if (statusId) {
        try {
          await updateStatusWithRetry(env, {
            id: statusId,
            sessionId: resolvedSessionId,
            teamId: resolvedTeamId,
            type: 'file_processing',
            status: 'processing',
            message: `File ${file.name} uploaded successfully, starting analysis...`,
            progress: 50,
            data: { fileName: file.name, fileId, url }
          }, 3, 1000, statusCreatedAt ?? undefined);
        } catch (_statusUpdateError) {
          // Error is already logged by updateStatusWithRetry, just continue
          Logger.warn('Continuing despite status update failure after file storage');
        }
      }

      Logger.info('File upload successful:', {
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        teamId: resolvedTeamId,
        sessionId: resolvedSessionId,
        url,
        statusId
      });

      // Auto-analysis enqueue is handled inside storeFile to avoid double-processing

      // Inline processing for local development only (bypass queue)
      // Only run inline processing in development to avoid duplicate processing in production
      if (env.NODE_ENV === 'development') {
        try {
        const { default: docProcessor } = await import('../consumers/doc-processor.js');
        const mockBatch: MessageBatch<DocumentEvent | AutoAnalysisEvent> = {
          messages: [{
            id: 'inline-process',
            body: {
              type: "analyze_uploaded_document",
              sessionId: resolvedSessionId,
              teamId: resolvedTeamId,
              statusId: statusId,
              file: {
                key: storageKey,
                name: file.name,
                mime: file.type,
                size: file.size
              }
            } as AutoAnalysisEvent,
            timestamp: new Date(),
            attempts: 0,
            retry: () => {},
            ack: () => {}
          }],
          queue: '',
          retryAll: () => {},
          ackAll: () => {}
        };
        
        // Process inline (don't await to avoid blocking the response)
        docProcessor.queue(mockBatch, env).then(async () => {
          // Update status to completed
          if (statusId) {
            try {
              await updateStatusWithRetry(env, {
                id: statusId,
                sessionId: resolvedSessionId,
                teamId: resolvedTeamId,
                type: 'file_processing',
                status: 'completed',
                message: `Analysis of ${file.name} completed successfully`,
                progress: 100,
                data: { fileName: file.name, fileId, url, analysisComplete: true }
              }, 3, 1000, statusCreatedAt ?? undefined);
            } catch (_error) {
              // Error is already logged by updateStatusWithRetry, just continue
              Logger.warn('Continuing despite status update failure for completed analysis');
            }
          }
        }).catch(async (error) => {
          console.error('Inline processing failed:', error);
          // Update status to failed
          if (statusId) {
            try {
              await updateStatusWithRetry(env, {
                id: statusId,
                sessionId: resolvedSessionId,
                teamId: resolvedTeamId,
                type: 'file_processing',
                status: 'failed',
                message: `Analysis of ${file.name} failed: ${error.message}`,
                progress: 0,
                data: { fileName: file.name, fileId, url, error: error.message }
              }, 3, 1000, statusCreatedAt ?? undefined);
            } catch (_statusError) {
              // Error is already logged by updateStatusWithRetry, just continue
              Logger.warn('Continuing despite status update failure for failed analysis');
            }
          }
        });
        
          Logger.info('🚀 Started inline auto-analysis processing');
        } catch (inlineError) {
          Logger.warn('Failed to start inline processing:', inlineError);
        }
      } else {
        Logger.info('Skipping inline processing - using queue-based processing only');
      }

      const responseBody = {
        success: true,
        data: {
          fileId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url,
          statusId,
          message: 'File uploaded successfully'
        }
      };

      const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
      if (sessionResolution.cookie) {
        responseHeaders.append('Set-Cookie', sessionResolution.cookie);
      }



      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: responseHeaders
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // File download endpoint
  if (path.startsWith('/api/files/') && request.method === 'GET') {
    try {
      const fileId = path.split('/').pop();
      if (!fileId) {
        throw HttpErrors.badRequest('File ID is required');
      }

      console.log('File download request:', { fileId, path });

      // Try to get file metadata from database first
      let fileRecord = null;
      try {
        const stmt = env.DB.prepare(`
          SELECT * FROM files WHERE id = ? AND is_deleted = FALSE
        `);
        fileRecord = await stmt.bind(fileId).first();
        console.log('Database file record:', fileRecord);
      } catch (dbError) {
        console.warn('Failed to get file metadata from database:', dbError);
        // Continue without database metadata
      }

      // Get file from R2 bucket
      if (!env.FILES_BUCKET) {
        throw HttpErrors.internalServerError('File storage is not configured');
      }

      // Try to construct the file path from the fileId if we don't have database metadata
      let filePath = fileRecord?.file_path;
      if (!filePath) {
        // Extract teamId and sessionId from fileId format: teamId-sessionId-timestamp-random
        // The teamId can contain hyphens, so we need to be more careful about parsing
        const lastHyphenIndex = fileId.lastIndexOf('-');
        const secondLastHyphenIndex = fileId.lastIndexOf('-', lastHyphenIndex - 1);
        
        if (lastHyphenIndex !== -1 && secondLastHyphenIndex !== -1) {
          // The format is: teamId-sessionId-timestamp-random
          // We need to find where the sessionId ends and timestamp begins
          const parts = fileId.split('-');
          if (parts.length >= 4) {
            // The last two parts are timestamp and random string
            const timestamp = parts[parts.length - 2];
            const randomString = parts[parts.length - 1];
            
            // Everything before the timestamp is teamId-sessionId
            const teamIdAndSessionId = parts.slice(0, -2).join('-');
            
            // Find the sessionId (it's a UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
            const sessionIdMatch = teamIdAndSessionId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            
            if (sessionIdMatch) {
              const sessionId = sessionIdMatch[0];
              const teamId = teamIdAndSessionId.substring(0, teamIdAndSessionId.length - sessionId.length - 1); // -1 for the hyphen
              
              console.log('Parsed fileId:', { teamId, sessionId, timestamp, randomString });
              
              // Try to find the file in R2 with a pattern match
              const prefix = `uploads/${teamId}/${sessionId}/${fileId}`;
              console.log('Looking for file with prefix:', prefix);
              // List objects with this prefix
              const objects = await env.FILES_BUCKET.list({ prefix });
              console.log('R2 objects found:', objects.objects.length);
              if (objects.objects.length > 0) {
                filePath = objects.objects[0].key;
                console.log('Found file path:', filePath);
              }
            }
          }
        }
      }

      if (!filePath) {
        console.log('No file path found for fileId:', fileId);
        throw HttpErrors.notFound('File not found');
      }

      console.log('Attempting to get file from R2:', filePath);
      const fileObject = await env.FILES_BUCKET.get(filePath);
      if (!fileObject) {
        console.log('File not found in R2 storage:', filePath);
        throw HttpErrors.notFound('File not found in storage');
      }

      console.log('File found in R2, returning response');

      // Guard against nullable fileObject.body
      if (!fileObject.body) {
        console.error('File object body is null or undefined');
        throw HttpErrors.internalServerError('File content unavailable');
      }

      // Return file with appropriate headers
      const headers = new Headers();
      const contentType = fileRecord?.mime_type || fileObject.httpMetadata?.contentType || 'application/octet-stream';
      headers.set('Content-Type', contentType);
      
      // Handle Content-Disposition based on mime type
      const filename = fileRecord?.original_name || fileId;
      const sanitizedFilename = filename.replace(/["\r\n]/g, ''); // Strip quotes and newlines
      
      if (contentType === 'image/svg+xml') {
        // Force attachment for SVG files to prevent XSS
        headers.set('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      } else {
        headers.set('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      }
      
      if (fileRecord?.file_size) {
        headers.set('Content-Length', fileRecord.file_size.toString());
      }
      
      // Propagate cache control from stored object if present
      if (fileObject.httpMetadata?.cacheControl) {
        headers.set('Cache-Control', fileObject.httpMetadata.cacheControl);
      }

      // Use non-null assertion after explicit null check
      return new Response(fileObject.body as BodyInit, {
        status: 200,
        headers
      });

          } catch (error) {
        Logger.error('File download error:', error);
        return handleError(error);
      }
  }

  throw HttpErrors.notFound('Invalid file endpoint');
} 
