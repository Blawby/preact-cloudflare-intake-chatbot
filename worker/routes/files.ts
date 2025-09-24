import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse, SECURITY_HEADERS } from '../errorHandler';
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
    // First check if the team exists by slug or id, get the actual team ID
    const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE id = ? OR slug = ?');
    const existingTeam = await teamCheckStmt.bind(teamId, teamId).first();
    
    let actualTeamId = teamId;
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
    } else {
      actualTeamId = existingTeam.id; // Use the actual team ID from database
      console.log('Found existing team:', { teamId, actualTeamId });
    }

    // Check if the conversation exists, if not, create a minimal entry
    const conversationCheckStmt = env.DB.prepare('SELECT id FROM conversations WHERE session_id = ?');
    const existingConversation = await conversationCheckStmt.bind(sessionId).first();
    
    if (!existingConversation) {
      console.log('Conversation not found in database, creating minimal entry for session:', sessionId);
      // Create a minimal conversation entry if it doesn't exist
      const conversationId = crypto.randomUUID();
      const createConversationStmt = env.DB.prepare(`
        INSERT OR IGNORE INTO conversations (id, team_id, session_id, created_at, updated_at) 
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `);
      await createConversationStmt.bind(conversationId, actualTeamId, sessionId).run();
      console.log('Conversation created in database:', conversationId);
    }

    const stmt = env.DB.prepare(`
      INSERT INTO files (
        id, team_id, session_id, original_name, file_name, file_path, 
        file_type, file_size, mime_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    await stmt.bind(
      fileId,
      actualTeamId, // Use the actual team ID from database
      sessionId,
      file.name,
      `${fileId}.${fileExtension}`,
      storageKey, // This is the complete R2 path: uploads/teamId/sessionId/fileId.ext
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
             });

              } catch (error) {
      return handleError(error);
    }
  }

  // File list endpoint for a session (must come before file download to avoid conflict)
  if (path.startsWith('/api/files/list/') && request.method === 'GET') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      console.log('File list request for session:', sessionId);

      // Get files from database for this session
      const stmt = env.DB.prepare(`
        SELECT id, original_name, file_name, file_type, file_size, mime_type, created_at
        FROM files 
        WHERE session_id = ? AND is_deleted = FALSE
        ORDER BY created_at DESC
      `);
      const files = await stmt.bind(sessionId).all();

      console.log('Found files for session:', files.results?.length || 0);

      return new Response(JSON.stringify({
        success: true,
        data: {
          files: files.results || [],
          count: files.results?.length || 0
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS
        }
      });

    } catch (error) {
      console.error('File list error:', error);
      return handleError(error);
    }
  }

  // File delete endpoint
  if (path.startsWith('/api/files/') && 
      !path.startsWith('/api/files/upload') && 
      !path.startsWith('/api/files/list/') && 
      request.method === 'DELETE') {
    try {
      const fileId = path.split('/').pop();
      if (!fileId) {
        throw HttpErrors.badRequest('File ID is required');
      }

      console.log('File deletion request for:', fileId);

      // Get file metadata from database first
      const fileStmt = env.DB.prepare(`
        SELECT id, file_path, original_name, session_id, team_id, is_deleted
        FROM files 
        WHERE id = ? AND is_deleted = FALSE
      `);
      const fileRecord = await fileStmt.bind(fileId).first();

      if (!fileRecord) {
        throw HttpErrors.notFound('File not found or already deleted');
      }

      console.log('Found file to delete:', {
        id: fileRecord.id,
        name: fileRecord.original_name,
        path: fileRecord.file_path,
        sessionId: fileRecord.session_id
      });

      // Soft delete in database first
      const deleteStmt = env.DB.prepare(`
        UPDATE files 
        SET is_deleted = TRUE, updated_at = datetime('now')
        WHERE id = ?
      `);
      await deleteStmt.bind(fileId).run();

      console.log('File marked as deleted in database:', fileId);

      // Delete from R2 storage
      try {
        if (fileRecord.file_path) {
          await env.R2_BUCKET.delete(fileRecord.file_path);
          console.log('File deleted from R2 storage:', fileRecord.file_path);
        }
      } catch (r2Error) {
        console.warn('Failed to delete file from R2 storage:', r2Error);
        // Don't fail the request if R2 deletion fails - file is already soft-deleted in DB
      }

      return createSuccessResponse({
        fileId: fileId,
        fileName: fileRecord.original_name,
        deleted: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('File deletion error:', error);
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

      // Get file from R2 bucket
      if (!env.FILES_BUCKET) {
        throw HttpErrors.internalServerError('File storage is not configured');
      }

      // Try to get file metadata from database first
      let fileRecord = null;
      let filePath = null;
      
      try {
        const stmt = env.DB.prepare(`
          SELECT * FROM files WHERE id = ? AND is_deleted = FALSE
        `);
        fileRecord = await stmt.bind(fileId).first();
        console.log('Database file record:', fileRecord);
        
        if (fileRecord?.file_path) {
          filePath = fileRecord.file_path;
          console.log('Using database file path:', filePath);
        }
      } catch (dbError) {
        console.warn('Failed to get file metadata from database:', dbError);
        // Continue without database metadata
      }

      // If we don't have the file path from database, try to find it in R2
      if (!filePath) {
        console.log('No database file path, searching R2 for fileId:', fileId);
        
        // Search for files with this fileId across all uploads
        const searchPrefix = 'uploads/';
        const allObjects = await env.FILES_BUCKET.list({ prefix: searchPrefix });
        
        // Find the object that contains our fileId
        const matchingObject = allObjects.objects.find(obj => 
          obj.key.includes(fileId) && obj.key.endsWith(fileId) || 
          obj.key.includes(`/${fileId}.`)
        );
        
        if (matchingObject) {
          filePath = matchingObject.key;
          console.log('Found file in R2:', filePath);
        } else {
          console.log('File not found in R2 search for fileId:', fileId);
          console.log('Available objects:', allObjects.objects.map(obj => obj.key));
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

      // Return file with appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', fileRecord?.mime_type || fileObject.httpMetadata?.contentType || 'application/octet-stream');
      
      // Get filename with extension from database, or extract from R2 path
      let filename = fileRecord?.original_name;
      if (!filename && filePath) {
        // Extract filename from R2 path: uploads/teamId/sessionId/fileId.ext
        const pathParts = filePath.split('/');
        filename = pathParts[pathParts.length - 1]; // Gets "fileId.ext"
      }
      if (!filename) {
        filename = fileId; // Fallback to just fileId
      }
      
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
      if (fileRecord?.file_size) {
        headers.set('Content-Length', fileRecord.file_size.toString());
      }
      
      // Propagate cache control from stored object if present
      if (fileObject.httpMetadata?.cacheControl) {
        headers.set('Cache-Control', fileObject.httpMetadata.cacheControl);
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