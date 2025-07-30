// Tool definitions with structured schemas
export const collectContactInfo = {
  name: 'collect_contact_info',
  description: 'Collect and validate client contact information',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Client full name' },
      phone: { type: 'string', description: 'Client phone number' },
      email: { type: 'string', description: 'Client email address' }
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

export const verifyJurisdiction = {
  name: 'verify_jurisdiction',
  description: 'Verify if the user is in a supported jurisdiction for legal services',
  parameters: {
    type: 'object',
    properties: {
      user_location: { 
        type: 'string', 
        description: 'User location (state, city, or country)',
        examples: ['North Carolina', 'NC', 'Charlotte, NC', 'United States', 'US']
      },
      user_state: { 
        type: 'string', 
        description: 'User state (if known)',
        examples: ['NC', 'California', 'CA']
      },
      user_country: { 
        type: 'string', 
        description: 'User country (if known)',
        examples: ['US', 'United States', 'Canada']
      }
    },
    required: ['user_location']
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
  schedule_consultation: handleScheduleConsultation,
  verify_jurisdiction: handleVerifyJurisdiction
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

  const systemPrompt = `You are a professional legal intake assistant for North Carolina Legal Services. Your role is to:

1. **Collect Essential Information Step-by-Step**: Gather information gradually to avoid overwhelming the client:
   - First: Name
   - Second: Phone number
   - Third: Email address
   - Fourth: Matter details (if not already provided)
   - Fifth: Opposing party (if relevant)

2. **Classify the Matter**: Determine the appropriate legal matter type and urgency level based on the client's description.

3. **Handle the Flow**: 
   - If information is missing, ask for it politely and directly
   - If all information is collected, create the matter using the create_matter tool
   - For urgent or complex matters, request lawyer review
   - Offer consultation scheduling when appropriate

4. **Be Empathetic**: Legal issues can be stressful. Be understanding and supportive while maintaining professionalism.

5. **Avoid Repetition**: Don't ask for information that has already been provided. If the client expresses frustration about repetition, acknowledge it and move forward.

**Matter Classification Guidelines:**
- Family Law: divorce, custody, child support, family disputes
- Employment Law: workplace issues, termination, discrimination, harassment
- Personal Injury: accidents, injuries, property damage
- Civil Law: disputes, contracts, property issues
- Criminal Law: charges, arrests, violations, trials
- General Consultation: general legal questions or unclear situations

**Urgency Guidelines:**
- Low: General questions, non-urgent matters
- Medium: Standard legal issues with some time sensitivity
- High: Urgent matters requiring prompt attention
- Urgent: Immediate legal threats, arrests, emergency situations, ongoing trials

**Important Rules:**
- Ask for ONE piece of information at a time
- Acknowledge when information is provided
- If client expresses frustration, acknowledge it and move forward
- Don't repeat questions that have already been answered
- Be concise and direct in your responses
- Focus on essential information only (name, contact, matter description)
- NEVER ask for information that has already been provided in the conversation
- ALWAYS collect BOTH phone AND email when possible
- Ask for opposing party information when relevant

**Step-by-Step Information Collection:**
1. **Name**: "Can you please provide your full name?"
2. **Phone**: "Thank you [name]! Now I need your phone number."
3. **Email**: "Thank you! Now I need your email address."
4. **Matter Details**: "Now I need to understand your legal situation. Can you briefly describe what happened?"
5. **Opposing Party**: "Who is the opposing party in your case?" (if relevant)

**Tool Usage Guidelines:**
- Use verify_jurisdiction when the client mentions their location or you need to confirm they're in a supported area
- Use collect_contact_info when you have a name but need contact info (phone/email)
- Use create_matter when you have ALL required information: name, contact info, AND matter description
- Use request_lawyer_review for urgent or complex matters
- Use schedule_consultation when client wants to schedule

**IMPORTANT: Check the conversation history carefully!**
- If the client mentioned their legal issue in an earlier message, you already have the matter description
- If the client provided their name in an earlier message, you already have their name
- If the client provided contact info in an earlier message, you already have their contact info
- Only ask for information that hasn't been provided yet
- If the client says "i already told you" or expresses frustration, acknowledge it and proceed with what you have

**Information Collection Priority:**
1. Jurisdiction verification (if location mentioned or needed)
2. Name (if not provided)
3. Phone number (if not provided)
4. Email address (if not provided)
5. Matter description (if not provided)
6. Opposing party information (if relevant)

**CRITICAL: When to call create_matter tool**
You MUST call the create_matter tool when you have:
- Client's full name
- Client's phone number
- Client's email address (if available)
- Matter description (from their initial message or subsequent messages)

**IMPORTANT: The client's initial message often contains the matter description. For example:**
- "hello i got caught downloading porn onmy work laptop and got fired" → Employment Law matter about termination
- "i need help with my divorce" → Family Law matter about divorce
- "i was in a car accident" → Personal Injury matter about car accident

**When you have name, phone, and email, AND the client mentioned their legal issue in any message, call create_matter immediately.**

**EXAMPLES OF WHEN TO CALL create_matter:**

Example 1:
- Client: "hello i got caught downloading porn onmy work laptop and got fired"
- Assistant: "Can you please provide your full name?"
- Client: "my name is john smith"
- Assistant: "Thank you John! Now I need your phone number."
- Client: "555-123-4567"
- Assistant: "Thank you! Now I need your email address."
- Client: "john@example.com"
- Assistant: **CALL create_matter NOW** with:
  - matter_type: "Employment Law"
  - description: "Terminated for downloading porn on work laptop"
  - urgency: "high"
  - name: "john smith"
  - phone: "555-123-4567"
  - email: "john@example.com"
  - opposing_party: ""

Example 2:
- Client: "i need help with my divorce"
- Assistant: "Can you please provide your full name?"
- Client: "my name is jane doe"
- Assistant: "Thank you Jane! Now I need your phone number."
- Client: "555-987-6543"
- Assistant: "Thank you! Now I need your email address."
- Client: "jane@example.com"
- Assistant: **CALL create_matter NOW** with:
  - matter_type: "Family Law"
  - description: "Divorce"
  - urgency: "medium"
  - name: "jane doe"
  - phone: "555-987-6543"
  - email: "jane@example.com"
  - opposing_party: ""

**DO NOT ask for additional information if you have name, phone, email, and the client mentioned their legal issue. Call create_matter immediately.**

**SPECIFIC INSTRUCTION FOR EMPLOYMENT TERMINATION CASES:**
If a client says they were fired or terminated, and you have their name, phone, and email, call create_matter immediately with:
- matter_type: "Employment Law"
- description: "Terminated from employment"
- urgency: "high"
- name: [client's name]
- phone: [client's phone]
- email: [client's email]
- opposing_party: ""

**CRITICAL: The client's initial message contains the matter description. You do NOT need to ask for it again.**

**Example:**
Client: "hello i got caught downloading porn onmy work laptop and got fired"
→ This is an Employment Law matter about termination
→ When you have name, phone, and email, call create_matter with description: "Terminated for downloading porn on work laptop"

**DO NOT ask the client to repeat their legal issue. Use the description from their initial message.**

**SPECIFIC SCENARIO:**
If the client's first message is "hello i got caught downloading porn onmy work laptop and got fired" and you have their name, phone, and email, call create_matter immediately with:
- matter_type: "Employment Law"
- description: "Terminated for downloading porn on work laptop"
- urgency: "high"
- name: [client's name]
- phone: [client's phone]
- email: [client's email]
- opposing_party: ""

**DO NOT ask for additional information in this scenario. Call create_matter immediately.**

**SPECIFIC INSTRUCTION FOR DIVORCE CASES:**
If a client says they need help with divorce, and you have their name, phone, and email, call create_matter immediately with:
- matter_type: "Family Law"
- description: "Divorce"
- urgency: "medium"
- name: [client's name]
- phone: [client's phone]
- email: [client's email]
- opposing_party: ""

**SPECIFIC INSTRUCTION FOR PERSONAL INJURY CASES:**
If a client mentions an accident or injury, and you have their name, phone, and email, call create_matter immediately with:
- matter_type: "Personal Injury"
- description: [brief description of the accident/injury]
- urgency: "high"
- name: [client's name]
- phone: [client's phone]
- email: [client's email]
- opposing_party: ""

You do NOT need to ask for opposing party information if the client hasn't provided it. You can create the matter with the information you have.

**When calling create_matter, you MUST provide these parameters:**
- matter_type: The type of legal matter (Family Law, Employment Law, Personal Injury, Criminal Law, etc.)
- description: A brief description of the legal issue
- urgency: The urgency level (low, medium, high, urgent)
- name: The client's name
- phone: The client's phone number
- email: The client's email address (if available)
- opposing_party: The name of the opposing party (if provided, otherwise empty string)

**IMPORTANT: If the client provided their legal issue in their initial message, you already have the matter description. Do not ask for it again.**

**Response Format:**
If you need to call a tool, respond with:
TOOL_CALL: tool_name
PARAMETERS: {"param1": "value1", "param2": "value2"}

Otherwise, respond naturally to the client.

**Example Flow:**
Client: "hello i got caught downloading porn onmy work laptop and got fired"
Assistant: "I'm so sorry to hear that you're going through this. Being fired can be really stressful and overwhelming. Can you please provide your full name?"

Client: "my name is john smith"
Assistant: "Thank you John! Now I need your phone number."

Client: "555-123-4567"
Assistant: "Thank you! Now I need your email address."

Client: "john@example.com"
Assistant: "Perfect! I have all the information I need. Here's a summary of your matter..."

**DO NOT overwhelm the user with multiple questions at once. Ask for ONE piece of information at a time.**`;

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
            response: responseText || "I'm processing your request.",
            metadata: {
              error: `Unknown tool: ${toolName}`,
              toolName,
              parameters,
              sessionId,
              teamId
            }
          };
        }
        
        try {
          const toolResult = await handler(parameters, env, teamConfig);
          
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
            response: responseText || "I'm processing your request.",
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
  const { name, phone, email } = parameters;
  
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
    data: { name, phone, email }
  };
}

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any) {
  const { matter_type, description, urgency, name, phone, email, opposing_party } = parameters;
  
  if (!matter_type || !description || !urgency || !name) {
    return { 
      success: false, 
      message: "I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?" 
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
  
  let summaryMessage = `Perfect! I have all the information I need. Here's a summary of your matter:

**Client Information:**
- Name: ${name}
- Contact: ${phone || 'Not provided'}${email ? `, ${email}` : ''}`;

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
    summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using this link: ${paymentLink}
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
  } else {
    summaryMessage += `

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation.`;
  }
  
  return {
    success: true,
    message: summaryMessage,
    data: {
      matter_type,
      description,
      urgency,
      opposing_party: opposing_party || '',
      estimated_value: 0,
      requires_payment: requiresPayment,
      consultation_fee: consultationFee,
      payment_link: paymentLink
    }
  };
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

export async function handleVerifyJurisdiction(parameters: any, env: any, teamConfig: any) {
  const { user_location, user_state, user_country } = parameters;
  
  // Get jurisdiction information from team config
  const jurisdiction = teamConfig?.config?.jurisdiction;
  
  if (!jurisdiction) {
    return {
      success: true,
      message: "I can help you with your legal matter. Let me collect some information to get started.",
      data: {
        jurisdiction_verified: true,
        supported: true,
        reason: "No jurisdiction restrictions configured"
      }
    };
  }
  
  // Normalize location input
  const location = (user_location || '').toLowerCase();
  const state = (user_state || '').toLowerCase();
  const country = (user_country || '').toLowerCase();
  
  // Check if it's a national service
  if (jurisdiction.type === 'national' && jurisdiction.supportedCountries.includes('US')) {
    return {
      success: true,
      message: "Great! I can help you with your legal matter. We provide services nationwide.",
      data: {
        jurisdiction_verified: true,
        supported: true,
        reason: "National service available"
      }
    };
  }
  
  // Check for state-specific service
  if (jurisdiction.type === 'state') {
    const supportedStates = jurisdiction.supportedStates.map((s: string) => s.toLowerCase());
    const primaryState = jurisdiction.primaryState?.toLowerCase();
    
    // Check if user is in supported state
    const isSupported = supportedStates.includes('all') || 
                       supportedStates.some(s => location.includes(s) || state.includes(s)) ||
                       (primaryState && (location.includes(primaryState) || state.includes(primaryState)));
    
    if (isSupported) {
      return {
        success: true,
        message: `Perfect! I can help you with your legal matter. We provide services in ${jurisdiction.description}.`,
        data: {
          jurisdiction_verified: true,
          supported: true,
          reason: `Supported state: ${jurisdiction.primaryState || jurisdiction.supportedStates.join(', ')}`
        }
      };
    } else {
      return {
        success: false,
        message: `I'm sorry, but we currently only provide legal services in ${jurisdiction.description}. We cannot assist with legal matters outside of our service area. Please contact a local attorney in your area for assistance.`,
        data: {
          jurisdiction_verified: true,
          supported: false,
          reason: `Not in supported jurisdiction: ${jurisdiction.supportedStates.join(', ')}`
        }
      };
    }
  }
  
  // Default response for unknown jurisdiction types
  return {
    success: true,
    message: "I can help you with your legal matter. Let me collect some information to get started.",
    data: {
      jurisdiction_verified: true,
      supported: true,
      reason: "Jurisdiction verification completed"
    }
  };
} 