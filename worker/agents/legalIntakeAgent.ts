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
export async function runLegalIntakeAgent(env: any, messages: any[], teamId?: string, sessionId?: string, language?: string) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    teamConfig = await getTeamConfig(env, teamId);
  }

  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
  // Detect language if not provided
  let detectedLanguage = language || 'en';
  if (!language && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.isUser) {
      detectedLanguage = TranslationService.detectLanguage(lastMessage.content);
    }
  }
  
  // Validate language is supported
  if (!TranslationService.isLanguageSupported(detectedLanguage)) {
    detectedLanguage = 'en';
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Get localized system prompt
  const systemPrompt = TranslationService.getSystemPrompt(detectedLanguage);

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
    
    // Check if the response contains a tool call
    if (response.includes('TOOL_CALL:')) {
      const toolCallMatch = response.match(/TOOL_CALL:\s*(\w+)/);
      const parametersMatch = response.match(/PARAMETERS:\s*(\{.*\})/);
      
      if (toolCallMatch && parametersMatch) {
        const toolName = toolCallMatch[1].toLowerCase(); // Normalize tool name
        let parameters;
        try {
          parameters = JSON.parse(parametersMatch[1]);
        } catch (error) {
          console.error('Failed to parse tool parameters:', error);
          return {
            response: response.trim(),
            metadata: {
              error: 'Failed to parse tool parameters',
              originalResponse: response,
              sessionId,
              teamId
            }
          };
        }
        
        // Extract the response text (everything before TOOL_CALL)
        const responseText = response.split('TOOL_CALL:')[0].trim();
        
        // Execute the tool handler
        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
          console.warn(`Unknown tool called: ${toolName}`);
          return {
            response: responseText || TranslationService.getTranslation('processingError', detectedLanguage),
            metadata: {
              error: TranslationService.getTranslation('unknownTool', detectedLanguage, { toolName }),
              toolName,
              parameters,
              sessionId,
              teamId
            }
          };
        }
        
        try {
          const toolResult = await handler(parameters, env, teamConfig, detectedLanguage);
          
          // If tool was successful and created a matter, trigger lawyer approval
          if (toolResult.success && toolName === 'create_matter') {
            // Trigger lawyer approval if matter was created
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
          
          return {
            toolCalls: [{
              name: toolName,
              parameters
            }],
            response: toolResult.message || responseText || "I'm processing your request.",
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
        } catch (error) {
          console.error('Error executing tool handler:', error);
          return {
            response: responseText || TranslationService.getTranslation('processingError', detectedLanguage),
            metadata: {
              error: error.message,
              toolName,
              parameters,
              sessionId,
              teamId
            }
          };
        }
      }
    }
    
    return {
      response: response.trim(),
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
      response: TranslationService.getTranslation('generalError', detectedLanguage),
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
export async function handleCollectContactInfo(parameters: any, env: any, teamConfig: any, language: string = 'en') {
  const { name, phone, email, location } = parameters;
  
  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
  // Validate name if provided
  if (name && !validateName(name)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidName', language)
    };
  }
  
  // Validate email if provided
  if (email && !validateEmail(email)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidEmail', language)
    };
  }
  
  // Validate phone if provided
  if (phone && !validatePhone(phone)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidPhone', language)
    };
  }
  
  // Validate location if provided
  if (location && !validateLocation(location)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidLocation', language)
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
            message: TranslationService.getTranslation('jurisdictionNotSupported', language, { jurisdiction: jurisdiction.description })
          };
        }
      }
    }
  }
  
  if (!name) {
    return { success: false, message: TranslationService.getTranslation('invalidName', language) };
  }
  
  // Check if we have both phone and email
  if (!phone && !email) {
    return { success: false, message: TranslationService.getTranslation('missingContactInfo', language) };
  }
  
  if (!phone) {
    return { success: false, message: TranslationService.getTranslation('missingPhone', language, { name }) };
  }
  
  if (!email) {
    return { success: false, message: TranslationService.getTranslation('missingEmail', language, { name }) };
  }
  
  return { 
    success: true, 
    message: TranslationService.getTranslation('askMatterDetails', language),
    data: { name, phone, email, location }
  };
}

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any, language: string = 'en') {
  const { matter_type, description, urgency, name, phone, email, location, opposing_party } = parameters;
  
  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
  // Validate required fields
  if (!matter_type || !description || !urgency || !name) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('generalError', language)
    };
  }
  
  // Validate name format
  if (!validateName(name)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidName', language)
    };
  }
  
  // Validate email if provided
  if (email && !validateEmail(email)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidEmail', language)
    };
  }
  
  // Validate phone if provided
  if (phone && !validatePhone(phone)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidPhone', language)
    };
  }
  
  // Validate location if provided
  if (location && !validateLocation(location)) {
    return { 
      success: false, 
      message: TranslationService.getTranslation('invalidLocation', language)
    };
  }
  
  if (!phone && !email) {
    return {
      success: false,
      message: TranslationService.getTranslation('missingContactInfo', language)
    };
  }
  
  // Check if payment is required
  const requiresPayment = teamConfig?.config?.requiresPayment || false;
  const consultationFee = teamConfig?.config?.consultationFee || 0;
  const paymentLink = teamConfig?.config?.paymentLink || null;
  
  // Translate matter type and urgency
  const translatedMatterType = TranslationService.translateMatterType(matter_type, language);
  const translatedUrgency = TranslationService.translateUrgency(urgency, language);
  
  let summaryMessage = TranslationService.getTranslation('matterCreated', language);

  summaryMessage += `

**Client Information:**
- Name: ${name}
- Contact: ${phone || 'Not provided'}${email ? `, ${email}` : ''}${location ? `, ${location}` : ''}`;

  if (opposing_party) {
    summaryMessage += `
- Opposing Party: ${opposing_party}`;
  }

  summaryMessage += `

**Matter Details:**
- Type: ${translatedMatterType}
- Description: ${description}
- Urgency: ${translatedUrgency}`;

  if (requiresPayment && consultationFee > 0) {
    summaryMessage += `

${TranslationService.getTranslation('matterCreatedWithPayment', language, { fee: consultationFee.toString() })}

**Next Steps:**
1. ${TranslationService.getTranslation('paymentInstructions', language, { paymentLink })}
2. ${TranslationService.getTranslation('nextSteps', language)}

${TranslationService.getTranslation('paymentInstructions', language, { paymentLink })}`;
  } else {
    summaryMessage += `

${TranslationService.getTranslation('nextSteps', language)}`;
  }
  
  return {
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
}

