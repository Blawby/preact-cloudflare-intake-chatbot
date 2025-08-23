import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { validateLocation as validateLocationUtil, isLocationSupported } from '../utils/locationValidator.js';
import { CloudflareLocationInfo } from '../utils/cloudflareLocationValidator.js';
import { ValidationService } from '../services/ValidationService.js';
import { TeamConfigService } from '../services/TeamConfigService.js';
import { PaymentServiceFactory } from '../services/PaymentServiceFactory.js';
import { createToolResponse, createValidationError, createSuccessResponse } from '../utils/responseUtils.js';
import { analyzeFile, getAnalysisQuestion } from '../utils/fileAnalysisUtils.js';
import { PromptBuilder } from '../utils/promptBuilder.js';

// Tool definitions with structured schemas
export const collectContactInfo = {
  name: 'collect_contact_info',
  description: 'Collect and validate client contact information including location for jurisdiction verification',
  parameters: {
    type: 'object',
    properties: {
      name: { 
        type: 'string', 
        description: 'Client full name',
        minLength: 2,
        maxLength: 100
      },
      phone: { 
        type: 'string', 
        description: 'Client phone number',
        pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,20}$' // International format
      },
      email: { 
        type: 'string', 
        description: 'Client email address',
        format: 'email'
      },
      location: { 
        type: 'string', 
        description: 'Client location (city, state, or country)',
        examples: ['Charlotte, NC', 'North Carolina', 'NC', 'United States', 'US'],
        minLength: 2,
        maxLength: 100
      }
    },
    required: ['name']
  }
};

export const createMatter = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string', 
        description: 'Type of legal matter',
        enum: ['Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury', 'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review', 'Property Law', 'Administrative Law', 'General Consultation']
      },
      description: { type: 'string', description: 'Brief description of the legal issue' },
      urgency: { 
        type: 'string', 
        description: 'Urgency level',
        enum: ['low', 'medium', 'high', 'urgent']
      },
      name: { type: 'string', description: 'Client full name' },
      phone: { type: 'string', description: 'Client phone number' },
      email: { type: 'string', description: 'Client email address' },
      location: { type: 'string', description: 'Client location (city and state)' },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable' }
    },
    required: ['matter_type', 'description', 'name']
  }
};

export const requestLawyerReview = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for urgent or complex matters',
  parameters: {
    type: 'object',
    properties: {
      urgency: { 
        type: 'string', 
        description: 'Urgency level',
        enum: ['low', 'medium', 'high', 'urgent']
      },
      complexity: { type: 'string', description: 'Matter complexity level' },
      matter_type: { type: 'string', description: 'Type of legal matter' }
    },
    required: ['urgency', 'matter_type']
  }
};

export const scheduleConsultation = {
  name: 'schedule_consultation',
  description: 'Schedule a consultation with an attorney',
  parameters: {
    type: 'object',
    properties: {
      preferred_date: { type: 'string', description: 'Preferred consultation date' },
      preferred_time: { type: 'string', description: 'Preferred consultation time' },
      matter_type: { type: 'string', description: 'Type of legal matter' }
    },
    required: ['matter_type']
  }
};

export const analyzeDocument = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { 
        type: 'string', 
        description: 'The file ID of the uploaded document to analyze',
        pattern: '^[a-zA-Z0-9\\-_]+$'
      },
      analysis_type: { 
        type: 'string', 
        description: 'Type of analysis to perform',
        enum: ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'],
        default: 'general'
      },
      specific_question: { 
        type: 'string', 
        description: 'Optional specific question to ask about the document',
        maxLength: 500
      }
    },
    required: ['file_id']
  }
};

// Tool handlers mapping
export const TOOL_HANDLERS = {
  collect_contact_info: handleCollectContactInfo,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  schedule_consultation: handleScheduleConsultation,
  analyze_document: handleAnalyzeDocument
};

