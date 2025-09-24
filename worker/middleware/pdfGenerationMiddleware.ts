import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { ConversationContextManager } from './conversationContextManager.js';
import { PDFGenerationService } from '../services/PDFGenerationService.js';

/**
 * PDF Generation Middleware - handles requests to generate PDF case summaries
 * Detects when users want to generate PDFs from their case drafts
 */
export const pdfGenerationMiddleware: PipelineMiddleware = {
  name: 'pdfGenerationMiddleware',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig) => {
    // Check if user is requesting PDF generation
    const pdfKeywords = [
      'generate pdf',
      'create pdf',
      'download pdf',
      'export pdf',
      'pdf summary',
      'case summary pdf',
      'print case summary',
      'save as pdf',
      'get pdf',
      'pdf document',
      'case report',
      'generate report',
      'create report',
      'download case summary',
      'export case summary'
    ];

    const isPDFRequest = pdfKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!isPDFRequest) {
      return { context };
    }

    // Check if we have a case draft to generate PDF from
    if (!context.caseDraft) {
      const response = `I'd be happy to help you generate a PDF case summary! However, I don't see a case draft in our conversation yet. 

**To generate a PDF, please first:**
• Build a case draft with your case information
• Provide details about your legal matter
• Share key facts and timeline

Once we have your case information organized, I can generate a professional PDF summary that you can share with attorneys or keep for your records.

Would you like me to help you build a case draft first?`;

      return {
        context,
        response,
        shouldStop: true
      };
    }

    // Generate PDF from existing case draft
    try {
      const pdfResult = await PDFGenerationService.generateCaseSummaryPDF({
        caseDraft: context.caseDraft,
        clientName: context.clientName,
        teamName: teamConfig?.name || 'Legal Services',
        teamBrandColor: teamConfig?.brandColor || '#2563eb'
      }, env);

      if (pdfResult.success && pdfResult.pdfBuffer) {
        const filename = PDFGenerationService.generateFilename(context.caseDraft, context.clientName);
        
        // Update context with PDF information
        const updatedContext = ConversationContextManager.updateContext(context, {
          ...context,
          generatedPDF: {
            filename,
            size: pdfResult.pdfBuffer.byteLength,
            generatedAt: new Date().toISOString(),
            matterType: context.caseDraft.matter_type
          }
        });

        const response = `Perfect! I've generated a professional PDF case summary for your ${context.caseDraft.matter_type} case.

**PDF Details:**
• **Filename:** ${filename}
• **Size:** ${Math.round(pdfResult.pdfBuffer.byteLength / 1024)} KB
• **Generated:** ${new Date().toLocaleDateString()}

**What's included in your PDF:**
• Case overview and matter type
• Key facts and timeline
• Parties involved
• Available documents and evidence
• Jurisdiction and urgency information
• Professional formatting and legal disclaimers

**Next Steps:**
• Download the PDF to share with attorneys
• Keep a copy for your records
• The PDF is ready for attorney consultations

Would you like me to help you with anything else regarding your case?`;

        return {
          context: updatedContext,
          response,
          shouldStop: true
        };

      } else {
        const response = `I encountered an issue generating your PDF case summary. ${pdfResult.error || 'Please try again later.'}

**Alternative options:**
• I can help you organize your case information again
• You can request a new case draft
• Contact support if the issue persists

Would you like me to help you rebuild your case draft?`;

        return {
          context,
          response,
          shouldStop: true
        };
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      
      const response = `I'm sorry, but I encountered an error while generating your PDF case summary. 

**What happened:**
• PDF generation service is temporarily unavailable
• This might be due to high demand or maintenance

**What you can do:**
• Try again in a few minutes
• I can help you rebuild your case draft
• Contact support if the issue persists

Would you like me to help you organize your case information again?`;

      return {
        context,
        response,
        shouldStop: true
      };
    }
  }
};
