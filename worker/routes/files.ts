import type { Env } from '../types';
import { HttpErrors, handleError, SECURITY_HEADERS } from '../errorHandler';
import { z } from 'zod';
import { SessionService } from '../services/SessionService.js';

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

async function storeFile(file: File, teamId: string, sessionId: string, env: Env): Promise<{ fileId: string; url: string }> {
  if (!env.FILES_BUCKET) {
    throw HttpErrors.internalServerError('File storage is not configured');
  }

  // Generate unique file ID
  const fileId = `${teamId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fileExtension = file.name.split('.').pop() || '';
  const storageKey = `uploads/${teamId}/${sessionId}/${fileId}.${fileExtension}`;

  console.log('Storing file:', {
    fileId,
    storageKey,
    teamId,
    sessionId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

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
      console.log('Enqueued file for background processing:', storageKey);
    } catch (queueError) {
      console.warn('Failed to enqueue file for background processing:', queueError);
      // Don't fail the upload if queue fails
    }
  }

  console.log('File stored in R2 successfully:', storageKey);

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
        JSON.stringify({ aiModel: 'llama', requiresPayment: false })
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

    console.log('File metadata stored in database successfully');
  } catch (error) {
    // Log the error but don't fail the upload
    console.warn('Failed to store file metadata in database:', error);
    // Continue with the upload since the file is already stored in R2
  }

  // Generate public URL (in production, this would be a CDN URL)
  const url = `/api/files/${fileId}`;

  console.log('File upload completed:', { fileId, url, storageKey });

  return { fileId, url };
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
        throw HttpErrors.badRequest('Invalid upload data', validationResult.error.errors);
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

      // Store file
      const { fileId, url } = await storeFile(file, resolvedTeamId, resolvedSessionId, env);

      console.log('File upload successful:', {
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        teamId: resolvedTeamId,
        sessionId: resolvedSessionId,
        url
      });

      const responseBody = {
        success: true,
        data: {
          fileId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url,
          message: 'File uploaded successfully'
        }
      };

      const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
      if (sessionResolution.cookie) {
        responseHeaders.append('Set-Cookie', sessionResolution.cookie);
      }

      // Add CORS headers for cross-origin requests with cookies
      const origin = request.headers.get('Origin');
      if (origin) {
        responseHeaders.set('Access-Control-Allow-Origin', origin);
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        responseHeaders.set('Vary', 'Origin');
      }

      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

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
          SELECT id, team_id, session_id, original_name, file_name, file_path, 
                 file_type, file_size, mime_type, created_at
          FROM files 
          WHERE id = ? AND (is_deleted IS NULL OR is_deleted = FALSE)
        `);
        fileRecord = await stmt.bind(fileId).first();
        console.log('Database file record:', fileRecord);
        
        if (fileRecord) {
          console.log('Found file in database:', {
            id: fileRecord.id,
            file_path: fileRecord.file_path,
            original_name: fileRecord.original_name,
            file_size: fileRecord.file_size
          });
        }
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
        console.log('No database metadata found, attempting to find file by pattern matching');
        
        // Try to find the file by searching R2 with the fileId as a prefix
        // This is more reliable than trying to parse the complex fileId format
        const searchPrefixes = [
          `uploads/${fileId}`,  // Direct search with fileId
          `uploads/*/${fileId}`, // Search in any team folder
          `uploads/*/*/${fileId}` // Search in any team/session folder
        ];
        
        for (const prefix of searchPrefixes) {
          try {
            console.log('Searching R2 with prefix:', prefix);
            const objects = await env.FILES_BUCKET.list({ prefix });
            console.log(`Found ${objects.objects.length} objects with prefix: ${prefix}`);
            
            if (objects.objects.length > 0) {
              // Find the exact match (should be only one)
              const exactMatch = objects.objects.find(obj => 
                obj.key.includes(fileId) && obj.key.endsWith(fileId.split('-').pop() || '')
              );
              
              if (exactMatch) {
                filePath = exactMatch.key;
                console.log('Found file path via pattern matching:', filePath);
                break;
              }
            }
          } catch (searchError) {
            console.warn(`Failed to search with prefix ${prefix}:`, searchError);
            continue;
          }
        }
        
        // If still no filePath found, try a broader search
        if (!filePath) {
          try {
            console.log('Attempting broader search for fileId:', fileId);
            const allObjects = await env.FILES_BUCKET.list({ prefix: 'uploads/' });
            const matchingObject = allObjects.objects.find(obj => 
              obj.key.includes(fileId)
            );
            
            if (matchingObject) {
              filePath = matchingObject.key;
              console.log('Found file path via broader search:', filePath);
            }
          } catch (broadSearchError) {
            console.warn('Failed broader search:', broadSearchError);
          }
        }
      }

      if (!filePath) {
        console.error('No file path found for fileId:', fileId);
        console.error('Database record:', fileRecord);
        throw HttpErrors.notFound('File not found - unable to locate file path');
      }

      console.log('Attempting to get file from R2:', filePath);
      const fileObject = await env.FILES_BUCKET.get(filePath);
      if (!fileObject) {
        console.error('File not found in R2 storage:', filePath);
        console.error('FileId:', fileId);
        console.error('Database record:', fileRecord);
        throw HttpErrors.notFound('File not found in storage');
      }

      console.log('File found in R2, returning response');

      // Extract file extension from storage path if we don't have database metadata
      let originalFileName = fileRecord?.original_name;
      let mimeType = fileRecord?.mime_type || fileObject.httpMetadata?.contentType || 'application/octet-stream';
      
      if (!originalFileName) {
        // Extract file extension from the storage key
        const pathParts = filePath.split('/');
        const fileNameWithExt = pathParts[pathParts.length - 1]; // Get the last part (filename.ext)
        const extension = fileNameWithExt.split('.').pop();
        
        if (extension) {
          // Try to determine the original filename from the fileId and extension
          // The fileId format is: teamId-sessionId-timestamp-random
          // We'll use the fileId as the base name and add the extension
          originalFileName = `${fileId}.${extension}`;
        } else {
          originalFileName = fileId;
        }
      }

      // Return file with appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', mimeType);
      headers.set('Content-Disposition', `inline; filename="${originalFileName}"`);
      if (fileRecord?.file_size) {
        headers.set('Content-Length', fileRecord.file_size.toString());
      }
      
      // Propagate cache control from stored object if present
      if (fileObject.httpMetadata?.cacheControl) {
        headers.set('Cache-Control', fileObject.httpMetadata.cacheControl);
      }
      
      // Add CORS headers for cross-origin requests with cookies
      const origin = request.headers.get('Origin');
      if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Vary', 'Origin');
      }
      
      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(fileObject.body, {
        status: 200,
        headers
      });

          } catch (error) {
        console.error('File download error:', error);
        return handleError(error);
      }
  }

  throw HttpErrors.notFound('Invalid file endpoint');
} 
