import { createSuccessResponse, createValidationError } from '../../utils/responseUtils.js';
import { analyzeFile, getAnalysisQuestion } from '../../utils/fileAnalysisUtils.js';
import { Logger } from '../../utils/logger.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';
import { Env } from '../../types.js';
import { TeamConfig } from '../../services/TeamService.js';

// Interface for lawyer review request parameters
interface LawyerReviewParameters {
  complexity: string;
  matter_type: string;
}

// Interface for document analysis parameters
interface DocumentAnalysisParameters {
  file_id: string;
  analysis_type: string;
  specific_question?: string;
}

// Interface for validation errors
interface ValidationError {
  field: string;
  message: string;
}

export async function handleRequestLawyerReview(parameters: LawyerReviewParameters, env: Env, teamConfig: TeamConfig) {
  // Validate required parameters
  const validationErrors = validateLawyerReviewParameters(parameters);
  if (validationErrors.length > 0) {
    const errorMessage = validationErrors.map(err => `${err.field}: ${err.message}`).join(', ');
    return createValidationError(`Invalid parameters: ${errorMessage}`);
  }

  const { complexity, matter_type } = parameters;
  
  try {
    // Send notification using NotificationService
    const { NotificationService } = await import('../../services/NotificationService.js');
    const notificationService = new NotificationService(env);
    
    await notificationService.sendLawyerReviewNotification({
      type: 'lawyer_review',
      teamConfig,
      matterInfo: {
        type: matter_type,
        complexity
      }
    });
    
    Logger.info('Lawyer review notification sent successfully', { complexity, matter_type });
    return createSuccessResponse("I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.");
  } catch (error) {
    Logger.error('Failed to send lawyer review notification', { error, complexity, matter_type });
    return createValidationError("I'm sorry, I encountered an issue while requesting the lawyer review. Please try again or contact support if the problem persists.");
  }
}

