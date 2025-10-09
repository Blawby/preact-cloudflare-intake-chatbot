import type { Env } from '../types.js';
import { StatusService } from './StatusService.js';
import { Logger } from '../utils/logger.js';

type AttachmentData = {
  fileId: string;
  fileName: string;
  fileType: string;
  analysisType: string;
  analysisQuestion: string;
};

/**
 * Async Adobe Analysis Service
 * Handles Adobe PDF analysis in the background with real-time status updates
 * Uses existing StatusService for SSE progress updates
 */
export class AsyncAdobeAnalysis {
  /**
   * Start Adobe analysis asynchronously for multiple attachments
   * This runs fire-and-forget and provides real-time status updates
   */
  static async startAnalysis(
    env: Env,
    sessionId: string,
    teamId: string,
    attachments: AttachmentData[]
  ): Promise<void> {
    // Fire-and-forget - don't await this
    AsyncAdobeAnalysis.processAttachments(env, sessionId, teamId, attachments)
      .catch(error => {
        Logger.error('Async Adobe analysis failed', {
          sessionId,
          teamId,
          error: error instanceof Error ? error.message : String(error)
        });
      });
  }

  /**
   * Process all attachments with status updates
   */
  private static async processAttachments(
    env: Env,
    sessionId: string,
    teamId: string,
    attachments: AttachmentData[]
  ): Promise<void> {
    for (const attachment of attachments) {
      await AsyncAdobeAnalysis.processSingleAttachment(env, sessionId, teamId, attachment);
    }
  }

  /**
   * Process a single attachment with full status tracking
   */
  private static async processSingleAttachment(
    env: Env,
    sessionId: string,
    teamId: string,
    attachment: AttachmentData
  ): Promise<void> {
    const statusId = await StatusService.createDocumentAnalysisStatus(
      env,
      sessionId,
      teamId,
      attachment.fileName,
      'processing'
    );

    try {
      // Update status: starting extraction
      await StatusService.setStatus(env, {
        id: statusId,
        sessionId,
        teamId,
        type: 'document_analysis',
        status: 'processing',
        message: `🔍 Extracting content from ${attachment.fileName}...`,
        progress: 25,
        data: { fileName: attachment.fileName, analysisType: attachment.analysisType }
      });

      // Perform the actual Adobe analysis (this is the blocking part we moved to background)
      const result = await AsyncAdobeAnalysis.performAdobeAnalysis(env, attachment);

      // Update status: analysis complete
      await StatusService.setStatus(env, {
        id: statusId,
        sessionId,
        teamId,
        type: 'document_analysis',
        status: 'completed',
        message: `✅ Analysis complete for ${attachment.fileName}`,
        progress: 100,
        data: { 
          fileName: attachment.fileName,
          result: {
            confidence: result.confidence,
            summary: result.summary,
            keyFactsCount: result.key_facts?.length || 0,
            entitiesCount: {
              people: result.entities?.people?.length || 0,
              orgs: result.entities?.orgs?.length || 0,
              dates: result.entities?.dates?.length || 0
            }
          }
        }
      });

      Logger.info('Async Adobe analysis completed successfully', {
        sessionId,
        teamId,
        fileName: attachment.fileName,
        confidence: result.confidence
      });

    } catch (error) {
      // Update status: failed
      await StatusService.setStatus(env, {
        id: statusId,
        sessionId,
        teamId,
        type: 'document_analysis',
        status: 'failed',
        message: `❌ Analysis failed for ${attachment.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { 
          fileName: attachment.fileName,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      Logger.error('Async Adobe analysis failed for attachment', {
        sessionId,
        teamId,
        fileName: attachment.fileName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Perform Adobe analysis using existing analysis infrastructure
   * This reuses the existing analyzeFile logic without modification
   */
  private static async performAdobeAnalysis(
    env: Env,
    attachment: AttachmentData
  ): Promise<any> {
    // Import and use existing analysis logic
    const { analyzeFile } = await import('../utils/fileAnalysisUtils.js');
    
    // This is the same call that was blocking in the middleware
    // Now it runs in the background with status updates
    return await analyzeFile(env, attachment.fileId, attachment.analysisQuestion);
  }
}
