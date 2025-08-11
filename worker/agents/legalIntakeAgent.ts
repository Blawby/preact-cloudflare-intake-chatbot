import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { validateLocation as validateLocationUtil, isLocationSupported } from '../utils/locationValidator.js';
import { CloudflareLocationInfo, getLocationDescription } from '../utils/cloudflareLocationValidator.js';

// Helper function to analyze files using the vision API
async function analyzeFile(env: any, fileId: string, question?: string): Promise<any> {
  // Determine the appropriate question based on file type or use default
  const defaultQuestion = "Analyze this document and provide a comprehensive summary with key facts, entities, and actionable insights. Focus on information relevant for legal intake or professional services.";
  
  const analysisQuestion = question || defaultQuestion;
  try {
    // Get file from R2 storage
    if (!env.FILES_BUCKET) {
      console.warn('FILES_BUCKET not configured, skipping file analysis');
      return null;
    }

    // Try to get file metadata from database first
    let fileRecord = null;
    try {
      const stmt = env.DB.prepare(`
        SELECT * FROM files WHERE id = ? AND is_deleted = FALSE
      `);
      fileRecord = await stmt.bind(fileId).first();
    } catch (dbError) {
      console.warn('Failed to get file metadata from database:', dbError);
    }

    // Construct file path
    let filePath = fileRecord?.file_path;
    if (!filePath) {
      // Fallback path construction (same logic as in files.ts)
      const lastHyphenIndex = fileId.lastIndexOf('-');
      const secondLastHyphenIndex = fileId.lastIndexOf('-', lastHyphenIndex - 1);
      
      if (lastHyphenIndex !== -1 && secondLastHyphenIndex !== -1) {
        const parts = fileId.split('-');
        if (parts.length >= 4) {
          const timestamp = parts[parts.length - 2];
          const randomString = parts[parts.length - 1];
          const teamIdAndSessionId = parts.slice(0, -2).join('-');
          const sessionIdMatch = teamIdAndSessionId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
          
          if (sessionIdMatch) {
            const sessionId = sessionIdMatch[0];
            const teamId = teamIdAndSessionId.substring(0, teamIdAndSessionId.length - sessionId.length - 1);
            const prefix = `uploads/${teamId}/${sessionId}/${fileId}`;
            const objects = await env.FILES_BUCKET.list({ prefix });
            if (objects.objects.length > 0) {
              filePath = objects.objects[0].key;
            }
          }
        }
      }
    }

    if (!filePath) {
      console.warn('Could not determine file path for analysis:', fileId);
      return null;
    }

    // Get file from R2
    const fileObject = await env.FILES_BUCKET.get(filePath);
    if (!fileObject) {
      console.warn('File not found in R2 storage for analysis:', filePath);
      return null;
    }

    // Create a File object for the analyze endpoint
    const file = new File([fileObject.body], fileRecord?.original_name || fileId, {
      type: fileRecord?.mime_type || fileObject.httpMetadata?.contentType || 'application/octet-stream'
    });

    // Call the analyze endpoint
    const formData = new FormData();
    formData.append('file', file);
    formData.append('q', analysisQuestion);

    const response = await fetch('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Analysis API error:', error);
      return null;
    }

    const result = await response.json();
    return result.data?.analysis || null;

  } catch (error) {
    console.error('File analysis error:', error);
    return null;
  }
}

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
        enum: ['Family Law', 'Employment Law', 'Personal Injury', 'Criminal Law', 'Civil Law', 'General Consultation']
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
    required: ['matter_type', 'description', 'urgency', 'name']
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
        enum: ['general', 'resume', 'legal_document', 'medical_document', 'image'],
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

// Shared utility function for location context and prompt construction
function buildLocationContext(cloudflareLocation?: CloudflareLocationInfo): { locationContext: string; locationPrompt: string } {
  let locationContext = '';
  let locationPrompt = '';
  
  if (cloudflareLocation && cloudflareLocation.isValid) {
    locationContext = `\n**JURISDICTION VALIDATION:** We can validate your location against our service area.`;
    locationPrompt = '"Can you please tell me your city and state?"';
  } else {
    locationPrompt = '"Can you please tell me your city and state?"';
  }
  
  return { locationContext, locationPrompt };
}