export async function handleRequestLawyerReview(parameters: any, env: any, teamConfig: any, language: string = 'en') {
  const { urgency, complexity, matter_type } = parameters;
  
  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
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
    message: TranslationService.getTranslation('lawyerReviewRequested', language)
  };
}

export async function handleScheduleConsultation(parameters: any, env: any, teamConfig: any, language: string = 'en') {
  const { preferred_date, preferred_time, matter_type } = parameters;
  
  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
  return {
    success: true,
    message: TranslationService.getTranslation('scheduleConsultation', language, { matterType: matter_type })
  };
}

// New streaming version of the legal intake agent
export async function runLegalIntakeAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  controller?: ReadableStreamDefaultController,
  language?: string
) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    teamConfig = await getTeamConfig(env, teamId);
  }

  // Import translation service
  const { TranslationService } = await import('../services/TranslationService.js');
  
  // Detect language if not provided
  let detectedLanguage = language || 'en';
  if (!language && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.isUser) {
      detectedLanguage = TranslationService.detectLanguage(lastMessage.content);
    }
  }
  
  // Validate language is supported
  if (!TranslationService.isLanguageSupported(detectedLanguage)) {
    detectedLanguage = 'en';
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Get localized system prompt
  const systemPrompt = TranslationService.getSystemPrompt(detectedLanguage);

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
      const parametersMatch = response.match(/PARAMETERS:\s*(\{.*\})/);
      
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
        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
          console.warn(`❌ Unknown tool: ${toolName}`);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: `Unknown tool: ${toolName}`
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          return;
        }
        
        try {
          console.log(`🔧 Executing tool: ${toolName}`);
          const toolResult = await handler(parameters, env, teamConfig);
          
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
        } catch (error) {
          console.error('❌ Error executing tool:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Error executing tool'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
        }
      }
    } else {
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
    }
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

 