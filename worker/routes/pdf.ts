import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody } from '../utils';
import { PDFGenerationService } from '../services/PDFGenerationService';
import { ConversationContextManager } from '../middleware/conversationContextManager';

interface PDFDownloadRequest {
  filename: string;
  matterType: string;
  generatedAt: string;
  sessionId?: string;
  teamId?: string;
}

export async function handlePDF(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/pdf/download - Download generated PDF
  if (path === '/api/pdf/download' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as PDFDownloadRequest;

      // Validate required fields
      if (!body.filename || !body.matterType || !body.generatedAt) {
        throw HttpErrors.badRequest('Missing required PDF information');
      }

      // Get session and team context if provided
      let context = null;
      if (body.sessionId && body.teamId) {
        context = await ConversationContextManager.load(body.sessionId, body.teamId, env);
      }

      // If we have context and case draft, generate fresh PDF
      if (context?.caseDraft) {
        const pdfResult = await PDFGenerationService.generateCaseSummaryPDF({
          caseDraft: {
            ...context.caseDraft,
            jurisdiction: context.caseDraft.jurisdiction || 'Unknown',
            urgency: context.caseDraft.urgency || 'normal'
          },
          clientName: context.contactInfo?.name,
          teamName: context.teamConfig?.description || 'Legal Services',
          teamBrandColor: context.teamConfig?.brandColor || '#2563eb'
        }, env);

        if (pdfResult.success && pdfResult.pdfBuffer) {
          return new Response(pdfResult.pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${body.filename}"`,
              'Content-Length': pdfResult.pdfBuffer.byteLength.toString(),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        } else {
          throw HttpErrors.internalServerError(pdfResult.error || 'Failed to generate PDF');
        }
      } else {
        // No context available - return error
        throw HttpErrors.notFound('PDF not found. Please regenerate your case summary.');
      }

    } catch (error) {
      return handleError(error);
    }
  }

  // POST /api/pdf/generate - Generate new PDF
  if (path === '/api/pdf/generate' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as {
        sessionId: string;
        teamId: string;
        matterType?: string;
      };

      if (!body.sessionId || !body.teamId) {
        throw HttpErrors.badRequest('Missing session ID or team ID');
      }

      // Load conversation context
      const context = await ConversationContextManager.load(body.sessionId, body.teamId, env);
      
      if (!context?.caseDraft) {
        throw HttpErrors.badRequest('No case draft found. Please create a case draft first.');
      }

      // Generate PDF
      const pdfResult = await PDFGenerationService.generateCaseSummaryPDF({
        caseDraft: {
          ...context.caseDraft,
          jurisdiction: context.caseDraft.jurisdiction || 'Unknown',
          urgency: context.caseDraft.urgency || 'normal'
        },
        clientName: context.contactInfo?.name,
        teamName: context.teamConfig?.description || 'Legal Services',
        teamBrandColor: context.teamConfig?.brandColor || '#2563eb'
      }, env);

      if (pdfResult.success && pdfResult.pdfBuffer) {
        const filename = PDFGenerationService.generateFilename({
          ...context.caseDraft,
          jurisdiction: context.caseDraft.jurisdiction || 'Unknown',
          urgency: context.caseDraft.urgency || 'normal'
        }, context.contactInfo?.name);
        
        // Update context with new PDF information
        const updatedContext = {
          ...context,
          generatedPDF: {
            filename,
            size: pdfResult.pdfBuffer.byteLength,
            generatedAt: new Date().toISOString(),
            matterType: context.caseDraft.matter_type
          }
        };

        // Save updated context
        await ConversationContextManager.save(updatedContext, env);

        return createSuccessResponse({
          success: true,
          pdf: {
            filename,
            size: pdfResult.pdfBuffer.byteLength,
            generatedAt: new Date().toISOString(),
            matterType: context.caseDraft.matter_type
          }
        });
      } else {
        throw HttpErrors.internalServerError(pdfResult.error || 'Failed to generate PDF');
      }

    } catch (error) {
      return handleError(error);
    }
  }

  throw HttpErrors.notFound('PDF endpoint not found');
}
