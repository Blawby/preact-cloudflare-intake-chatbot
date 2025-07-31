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



// Helper function to get team configuration
async function getTeamConfig(env: any, teamId: string) {
  try {
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    console.log('Retrieving team config for teamId:', teamId);
    const teamConfig = await aiService.getTeamConfig(teamId);
    console.log('Retrieved team config:', JSON.stringify(teamConfig, null, 2));
    return teamConfig;
  } catch (error) {
    console.warn('Failed to get team config:', error);
    return {
      config: {
        requiresPayment: false,
        consultationFee: 0,
        paymentLink: null
      }
    };
  }
}

// Tool handlers mapping
export const TOOL_HANDLERS = {
  collect_contact_info: handleCollectContactInfo,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  schedule_consultation: handleScheduleConsultation
};

// Simple validation functions
const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  // Remove all non-digits for validation
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

const validateName = (name: string): boolean => {
  if (!name) return false;
  const trimmedName = name.trim();
  return trimmedName.length >= 2 && trimmedName.length <= 100;
};

const validateLocation = (location: string): boolean => {
  if (!location) return false;
  const trimmedLocation = location.trim();
  return trimmedLocation.length >= 2 && trimmedLocation.length <= 100;
};

// Create the legal intake agent using native Cloudflare AI
export async function runLegalIntakeAgent(env: any, messages: any[], teamId?: string, sessionId?: string) {
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

  const systemPrompt = `You are a legal intake specialist. Your job is to collect client information step by step.

**IMPORTANT: You help with ALL legal matters including sensitive ones like sexual harassment, criminal charges, divorce, etc. Do NOT reject any cases. Proceed with intake for every legal matter.**

**CONVERSATION FLOW - Follow exactly:**
1. If no name provided: "Can you please provide your full name?"
2. If name provided but no location: "Can you please tell me your city and state?"
3. If name and location provided but no phone: "Thank you [name]! Now I need your phone number."
4. If name, location, and phone provided but no email: "Thank you! Now I need your email address."
5. If ALL information collected (name, location, phone, email): Call create_matter tool immediately.

**Available Tools:**
- create_matter: Use when you have all required information (name, location, phone, email)

**Example Tool Call:**
TOOL_CALL: create_matter
PARAMETERS: {
  "matter_type": "Employment Law",
  "description": "Client involved in workplace dispute",
  "urgency": "medium",
  "name": "John Doe",
  "phone": "555-123-4567",
  "email": "john@example.com",
  "location": "Charlotte, NC",
  "opposing_party": ""
}

**DO NOT provide legal advice or reject cases. Follow the conversation flow step by step.**`;

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
  if (phone && !validatePhone(phone)) {
    return { 
      success: false, 
      message: "The phone number you provided doesn't appear to be valid. Could you please provide a valid phone number?" 
    };
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
    if (jurisdiction) {
      const locationLower = location.toLowerCase();
      const stateLower = locationLower.includes('nc') || locationLower.includes('north carolina') ? 'nc' : '';
      
      // Check if it's a national service
      if (jurisdiction.type === 'national' && jurisdiction.supportedCountries.includes('US')) {
        // National service - accept all US locations
      } else if (jurisdiction.type === 'state') {
        const supportedStates = jurisdiction.supportedStates.map((s: string) => s.toLowerCase());
        const primaryState = jurisdiction.primaryState?.toLowerCase();
        
        const isSupported = supportedStates.includes('all') || 
                           supportedStates.some(s => locationLower.includes(s)) ||
                           (primaryState && locationLower.includes(primaryState));
        
        if (!isSupported) {
          return {
            success: false,
            message: `I'm sorry, but we currently only provide legal services in ${jurisdiction.description}. We cannot assist with legal matters outside of our service area. Please contact a local attorney in your area for assistance.`
          };
        }
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
  if (phone && !validatePhone(phone)) {
    return { 
      success: false, 
      message: "The phone number you provided doesn't appear to be valid. Could you please provide a valid phone number?" 
    };
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
      // Use Blawby API service if configured, otherwise fallback to mock service
      const useBlawbyApi = env.BLAWBY_API_TOKEN && env.BLAWBY_API_URL;
      
      if (useBlawbyApi) {
        const { BlawbyPaymentService } = await import('../services/BlawbyPaymentService.js');
        const paymentService = new BlawbyPaymentService();
        
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
          teamId: teamConfig?.id || 'default',
          sessionId: 'session-' + Date.now()
        };
        
        const paymentResult = await paymentService.createInvoice(paymentRequest);
        
        if (paymentResult.success) {
          invoiceUrl = paymentResult.invoiceUrl;
          paymentId = paymentResult.paymentId;
          console.log('✅ Blawby API invoice created successfully:', { invoiceUrl, paymentId });
        } else {
          console.error('❌ Blawby API failed to create invoice:', paymentResult.error);
          // Fallback to mock service
          const { MockPaymentService } = await import('../services/MockPaymentService.js');
          const mockPaymentService = new MockPaymentService(env);
          const mockResult = await mockPaymentService.createInvoice(paymentRequest);
          if (mockResult.success) {
            invoiceUrl = mockResult.invoiceUrl;
            paymentId = mockResult.paymentId;
            console.log('✅ Fallback mock invoice created successfully:', { invoiceUrl, paymentId });
          }
        }
      } else {
        // Use mock service for development
        const { MockPaymentService } = await import('../services/MockPaymentService.js');
        const paymentService = new MockPaymentService(env);
      
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
          teamId: teamConfig?.id || 'default',
          sessionId: 'session-' + Date.now()
        };
        
        const paymentResult = await paymentService.createInvoice(paymentRequest);
        
        if (paymentResult.success) {
          invoiceUrl = paymentResult.invoiceUrl;
          paymentId = paymentResult.paymentId;
          console.log('✅ Mock invoice created successfully:', { invoiceUrl, paymentId });
        } else {
          console.error('❌ Failed to create mock invoice:', paymentResult.error);
        }
    } catch (error) {
      console.error('❌ Payment service error:', error);
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
1. Please complete the payment using this link: ${invoiceUrl}
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
      payment_link: paymentLink
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

// New streaming version of the legal intake agent
export async function runLegalIntakeAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  controller?: ReadableStreamDefaultController
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

  const systemPrompt = `You are a legal intake specialist. Your job is to collect client information step by step.

**IMPORTANT: You help with ALL legal matters including sensitive ones like sexual harassment, criminal charges, divorce, etc. Do NOT reject any cases. Proceed with intake for every legal matter.**

**CONVERSATION FLOW - Follow exactly:**
1. If no name provided: "Can you please provide your full name?"
2. If name provided but no location: "Can you please tell me your city and state?"
3. If name and location provided but no phone: "Thank you [name]! Now I need your phone number."
4. If name, location, and phone provided but no email: "Thank you! Now I need your email address."
5. If ALL information collected (name, location, phone, email): Call create_matter tool immediately.

**Available Tools:**
- create_matter: Use when you have all required information (name, location, phone, email)

**Example Tool Call:**
TOOL_CALL: create_matter
PARAMETERS: {
  "matter_type": "Employment Law",
  "description": "Client involved in workplace dispute",
  "urgency": "medium",
  "name": "John Doe",
  "phone": "555-123-4567",
  "email": "john@example.com",
  "location": "Charlotte, NC",
  "opposing_party": ""
}

**DO NOT provide legal advice or reject cases. Follow the conversation flow step by step.**`;

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

 