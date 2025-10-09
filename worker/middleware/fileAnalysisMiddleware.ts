import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import type { Env, AgentMessage } from '../types.js';
import { analyzeFile, getAnalysisQuestion } from '../utils/fileAnalysisUtils.js';
import { Logger } from '../utils/logger.js';

/**
 * Timeout helper to prevent operations from hanging indefinitely
 */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]);
};

type AttachmentData = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type AnalysisResult = {
  fileId: string;
  fileName: string;
  fileType: string;
  analysisType: string;
  confidence: number;
  summary?: string;
  entities?: {
    people?: string[];
    orgs?: string[];
    dates?: string[];
  };
  key_facts?: string[];
  action_items?: string[];
};

/**
 * File Analysis Middleware - handles automatic file analysis for uploaded documents
 * Detects file attachments and automatically analyzes them to extract legal information
 * Updates conversation context with analysis results for downstream middleware
 */
export const fileAnalysisMiddleware: PipelineMiddleware = {
  name: 'fileAnalysisMiddleware',
  
  execute: async (messages: AgentMessage[], context: ConversationContext, teamConfig: TeamConfig, env: Env) => {
    try {
      // Check if we have file attachments in the current request
      if (!context.currentAttachments || context.currentAttachments.length === 0) {
        return { context };
      }

      // Only process attachments if the latest message indicates file analysis is needed
      // This prevents processing stale attachments when user just says "hello"
      const latestMessage = messages[messages.length - 1];
      if (!latestMessage || latestMessage.role !== 'user') {
        Logger.info('Skipping file analysis - no user message in current request', {
          sessionId: context.sessionId,
          teamId: context.teamId
        });
        return { context };
      }

      // Process attachments when they exist in context.currentAttachments
      // This ensures users see analysis results for newly uploaded files
      Logger.info('Processing current attachments for file analysis', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        attachmentCount: context.currentAttachments.length
      });

      const attachments = context.currentAttachments;
      const analysisResults = [];

      // Process each attachment
      for (const attachment of attachments) {
      try {
        // Extract file ID from attachment URL
        const fileId = extractFileIdFromUrl(attachment.url);
        if (!fileId) {
          Logger.warn('Could not extract file ID from attachment URL', { url: attachment.url });
          continue;
        }

        // Determine analysis type based on file
        const analysisType = determineAnalysisType(attachment);
        
        Logger.info('Processing file attachment', {
          sessionId: context.sessionId,
          teamId: context.teamId,
          fileId,
          fileName: attachment.name,
          analysisType
        });

        // Get appropriate analysis question
        const analysisQuestion = getAnalysisQuestion(analysisType);
        
        // Perform file analysis with timeout protection (30 seconds)
        const analysis = await withTimeout(
          analyzeFile(env, fileId, analysisQuestion),
          30000
        );
        
        if (analysis && analysis.confidence > 0) {
          analysisResults.push({
            fileId,
            fileName: attachment.name,
            fileType: attachment.type,
            analysisType,
            ...analysis
          });

          Logger.info('File analysis completed successfully', {
            sessionId: context.sessionId,
            teamId: context.teamId,
            fileId,
            fileName: attachment.name,
            confidence: analysis.confidence,
            summaryLength: analysis.summary?.length || 0
          });
        } else {
          Logger.warn('File analysis failed or returned low confidence', {
            sessionId: context.sessionId,
            teamId: context.teamId,
            fileId,
            fileName: attachment.name,
            confidence: analysis?.confidence || 0
          });
        }
      } catch (error) {
        Logger.error('File analysis error in middleware', {
          sessionId: context.sessionId,
          teamId: context.teamId,
          fileName: attachment.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // If we have analysis results, update context and provide response
    if (analysisResults.length > 0) {
      Logger.info('File analysis completed successfully, providing response', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        analysisCount: analysisResults.length
      });

      // Update context with file analysis results and clear currentAttachments
      const updatedContext = {
        ...context,
        currentAttachments: undefined, // Clear attachments after processing
        fileAnalysis: {
          results: analysisResults,
          processedAt: new Date().toISOString(),
          totalFiles: analysisResults.length
        }
      };

      // Generate response based on analysis results
      const response = generateAnalysisResponse(analysisResults);

      Logger.info('Returning file analysis response from middleware', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        responseLength: response.length
      });

      return {
        context: updatedContext,
        response,
        shouldStop: true // Stop pipeline and return analysis response
      };
    } else {
      Logger.info('No successful analysis results, continuing pipeline', {
        sessionId: context.sessionId,
        teamId: context.teamId
      });
    }

      // No successful analysis results - clear attachments and continue pipeline
      const updatedContext = {
        ...context,
        currentAttachments: undefined // Clear attachments even if no analysis results
      };
      return { context: updatedContext };
    } catch (error) {
      Logger.error('File analysis middleware error', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Clear attachments and continue pipeline on error
      const updatedContext = {
        ...context,
        currentAttachments: undefined
      };
      return { context: updatedContext };
    }
  }
};

/**
 * Extract file ID from attachment URL
 */
function extractFileIdFromUrl(url: string): string | null {
  // Handle URLs like "/api/files/team-session-timestamp-random"
  const urlParts = url.split('/api/files/');
  return urlParts.length > 1 ? urlParts[1] : null;
}

/**
 * Determine analysis type based on file attachment
 */
function determineAnalysisType(attachment: AttachmentData): string {
  const fileName = attachment.name?.toLowerCase() || '';
  const fileType = attachment.type?.toLowerCase() || '';
  
  // Check file extension
  if (fileName.includes('contract') || fileName.includes('agreement')) {
    return 'contract';
  } else if (fileName.includes('medical') || fileName.includes('bill') || fileName.includes('diagnosis')) {
    return 'medical_document';
  } else if (fileName.includes('form') || fileName.includes('application')) {
    return 'government_form';
  } else if (fileName.includes('resume') || fileName.includes('cv')) {
    return 'resume';
  }
  
  // Check MIME type
  if (fileType.startsWith('image/')) {
    return 'image';
  } else if (fileType === 'application/pdf') {
    return 'legal_document';
  } else if (fileType.startsWith('text/')) {
    return 'legal_document';
  }
  
  // Default to general analysis
  return 'general';
}

/**
 * Generate response based on analysis results
 */
function generateAnalysisResponse(analysisResults: AnalysisResult[]): string {
  let response = "I've analyzed your uploaded document(s) and here's what I found:\n\n";

  for (const result of analysisResults) {
    response += `**${result.fileName}**\n`;
    
    if (result.summary) {
      response += `**Document Analysis:** ${result.summary}\n\n`;
    }

    if (result.entities?.people?.length > 0) {
      response += `**Parties Involved:** ${result.entities.people.join(', ')}\n`;
    }

    if (result.entities?.orgs?.length > 0) {
      response += `**Organizations:** ${result.entities.orgs.join(', ')}\n`;
    }

    if (result.entities?.dates?.length > 0) {
      response += `**Important Dates:** ${result.entities.dates.join(', ')}\n`;
    }

    if (result.key_facts?.length > 0) {
      response += `**Key Facts:**\n`;
      result.key_facts.slice(0, 3).forEach((fact: string) => {
        response += `• ${fact}\n`;
      });
    }

    if (result.action_items?.length > 0) {
      response += `**Recommended Actions:**\n`;
      result.action_items.slice(0, 3).forEach((action: string) => {
        response += `• ${action}\n`;
      });
    }

    // Confidence level removed from user display
  }

  response += "Based on this analysis, I can help you:\n";
  response += "• Create a legal matter for attorney review\n";
  response += "• Identify potential legal issues or concerns\n";
  response += "• Determine appropriate legal services needed\n";
  response += "• Prepare for consultation with an attorney\n\n";
  response += "Would you like me to help you with any of these next steps?";

  return response;
}