// Unified legal intake agent that handles both streaming and non-streaming responses
export async function runLegalIntakeAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocationInfo,
  controller?: ReadableStreamDefaultController,
  attachments: any[] = []
) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    teamConfig = await TeamConfigService.getTeamConfig(env, teamId);
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Build system prompt using the new PromptBuilder
  const conversationText = formattedMessages.map(msg => msg.content).join(' ').toLowerCase();
  const systemPrompt = PromptBuilder.buildSystemPrompt(cloudflareLocation, attachments, conversationText);

  // Hoist tool parsing variables to function scope
  let toolCallMatch: RegExpMatchArray | null = null;
  let parametersMatch: RegExpMatchArray | null = null;
  let toolName: string | null = null;
  let parameters: any = null;
  
  try {
    console.log('🔄 Starting agent...');
    
    // Send initial connection event for streaming
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call
    console.log('🤖 Calling AI model...');
    
    const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      max_tokens: 500,
      temperature: 0.1
    });
    
    console.log('✅ AI result:', aiResult);
    
    const response = aiResult.response || 'I apologize, but I encountered an error processing your request.';
    console.log('📝 Full response:', response);
    
    // Check for tool call indicators
    if (response.includes('TOOL_CALL:')) {
      console.log('Tool call detected in response');
      
      // Handle streaming case
      if (controller) {
        const typingEvent = `data: ${JSON.stringify({
          type: 'typing',
          text: 'Processing your request...'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(typingEvent));
      }
      
      // Parse tool call
      toolCallMatch = response.match(/TOOL_CALL:\s*([\w_]+)/);
      // Use a more robust approach for JSON extraction
      parametersMatch = response.match(/PARAMETERS:\s*(\{[^]*?\}(?:\n|$))/);
      
      if (toolCallMatch && parametersMatch) {
        toolName = toolCallMatch[1].toLowerCase();
        try {
          // Clean the JSON string before parsing
          const jsonStr = parametersMatch[1].trim();
          parameters = JSON.parse(jsonStr);
          console.log(`Tool: ${toolName}, Parameters:`, parameters);
        } catch (error) {
          console.error('Failed to parse tool parameters:', error);
          console.error('Raw parameters string:', parametersMatch[1]);
          if (controller) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              message: 'Failed to parse tool parameters. Please try rephrasing your request.'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
          }
          return {
            response: 'I encountered an error processing your request. Please try rephrasing your request.',
            metadata: { error: 'Failed to parse tool parameters', rawParameters: parametersMatch[1] }
          };
        }
      }
    }
    
    // Check if we have valid tool call data
    if (toolCallMatch && parametersMatch && toolName && parameters) {
      // Handle streaming case
      if (controller) {
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          toolName: toolName,
          parameters: parameters
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(toolEvent));
      }
      
      // Execute the tool handler
      let toolResult;
      switch (toolName) {
        case 'create_matter':
          toolResult = await handleCreateMatter(parameters, env, teamConfig);
          break;
        case 'collect_contact_info':
          toolResult = await handleCollectContactInfo(parameters, env, teamConfig);
          break;
        case 'request_lawyer_review':
          toolResult = await handleRequestLawyerReview(parameters, env, teamId);
          break;
        case 'schedule_consultation':
          toolResult = await handleScheduleConsultation(parameters, env, teamConfig);
          break;
        case 'analyze_document':
          toolResult = await handleAnalyzeDocument(parameters, env, teamConfig);
          break;
        default:
          console.warn(`❌ Unknown tool: ${toolName}`);
          if (controller) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              message: `Unknown tool: ${toolName}`
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
          }
          return {
            response: `I encountered an error: Unknown tool ${toolName}`,
            metadata: { error: `Unknown tool: ${toolName}` }
          };
      }
      
      // Handle streaming case
      if (controller) {
        const resultEvent = `data: ${JSON.stringify({
          type: 'tool_result',
          toolName: toolName,
          result: toolResult
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(resultEvent));
      }
      
      // If tool was successful and created a matter, trigger lawyer approval
      if (toolResult.success && toolName === 'create_matter') {
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (!lastMessage || !lastMessage.content) {
          console.warn('No last message found for lawyer approval');
        }

        await handleLawyerApproval(env, {
          matter_type: parameters.matter_type,
          urgency: parameters.urgency,
          client_message: lastMessage?.content || '',
          client_name: parameters.name,
          client_phone: parameters.phone,
          client_email: parameters.email,
          opposing_party: parameters.opposing_party || '',
          matter_details: parameters.description,
          submitted: true,
          requires_payment: toolResult.data?.requires_payment || false,
          consultation_fee: toolResult.data?.consultation_fee || 0,
          payment_link: toolResult.data?.payment_link || null
        }, teamId);
      }
      
      // Return tool result for non-streaming case
      if (!controller) {
        return {
          response: toolResult.message || toolResult.response || 'Tool executed successfully.',
          metadata: {
            toolName,
            toolResult,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId
          }
        };
      }
      
      // Return after tool execution for streaming case
      return;
    }
    
    // If no tool call detected, handle the regular response
    console.log('📝 No tool call detected, handling regular response');
    
    if (controller) {
      // Streaming case: simulate streaming by sending response in chunks
      const chunkSize = 3;
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize);
        const textEvent = `data: ${JSON.stringify({
          type: 'text',
          text: chunk
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(textEvent));
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send final response
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: response
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
    } else {
      // Non-streaming case: return the response directly
      return {
        response,
        metadata: {
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  } catch (error) {
    console.error('Agent error:', error);
    const errorMessage = error.message || 'An error occurred while processing your request';

    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: errorMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      try {
        controller.close();
      } catch (closeError) {
        console.error('Error closing controller:', closeError);
      }
    } else {
      return {
        response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
        metadata: {
          error: error.message,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  }
}

// Helper function to handle lawyer approval
async function handleLawyerApproval(env: any, params: any, teamId: string) {
  console.log('Lawyer approval requested:', params);
  
  try {
    // Get team config for notification
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(teamId);
    
    if (teamConfig.ownerEmail && env.RESEND_API_KEY) {
      const { EmailService } = await import('../services/EmailService.js');
      const emailService = new EmailService(env.RESEND_API_KEY);
      
      await emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: 'New Matter Requires Review',
        text: `A new legal matter requires your review.\n\nMatter Details: ${JSON.stringify(params, null, 2)}`
      });
    } else {
      console.log('Email service not configured - skipping email notification');
    }
  } catch (error) {
    console.warn('Failed to send lawyer approval email:', error);
    // Don't fail the request if email fails
  }
}

// Tool handlers
export async function handleCollectContactInfo(parameters: any, env: any, teamConfig: any) {
  const { name, phone, email, location } = parameters;
  
  // Check for placeholder values
  if (ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Validate name if provided
  if (name && !ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  // First, verify jurisdiction if location is provided
  if (location) {
    const jurisdiction = teamConfig?.config?.jurisdiction;
    if (jurisdiction && jurisdiction.type) {
      const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
      const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
      
      const isSupported = isLocationSupported(location, supportedStates, supportedCountries);
      
      if (!isSupported) {
        return createValidationError(`I understand you're located in ${location}. While we primarily serve ${jurisdiction.description || 'our service area'}, I can still help you with general legal guidance and information. For specific legal representation in your area, I'd recommend contacting a local attorney. However, I'm happy to continue helping you with your legal questions and can assist with general consultation.`);
      }
    }
  }
  
  if (!name) {
    return createValidationError("I need your name to proceed. Could you please provide your full name?");
  }
  
  // Check if we have both phone and email
  if (!phone && !email) {
    return createValidationError("I have your name, but I need both your phone number and email address to contact you. Could you provide both?");
  }
  
  if (!phone) {
    return createValidationError(`Thank you ${name}! I have your email address. Could you also provide your phone number?`);
  }
  
  if (!email) {
    return createValidationError(`Thank you ${name}! I have your phone number. Could you also provide your email address?`);
  }
  
  return createSuccessResponse(
    `Thank you ${name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
    { name, phone, email, location }
  );
}

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any) {
  console.log('[handleCreateMatter] parameters:', parameters);
  console.log('[handleCreateMatter] teamConfig:', JSON.stringify(teamConfig, null, 2));
  const { matter_type, description, urgency, name, phone, email, location, opposing_party } = parameters;
  
  // Check for placeholder values
  if (ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Validate required fields
  if (!matter_type || !description || !name) {
    return createValidationError("I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?");
  }
  
  // Validate matter type
  if (!ValidationService.validateMatterType(matter_type)) {
    return createValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
  }
  
  // Set default urgency if not provided
  const finalUrgency = urgency || 'unknown';
  
  // Validate name format
  if (!ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  if (!phone && !email) {
    return createValidationError("I need both your phone number and email address to proceed. Could you provide both contact methods?");
  }
  
  // Process payment using the PaymentServiceFactory
  const paymentRequest = {
    customerInfo: {
      name: name,
      email: email || '',
      phone: phone || '',
      location: location || ''
    },
    matterInfo: {
      type: matter_type,
      description: description,
      urgency: finalUrgency,
      opposingParty: opposing_party || ''
    },
    teamId: (() => {
      if (teamConfig?.id) {
        return teamConfig.id;
      }
      if (env.BLAWBY_TEAM_ULID) {
        console.warn('⚠️  Using environment variable BLAWBY_TEAM_ULID as fallback - team configuration not found in database');
        return env.BLAWBY_TEAM_ULID;
      }
      console.error('❌ CRITICAL: No team ID available for payment processing');
      console.error('   - teamConfig?.id:', teamConfig?.id);
      console.error('   - env.BLAWBY_TEAM_ULID:', env.BLAWBY_TEAM_ULID);
      console.error('   - Team configuration should be set in database for team:', teamConfig?.slug || 'unknown');
      throw new Error('Team ID not configured - cannot process payment. Check database configuration.');
    })(),
    sessionId: 'session-' + Date.now()
  };
  
  const { invoiceUrl, paymentId } = await PaymentServiceFactory.processPayment(env, paymentRequest, teamConfig);
  
  // Build summary message
  const requiresPayment = teamConfig?.config?.requiresPayment || false;
  const consultationFee = teamConfig?.config?.consultationFee || 0;
  
  let summaryMessage = `Perfect! I have all the information I need. Here's a summary of your matter:

**Client Information:**
- Name: ${name}
- Contact: ${phone || 'Not provided'}${email ? `, ${email}` : ''}${location ? `, ${location}` : ''}`;

  if (opposing_party) {
    summaryMessage += `
- Opposing Party: ${opposing_party}`;
  }

  summaryMessage += `

**Matter Details:**
- Type: ${matter_type}
- Description: ${description}
- Urgency: ${finalUrgency}`;

  if (requiresPayment && consultationFee > 0) {
    if (invoiceUrl) {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using the embedded payment form below
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    } else {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using this link: ${teamConfig?.config?.paymentLink || 'Payment link will be sent shortly'}
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    }
  } else {
    summaryMessage += `

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation.`;
  }
  
  const result = createSuccessResponse(summaryMessage, {
    matter_type,
    description,
    urgency: finalUrgency,
    name,
    phone,
    email,
    location,
    opposing_party,
    requires_payment: requiresPayment,
    consultation_fee: consultationFee,
    payment_link: invoiceUrl || teamConfig?.config?.paymentLink,
    payment_embed: invoiceUrl ? {
      paymentUrl: invoiceUrl,
      amount: consultationFee,
      description: `${matter_type}: ${description}`,
      paymentId: paymentId
    } : null
  });
  
  console.log('[handleCreateMatter] result:', JSON.stringify(result, null, 2));
  return result;
}

export async function handleRequestLawyerReview(parameters: any, env: any, teamConfig: any) {
  const { urgency, complexity, matter_type } = parameters;
  
  try {
    const { EmailService } = await import('../services/EmailService.js');
    const emailService = new EmailService(env);
    
    const ownerEmail = teamConfig?.config?.ownerEmail;
    if (ownerEmail) {
      await emailService.send({
        from: 'noreply@blawby.com',
        to: ownerEmail,
        subject: `Urgent Legal Matter Review Required - ${matter_type}`,
        text: `A new urgent legal matter requires immediate review:

Matter Type: ${matter_type}
Urgency: ${urgency}
Complexity: ${complexity || 'Standard'}

Please review this matter as soon as possible.`
      });
    }
  } catch (error) {
    console.log('Email service not configured - skipping email notification');
  }
  
  return createSuccessResponse("I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.");
}

export async function handleScheduleConsultation(parameters: any, env: any, teamConfig: any) {
  const { preferred_date, preferred_time, matter_type } = parameters;
  
  return createSuccessResponse(`I'd like to schedule a consultation with one of our experienced attorneys for your ${matter_type} matter. Would you be available to meet with us this week?`);
}

export async function handleAnalyzeDocument(parameters: any, env: any, teamConfig: any) {
  const { file_id, analysis_type, specific_question } = parameters;
  
  console.log('=== ANALYZE DOCUMENT TOOL CALLED ===');
  console.log('File ID:', file_id);
  console.log('Analysis Type:', analysis_type);
  console.log('Specific Question:', specific_question);
  
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
  console.log('=== DOCUMENT ANALYSIS RESULTS ===');
  console.log('Document Type:', analysis_type);
  console.log('Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  console.log('Summary:', fileAnalysis.summary);
  console.log('Key Facts:', fileAnalysis.key_facts);
  console.log('Entities:', fileAnalysis.entities);
  console.log('Action Items:', fileAnalysis.action_items);
  console.log('================================');
  
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
  
  console.log('=== FINAL ANALYSIS RESPONSE ===');
  console.log('Response:', response);
  console.log('Response Length:', response.length, 'characters');
  console.log('Response Type:', analysis_type);
  console.log('Suggested Matter Type:', suggestedMatterType);
  console.log('Response Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  console.log('==============================');
  
  return createSuccessResponse(response, {
    ...fileAnalysis,
    suggestedMatterType,
    parties,
    organizations,
    dates,
    keyFacts
  });
}