export async function handleAnalyzeDocument(parameters: DocumentAnalysisParameters, env: Env, teamConfig: TeamConfig) {
  // Validate required parameters
  const validationErrors = validateDocumentAnalysisParameters(parameters);
  if (validationErrors.length > 0) {
    const errorMessage = validationErrors.map(err => `${err.field}: ${err.message}`).join(', ');
    return createValidationError(`Invalid parameters: ${errorMessage}`);
  }

  const { file_id, analysis_type, specific_question } = parameters;
  
  Logger.debug('=== ANALYZE DOCUMENT TOOL CALLED ===');
  Logger.debug('File ID:', ToolCallParser.sanitizeParameters(file_id));
  Logger.debug('Analysis Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Specific Question:', ToolCallParser.sanitizeParameters(specific_question));
  
  // Get the appropriate analysis question
  const customQuestion = getAnalysisQuestion(analysis_type, specific_question);
  
  // Perform the analysis
  const fileAnalysis = await analyzeFile(env, file_id, customQuestion);
  
  if (!fileAnalysis) {
    return createValidationError("I'm sorry, I couldn't analyze that document. The file may not be accessible or may not be in a supported format. Could you please try uploading it again or provide more details about what you'd like me to help you with?");
  }
  
  // Check if the analysis returned an error response (low confidence indicates error)
  if (fileAnalysis.confidence === 0.0) {
    return createValidationError(fileAnalysis.summary || "I'm sorry, I couldn't analyze that document. Please try uploading it again or contact support if the issue persists.");
  }
  
  // Add document type to analysis
  fileAnalysis.documentType = analysis_type;
  
  // Log the analysis results
  Logger.debug('=== DOCUMENT ANALYSIS RESULTS ===');
  Logger.debug('Document Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('Summary:', ToolCallParser.sanitizeParameters(fileAnalysis.summary));
  Logger.debug('Key Facts:', ToolCallParser.sanitizeParameters(fileAnalysis.key_facts));
  Logger.debug('Entities:', ToolCallParser.sanitizeParameters(fileAnalysis.entities));
  Logger.debug('Action Items:', ToolCallParser.sanitizeParameters(fileAnalysis.action_items));
  Logger.debug('================================');
  
  // Create a legally-focused response that guides toward matter creation
  let response = '';
  
  // Extract key information for legal intake
  const parties = fileAnalysis.entities?.people || [];
  const organizations = fileAnalysis.entities?.orgs || [];
  const dates = fileAnalysis.entities?.dates || [];
  const keyFacts = fileAnalysis.key_facts || [];
  
  // Determine likely matter type based on document analysis
  let suggestedMatterType = 'General Consultation';
  if (analysis_type === 'contract' || fileAnalysis.summary?.toLowerCase().includes('contract')) {
    suggestedMatterType = 'Contract Review';
  } else if (analysis_type === 'medical_document' || fileAnalysis.summary?.toLowerCase().includes('medical')) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'government_form' || fileAnalysis.summary?.toLowerCase().includes('form')) {
    suggestedMatterType = 'Administrative Law';
  } else if (analysis_type === 'image' && (fileAnalysis.summary?.toLowerCase().includes('accident') || fileAnalysis.summary?.toLowerCase().includes('injury'))) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'image' && fileAnalysis.summary?.toLowerCase().includes('property')) {
    suggestedMatterType = 'Property Law';
  }
  
  // Build legally-focused response
  response += `I've analyzed your document and here's what I found:\n\n`;
  
  // Document identification
  if (fileAnalysis.summary) {
    response += `**Document Analysis:** ${fileAnalysis.summary}\n\n`;
  }
  
  // Key legal details
  if (parties.length > 0) {
    response += `**Parties Involved:** ${parties.join(', ')}\n`;
  }
  
  if (organizations.length > 0) {
    response += `**Organizations:** ${organizations.join(', ')}\n`;
  }
  
  if (dates.length > 0) {
    response += `**Important Dates:** ${dates.join(', ')}\n`;
  }
  
  if (keyFacts.length > 0) {
    response += `**Key Facts:**\n`;
    keyFacts.slice(0, 3).forEach(fact => {
      response += `• ${fact}\n`;
    });
  }
  
  response += `\n**Suggested Legal Matter Type:** ${suggestedMatterType}\n\n`;
  
  // Legal guidance and next steps
  response += `Based on this analysis, I can help you:\n`;
  response += `• Create a legal matter for attorney review\n`;
  response += `• Identify potential legal issues or concerns\n`;
  response += `• Determine appropriate legal services needed\n`;
  response += `• Prepare for consultation with an attorney\n\n`;
  
  // Call to action
  response += `Would you like me to create a legal matter for this ${suggestedMatterType.toLowerCase()} case? I'll need your contact information to get started.`;
  
  Logger.debug('=== FINAL ANALYSIS RESPONSE ===');
  Logger.debug('Response:', ToolCallParser.sanitizeParameters(response));
  Logger.debug('Response Length:', `${response.length} characters`);
  Logger.debug('Response Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Suggested Matter Type:', ToolCallParser.sanitizeParameters(suggestedMatterType));
  Logger.debug('Response Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('==============================');
  
  return createSuccessResponse(response, {
    ...fileAnalysis,
    suggestedMatterType,
    parties,
    organizations,
    dates,
    keyFacts
  });
}

/**
 * Validates lawyer review request parameters
 */
function validateLawyerReviewParameters(parameters: LawyerReviewParameters): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!parameters.complexity || typeof parameters.complexity !== 'string') {
    errors.push({ field: 'complexity', message: 'Complexity is required and must be a string' });
  }
  
  if (!parameters.matter_type || typeof parameters.matter_type !== 'string') {
    errors.push({ field: 'matter_type', message: 'Matter type is required and must be a string' });
  }
  
  return errors;
}

/**
 * Validates document analysis parameters
 */
function validateDocumentAnalysisParameters(parameters: DocumentAnalysisParameters): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!parameters.file_id || typeof parameters.file_id !== 'string') {
    errors.push({ field: 'file_id', message: 'File ID is required and must be a string' });
  }
  
  if (!parameters.analysis_type || typeof parameters.analysis_type !== 'string') {
    errors.push({ field: 'analysis_type', message: 'Analysis type is required and must be a string' });
  }
  
  if (parameters.specific_question && typeof parameters.specific_question !== 'string') {
    errors.push({ field: 'specific_question', message: 'Specific question must be a string if provided' });
  }
  
  return errors;
}