// Helper function to get team configuration
async function getTeamConfig(env: any, teamId: string) {
  try {
    const { TeamService } = await import('../services/TeamService.js');
    const teamService = new TeamService(env);
    console.log('Retrieving team for teamId:', teamId);
    const team = await teamService.getTeam(teamId);
    if (team) {
      console.log('Retrieved team:', { id: team.id, slug: team.slug, name: team.name });
      console.log('Team config:', JSON.stringify(team.config, null, 2));
      return team;
    } else {
      console.log('No team found, returning default config');
      return {
        id: teamId,
        slug: 'default',
        name: 'Default Team',
        config: {
          requiresPayment: false,
          consultationFee: 0,
          paymentLink: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn('Failed to get team config:', error);
    return {
      id: teamId,
      slug: 'default',
      name: 'Default Team',
      config: {
        requiresPayment: false,
        consultationFee: 0,
        paymentLink: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

// Tool handlers mapping
export const TOOL_HANDLERS = {
  collect_contact_info: handleCollectContactInfo,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  schedule_consultation: handleScheduleConsultation,
  analyze_document: handleAnalyzeDocument
};

// Simple validation functions
const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  
  try {
    // Use libphonenumber-js for comprehensive phone validation
    const phoneNumber = parsePhoneNumber(phone, 'US');
    
    if (!phoneNumber) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    
    if (!isValidPhoneNumber(phone, 'US')) {
      return { isValid: false, error: 'Invalid phone number' };
    }
    
    // Additional validation for US numbers
    if (phoneNumber.country === 'US') {
      const nationalNumber = phoneNumber.nationalNumber;
      if (nationalNumber.length !== 10) {
        return { isValid: false, error: 'US phone numbers must be 10 digits' };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Phone validation error' };
  }
};

const validateName = (name: string): boolean => {
  if (!name) return false;
  const trimmedName = name.trim();
  return trimmedName.length >= 2 && trimmedName.length <= 100;
};

const validateLocation = (location: string): boolean => {
  if (!location) return false;
  const locationInfo = validateLocationUtil(location);
  return locationInfo.isValid;
};

// Create the legal intake agent using native Cloudflare AI
export async function runLegalIntakeAgent(env: any, messages: any[], teamId?: string, sessionId?: string, cloudflareLocation?: CloudflareLocationInfo, attachments: any[] = []) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    teamConfig = await getTeamConfig(env, teamId);
  }

  // Note: File analysis is now handled as a tool call (analyze_document)
  // The AI will call this tool when it determines document analysis is needed

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Use shared utility function for location context and prompt construction
  const { locationContext, locationPrompt } = buildLocationContext(cloudflareLocation);

  // Build system prompt
  let systemPrompt = `You are a legal intake specialist. Collect client information step by step. Help with ALL legal matters - do not reject any cases.`;

  // Add file information to system prompt if attachments are present
  if (attachments && attachments.length > 0) {
    systemPrompt += `\n\nThe user has uploaded files. Analyze them using the analyze_document tool before proceeding:
${attachments.map((file, index) => `${index + 1}. ${file.name} - File ID: ${file.url?.split('/').pop()?.split('.')[0] || 'unknown'}`).join('\n')}`;
  }

  systemPrompt += `

**CONVERSATION FLOW:**
1. If no name: "Can you please provide your full name?"
2. If name but no location: ${locationPrompt}
3. If name and location but no phone: "Thank you [name]! Now I need your phone number."
4. If name, location, and phone but no email: "Thank you [name]! Now I need your email address."
5. If name, location, phone, and email but no opposing party: "Thank you [name]! For legal matters, it's helpful to know if there's an opposing party involved. Who is the other party in this situation? (If none, you can say 'none' or 'not applicable')"
6. If ALL information collected: Call create_matter tool immediately.

**Available Tools:**
- create_matter: Use when you have all required information (name, location, phone, email, opposing party)
- analyze_document: Use when files are uploaded

**Example Tool Calls:**
TOOL_CALL: create_matter
PARAMETERS: {"matter_type": "Family Law", "description": "Client seeking legal assistance", "urgency": "medium", "name": "John Doe", "phone": "555-123-4567", "email": "john@example.com", "location": "Charlotte, NC", "opposing_party": "Jane Doe"}

TOOL_CALL: analyze_document
PARAMETERS: {"file_id": "file-abc123-def456", "analysis_type": "resume", "specific_question": "Analyze this resume for improvement opportunities"}

**DO NOT provide legal advice. Follow the conversation flow step by step.**`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const response = result.response as string;
    console.log('[AI] Full AI response:', response);
    
    // Check if the response contains a tool call
    if (response.includes('TOOL_CALL:')) {
      console.log('[MAIN] Tool call detected in response');
      const toolCallMatch = response.match(/TOOL_CALL:\s*(\w+)/);
      const parametersMatch = response.match(/PARAMETERS:\s*(\{[\s\S]*?\})/);
      
      if (toolCallMatch && parametersMatch) {
        const toolName = toolCallMatch[1].toLowerCase(); // Normalize tool name
        console.log('[MAIN] Tool name:', toolName);
        let parameters;
        try {
          parameters = JSON.parse(parametersMatch[1]);
          console.log('[MAIN] Tool parameters:', parameters);
        } catch (error) {
          console.error('Failed to parse tool parameters:', error);
          console.error('Raw parameters string:', parametersMatch[1]);
          return {
            response: 'I apologize, but I encountered an error processing your request. Please try again.',
            metadata: {
              error: 'Failed to parse tool parameters',
              sessionId,
              teamId
            }
          };
        }

        // Handle different tool calls
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
            return {
              response: `I apologize, but I don't recognize the tool "${toolName}". Please try again.`,
              metadata: {
                error: `Unknown tool: ${toolName}`,
                sessionId,
                teamId
              }
            };
        }

        // Log the final tool response that will be sent to user
        console.log('=== FINAL TOOL RESPONSE TO USER ===');
        console.log('Tool Name:', toolName);
        console.log('User Response:', toolResult.message);
        console.log('Response Length:', toolResult.message.length, 'characters');
        console.log('Response Success:', toolResult.success);
        if (toolResult.analysis) {
          console.log('Analysis Confidence:', `${(toolResult.analysis.confidence * 100).toFixed(1)}%`);
          console.log('Analysis Type:', toolResult.analysis.documentType);
          console.log('Key Facts Count:', toolResult.analysis.key_facts?.length || 0);
          console.log('Action Items Count:', toolResult.analysis.action_items?.length || 0);
        }
        console.log('==================================');

        return {
          toolCalls: [{ name: toolName, parameters }],
          response: toolResult.message,
          metadata: {
            toolName,
            parameters,
            toolResult,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId
          }
        };
      } else {
        console.log('[MAIN] Tool call detected but parsing failed');
        console.log('[MAIN] toolCallMatch:', toolCallMatch);
        console.log('[MAIN] parametersMatch:', parametersMatch);
      }
    }

    // If no tool call detected, return the AI response as-is
    console.log('[MAIN] No tool call detected, returning AI response');
    
    // Log the final response
    console.log('=== FINAL AI RESPONSE TO USER ===');
    console.log('Response:', response);
    console.log('Response Length:', response.length, 'characters');
    console.log('Response Type: AI-generated (no tool call)');
    console.log('==========================================');
    
    return {
      response,
      metadata: {
        inputMessageCount: formattedMessages.length,
        lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
        sessionId,
        teamId
      }
    };
    
  } catch (error) {
    console.error('Error running legal intake agent:', error);
    return {
      response: "I'm here to help with your legal needs. What can I assist you with?",
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
  
  // Validate name if provided
  if (name && !validateName(name)) {
    return { 
      success: false, 
      message: "I need your full name to proceed. Could you please provide your complete name?" 
    };
  }
  
  // Validate email if provided
  if (email && !validateEmail(email)) {
    return { 
      success: false, 
      message: "The email address you provided doesn't appear to be valid. Could you please provide a valid email address?" 
    };
  }
  
  // Validate phone if provided
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return { 
        success: false, 
        message: `The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?` 
      };
    }
  }
  
  // Validate location if provided
  if (location && !validateLocation(location)) {
    return { 
      success: false, 
      message: "Could you please provide your city and state or country?" 
    };
  }
  
  // First, verify jurisdiction if location is provided
  if (location) {
    const jurisdiction = teamConfig?.config?.jurisdiction;
    if (jurisdiction && jurisdiction.type) {
      // Use the new location validator
      const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
      const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
      
      const isSupported = isLocationSupported(location, supportedStates, supportedCountries);
      
      if (!isSupported) {
        return {
          success: false,
          message: `I understand you're located in ${location}. While we primarily serve ${jurisdiction.description || 'our service area'}, I can still help you with general legal guidance and information. For specific legal representation in your area, I'd recommend contacting a local attorney. However, I'm happy to continue helping you with your legal questions and can assist with general consultation.`
        };
      }
    }
  }
  
  if (!name) {
    return { success: false, message: "I need your name to proceed. Could you please provide your full name?" };
  }
  
  // Check if we have both phone and email
  if (!phone && !email) {
    return { success: false, message: "I have your name, but I need both your phone number and email address to contact you. Could you provide both?" };
  }
  
  if (!phone) {
    return { success: false, message: `Thank you ${name}! I have your email address. Could you also provide your phone number?` };
  }
  
  if (!email) {
    return { success: false, message: `Thank you ${name}! I have your phone number. Could you also provide your email address?` };
  }
  
  return { 
    success: true, 
    message: `Thank you ${name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
    data: { name, phone, email, location }
  };
}

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any) {
  console.log('[handleCreateMatter] parameters:', parameters);
  console.log('[handleCreateMatter] teamConfig:', JSON.stringify(teamConfig, null, 2));
  const { matter_type, description, urgency, name, phone, email, location, opposing_party } = parameters;
  
  // Validate required fields
  if (!matter_type || !description || !urgency || !name) {
    return { 
      success: false, 
      message: "I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?" 
    };
  }
  
  // Validate name format
  if (!validateName(name)) {
    return { 
      success: false, 
      message: "I need your full name to proceed. Could you please provide your complete name?" 
    };
  }
  
  // Validate email if provided
  if (email && !validateEmail(email)) {
    return { 
      success: false, 
      message: "The email address you provided doesn't appear to be valid. Could you please provide a valid email address?" 
    };
  }
  
  // Validate phone if provided
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return { 
        success: false, 
        message: `The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?` 
      };
    }
  }
  
  // Validate location if provided
  if (location && !validateLocation(location)) {
    return { 
      success: false, 
      message: "Could you please provide your city and state or country?" 
    };
  }
  
  if (!phone && !email) {
    return {
      success: false,
      message: "I need both your phone number and email address to proceed. Could you provide both contact methods?"
    };
  }
  
  // Check if payment is required
  const requiresPayment = teamConfig?.config?.requiresPayment || false;
  const consultationFee = teamConfig?.config?.consultationFee || 0;
  const paymentLink = teamConfig?.config?.paymentLink || null;
  
  // If payment is required, create invoice via payment service
  let invoiceUrl = null;
  let paymentId = null;
  
  if (requiresPayment && consultationFee > 0) {
    try {
      // Use real service when we have API token, otherwise use mock
      const hasApiToken = env.BLAWBY_API_TOKEN && env.BLAWBY_API_TOKEN !== 'your_resend_api_key_here';
      const { PaymentService } = await import('../services/PaymentService.js');
      const { MockPaymentService } = await import('../services/MockPaymentService.js');
      const paymentService = hasApiToken ? new PaymentService(env) : new MockPaymentService(env);
      
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
          urgency: urgency,
          opposingParty: opposing_party || ''
        },
        teamId: teamConfig?.id || env.BLAWBY_TEAM_ULID || '01jq70jnstyfzevc6423czh50e',
        sessionId: 'session-' + Date.now()
      };
      
      const paymentResult = await paymentService.createInvoice(paymentRequest);
      
      if (paymentResult.success) {
        invoiceUrl = paymentResult.invoiceUrl;
        paymentId = paymentResult.paymentId;
        console.log('✅ Invoice created successfully:', { invoiceUrl, paymentId });
      } else {
        console.error('❌ Failed to create invoice:', paymentResult.error);
        // Fallback to team payment link
        invoiceUrl = paymentLink;
        console.log('✅ Using team payment link as fallback:', invoiceUrl);
      }
    } catch (error) {
      console.error('❌ Payment service error:', error);
      // Fallback to team payment link
      invoiceUrl = paymentLink;
      console.log('✅ Using team payment link as fallback:', invoiceUrl);
    }
  }
  
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
- Urgency: ${urgency}`;

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
1. Please complete the payment using this link: ${paymentLink || 'Payment link will be sent shortly'}
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    }
  } else {
    summaryMessage += `

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation.`;
  }
  
  const result = {
    success: true,
    message: summaryMessage,
    data: {
      matter_type,
      description,
      urgency,
      name,
      phone,
      email,
      location,
      opposing_party,
      requires_payment: requiresPayment,
      consultation_fee: consultationFee,
      payment_link: invoiceUrl || paymentLink,
      payment_embed: invoiceUrl ? {
        paymentUrl: invoiceUrl,
        amount: consultationFee,
        description: `${matter_type}: ${description}`,
        paymentId: paymentId
      } : null
    }
  };
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
  
  return {
    success: true,
    message: "I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further."
  };
}

export async function handleScheduleConsultation(parameters: any, env: any, teamConfig: any) {
  const { preferred_date, preferred_time, matter_type } = parameters;
  
  return {
    success: true,
    message: `I'd like to schedule a consultation with one of our experienced attorneys for your ${matter_type} matter. Would you be available to meet with us this week?`
  };
}

export async function handleAnalyzeDocument(parameters: any, env: any, teamConfig: any) {
  const { file_id, analysis_type, specific_question } = parameters;
  
  console.log('=== ANALYZE DOCUMENT TOOL CALLED ===');
  console.log('File ID:', file_id);
  console.log('Analysis Type:', analysis_type);
  console.log('Specific Question:', specific_question);
  
  // Determine the appropriate question based on analysis type
  let customQuestion = specific_question;
  
  if (!customQuestion) {
    switch (analysis_type) {
      case 'resume':
        customQuestion = "Analyze this resume/CV and extract key professional information, skills, experience, and achievements. Identify strengths and areas for improvement. Provide actionable insights for career development or job applications.";
        break;
      case 'legal_document':
        customQuestion = "Analyze this legal document and extract key terms, parties involved, dates, obligations, and potential legal implications. Identify any concerning clauses or areas that may need legal review.";
        break;
      case 'medical_document':
        customQuestion = "Analyze this medical document and extract key health information, diagnoses, treatments, dates, and any information relevant to legal matters such as personal injury or medical malpractice.";
        break;
      case 'image':
        customQuestion = "Analyze this image and describe what you see. If it's related to a legal matter (accident scene, injury, property damage, etc.), provide detailed observations that could be relevant for legal proceedings.";
        break;
      default:
        customQuestion = "Analyze this document and provide a comprehensive summary with key facts, entities, and actionable insights. Focus on information relevant for legal intake or professional services.";
    }
  }
  
  // Perform the analysis
  const fileAnalysis = await analyzeFile(env, file_id, customQuestion);
  
  if (!fileAnalysis) {
    return {
      success: false,
      message: "I'm sorry, I couldn't analyze that document. The file may not be accessible or may not be in a supported format. Could you please try uploading it again or provide more details about what you'd like me to help you with?"
    };
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
  
  // Create a helpful response based on the analysis
  let response = `I've analyzed your ${analysis_type.replace('_', ' ')} and found some interesting insights. `;
  
  // Add document-specific response
  switch (analysis_type) {
    case 'resume':
      response += `${fileAnalysis.summary} Your background shows strong professional experience. `;
      response += `Based on what I see, I can help you with:\n`;
      response += `• Refining your resume for specific roles\n`;
      response += `• Highlighting your key achievements\n`;
      response += `• Emphasizing measurable results and impact\n`;
      response += `• Identifying areas for improvement\n\n`;
      response += `What specific role or industry would you like to target?`;
      break;
      
    case 'legal_document':
      response += `${fileAnalysis.summary} This appears to be a legal document with important terms. `;
      response += `Based on my analysis, I can help you with:\n`;
      response += `• Reviewing key terms and conditions\n`;
      response += `• Identifying potential issues or concerns\n`;
      response += `• Understanding your rights and obligations\n`;
      response += `• Preparing for negotiations if needed\n\n`;
      response += `What aspect of this document would you like me to focus on?`;
      break;
      
    case 'medical_document':
      response += `${fileAnalysis.summary} This medical document contains important health information. `;
      response += `Based on what I see, I can help you with:\n`;
      response += `• Understanding your medical condition and treatment plan\n`;
      response += `• Documenting expenses for insurance or legal purposes\n`;
      response += `• Tracking your recovery progress\n`;
      response += `• Exploring legal options if this involves an accident\n\n`;
      response += `Are you dealing with insurance claims or considering legal action?`;
      break;
      
    case 'image':
      response += `${fileAnalysis.summary} This image shows important visual information. `;
      response += `Based on my analysis, I can help you with:\n`;
      response += `• Understanding the legal implications of what's shown\n`;
      response += `• Documenting evidence for legal proceedings\n`;
      response += `• Identifying relevant details for your case\n`;
      response += `• Preparing documentation for insurance or legal claims\n\n`;
      response += `How does this image relate to your legal situation?`;
      break;
      
    default:
      response += `${fileAnalysis.summary} `;
      response += `Based on what I see, I can help you with:\n`;
      fileAnalysis.action_items.forEach(item => {
        response += `• ${item}\n`;
      });
      response += `\nWhat would you like to focus on?`;
  }
  
  console.log('=== FINAL ANALYSIS RESPONSE ===');
  console.log('Response:', response);
  console.log('Response Length:', response.length, 'characters');
  console.log('Response Type:', analysis_type);
  console.log('Response Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  console.log('==============================');
  
  return {
    success: true,
    message: response,
    analysis: fileAnalysis
  };
}

// New streaming version of the legal intake agent
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
    teamConfig = await getTeamConfig(env, teamId);
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Use shared utility function for location context and prompt construction
  const { locationContext, locationPrompt } = buildLocationContext(cloudflareLocation);

  let systemPrompt = `You are a legal intake specialist. Collect client information step by step. Help with ALL legal matters - do not reject any cases.`;

  // Add file information to system prompt if attachments are present
  if (attachments && attachments.length > 0) {
    systemPrompt += `\n\nThe user has uploaded files. Analyze them using the analyze_document tool before proceeding:
${attachments.map((file, index) => `${index + 1}. ${file.name} - File ID: ${file.url?.split('/').pop()?.split('.')[0] || 'unknown'}`).join('\n')}`;
  }

  systemPrompt += `

**CONVERSATION FLOW:**
1. If no name: "Can you please provide your full name?"
2. If name but no location: ${locationPrompt}
3. If name and location but no phone: "Thank you [name]! Now I need your phone number."
4. If name, location, and phone but no email: "Thank you [name]! Now I need your email address."
5. If name, location, phone, and email but no opposing party: "Thank you [name]! For legal matters, it's helpful to know if there's an opposing party involved. Who is the other party in this situation? (If none, you can say 'none' or 'not applicable')"
6. If ALL information collected: Call create_matter tool immediately.

**Available Tools:**
- create_matter: Use when you have all required information (name, location, phone, email, opposing party)
- analyze_document: Use when files are uploaded

**Example Tool Calls:**
TOOL_CALL: create_matter
PARAMETERS: {"matter_type": "Family Law", "description": "Client seeking legal assistance", "urgency": "medium", "name": "John Doe", "phone": "555-123-4567", "email": "john@example.com", "location": "Charlotte, NC", "opposing_party": "Jane Doe"}

TOOL_CALL: analyze_document
PARAMETERS: {"file_id": "file-abc123-def456", "analysis_type": "resume", "specific_question": "Analyze this resume for improvement opportunities"}

**DO NOT provide legal advice. Follow the conversation flow step by step.**`;

  try {
    console.log('🔄 Starting streaming agent...');
    
    // Send initial connection event
    controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    
    // Use streaming AI call
    console.log('🤖 Calling AI model...');
    
    // Use non-streaming AI call but simulate streaming
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
      console.log('🔧 Tool call detected in response');
      
      // Send typing indicator
      const typingEvent = `data: ${JSON.stringify({
        type: 'typing',
        text: 'Processing your request...'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(typingEvent));
      
      // Parse tool call
      const toolCallMatch = response.match(/TOOL_CALL:\s*(\w+)/);
      const parametersMatch = response.match(/PARAMETERS:\s*(\{[\s\S]*?\})/);
      
      if (toolCallMatch && parametersMatch) {
        const toolName = toolCallMatch[1].toLowerCase();
        let parameters;
        try {
          parameters = JSON.parse(parametersMatch[1]);
          console.log(`🔧 Tool: ${toolName}, Parameters:`, parameters);
        } catch (error) {
          console.error('❌ Failed to parse tool parameters:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to parse tool parameters'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          return;
        }
        
        // Send tool call event
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          toolName: toolName,
          parameters: parameters
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(toolEvent));
        
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
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              message: `Unknown tool: ${toolName}`
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            return;
          }
          
          // Send tool result
          const resultEvent = `data: ${JSON.stringify({
            type: 'tool_result',
            toolName: toolName,
            result: toolResult
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(resultEvent));
          
          // If tool was successful and created a matter, trigger lawyer approval
          if (toolResult.success && toolName === 'create_matter') {
            await handleLawyerApproval(env, {
              matter_type: parameters.matter_type,
              urgency: parameters.urgency,
              client_message: formattedMessages[formattedMessages.length - 1]?.content || '',
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
          
          // Return after tool execution - don't continue with fallback or regular response
          return;
        }
      }
      
      // If no tool call detected, stream the regular response
      console.log('📝 No tool call detected, streaming regular response');
      
      // Simulate streaming by sending response in chunks
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
    } catch (error) {
      console.error('❌ Streaming error:', error);
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: 'An error occurred while processing your request'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      controller.close();
    }
  }