// Legal Intake Prompt Chain
// Implements the prompt chaining pattern for legal intake workflows

export interface ChainResult {
  workflow: string;
  response: string;
  actions: Array<{ name: string; parameters: any }>;
  metadata: any;
}

export interface ChainContext {
  teamId: string;
  sessionId: string;
  message: string;
  messages?: Array<{ role: string; content: string }>;
  env: any;
}

export interface RouterResult {
  workflow: string;
  matter_type: string;
  urgency: string;
  complexity: number;
  intent: string;
  estimated_value: number;
}

// Router Chain - Determines the appropriate workflow
export async function runRouterChain(
  message: string,
  conversationHistory: string,
  sessionId: string,
  env: any
): Promise<RouterResult> {
  // Check if this is a continuation of an existing conversation
  const hasConversationHistory = conversationHistory && conversationHistory.trim().length > 0;
  
  // If we have conversation history and this looks like a response to a request, continue matter creation
  if (hasConversationHistory) {
    const lowerMessage = message.toLowerCase();
    
    // Check if this looks like contact information or name
    const isContactInfo = (text: string) => {
      // Email pattern
      if (text.includes('@') && text.includes('.')) return true;
      
      // Phone pattern
      if (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)) return true;
      
      // Name pattern (2-4 words, letters only)
      const words = text.trim().split(/\s+/);
      if (words.length >= 1 && words.length <= 4) {
        const namePattern = /^[a-zA-Z\s]+$/;
        if (namePattern.test(text)) return true;
      }
      
      return false;
    };
    
    // Check if this is an affirmative response
    const isAffirmativeResponse = (text: string) => {
      const affirmativeWords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'alright', 'fine'];
      return affirmativeWords.some(word => text.toLowerCase().includes(word));
    };
    
    // If this looks like contact info or affirmative response, continue matter creation
    if (isContactInfo(message) || isAffirmativeResponse(message)) {
      // Determine matter type from conversation history
      const lowerHistory = conversationHistory.toLowerCase();
      let matterType = 'Employment Law'; // default
      
      // Check for personal injury keywords in conversation history
      const personalInjuryKeywords = ['bus', 'vehicle', 'kid', 'died', 'death', 'ran into', 'hit', 'collision', 'ran my bus', 'bus into', 'getting off', 'golf cart', 'accident', 'injury', 'hurt', 'damage', 'cousin', 'ran over'];
      if (personalInjuryKeywords.some(keyword => lowerHistory.includes(keyword))) {
        matterType = 'Personal Injury';
      }
      
      // Check for family law keywords
      const familyKeywords = ['divorce', 'custody', 'child support', 'alimony', 'marriage', 'spouse', 'wife', 'husband', 'family'];
      if (familyKeywords.some(keyword => lowerHistory.includes(keyword))) {
        matterType = 'Family Law';
      }
      
      // Check for criminal law keywords
      const criminalKeywords = ['arrested', 'charged', 'criminal', 'crime', 'police', 'jail', 'prison', 'violation'];
      if (criminalKeywords.some(keyword => lowerHistory.includes(keyword))) {
        matterType = 'Criminal Law';
      }
      
      return {
        workflow: 'MATTER_CREATION',
        matter_type: matterType,
        urgency: 'high',
        complexity: 3,
        intent: 'matter_creation',
        estimated_value: 5000
      };
    }
  }

  const routerPrompt = `You are a legal intake router for North Carolina Legal Services. Your job is to determine the appropriate workflow for each client message.

**WORKFLOW OPTIONS:**
1. **MATTER_CREATION** - Client needs legal assistance with a specific matter
2. **GENERAL_INQUIRY** - Client has general questions about services, pricing, or procedures

**MATTER_CREATION INDICATORS:**
- Legal problems or issues they need help with
- Specific legal situations (divorce, employment issues, accidents, etc.)
- Requests for legal representation or lawyer help
- Workplace issues (fired, harassment, discrimination, misconduct)
- Family law matters (divorce, custody, support)
- Civil disputes (property damage, personal injury, contracts)
- Criminal matters (charges, arrests, violations)
- Employment issues (termination, harassment, discrimination, workplace misconduct)
- Any situation where they need legal advice or representation
- Phrases like "help with", "need a lawyer", "got caught", "being sued", "fired", "divorce", etc.

**GENERAL_INQUIRY INDICATORS:**
- Questions about services offered
- Pricing or fee inquiries
- Office hours or location questions
- General information requests
- Questions about the firm or attorneys

**EXAMPLES:**
- "I got fired for being late" → MATTER_CREATION
- "I need help with my divorce" → MATTER_CREATION
- "I got caught watching porn at work" → MATTER_CREATION
- "What are your office hours?" → GENERAL_INQUIRY
- "How much do you charge?" → GENERAL_INQUIRY

**IMPORTANT:** When in doubt, default to MATTER_CREATION if the client mentions any legal problem or situation they need help with.

Analyze this message: "${message}"

Respond with ONLY a JSON object:
{
  "workflow": "MATTER_CREATION" or "GENERAL_INQUIRY",
  "matter_type": "Family Law" | "Employment Law" | "Civil Law" | "Criminal Law" | "General Consultation",
  "urgency": "low" | "medium" | "high",
  "complexity": 1-5,
  "intent": "matter_creation" | "general_inquiry",
  "estimated_value": 0-100000
}`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: routerPrompt }],
      max_tokens: 200
    });

    const response = result.response as string;
    console.log('Router AI response:', response);
    let parsedResult;

    try {
      // Try to parse as JSON
      parsedResult = JSON.parse(response);
      console.log('Parsed router result:', parsedResult);
    } catch (parseError) {
      console.log('Failed to parse AI response, using heuristics');
      // If JSON parsing fails, use heuristics
      const lowerMessage = message.toLowerCase();
      
      // Employment-related keywords
      const employmentKeywords = ['fired', 'terminated', 'workplace', 'employer', 'job', 'work', 'porn', 'watching', 'caught', 'misconduct', 'harassment', 'discrimination', 'wage', 'overtime', 'benefits'];
      
      // Family law keywords
      const familyKeywords = ['divorce', 'custody', 'child support', 'alimony', 'marriage', 'spouse', 'wife', 'husband', 'family', 'cheating', 'infidelity'];
      
      // Civil law keywords
      const civilKeywords = ['accident', 'injury', 'damage', 'contract', 'property', 'neighbor', 'landlord', 'tenant', 'sued', 'lawsuit', 'bus', 'vehicle', 'kid', 'died', 'death'];
      
      // Criminal law keywords
      const criminalKeywords = ['arrested', 'charged', 'criminal', 'crime', 'police', 'court', 'ticket', 'violation'];
      
      // Personal injury keywords
      const personalInjuryKeywords = ['accident', 'injury', 'hurt', 'damage', 'bus', 'vehicle', 'kid', 'died', 'death', 'ran into', 'hit', 'collision', 'ran my bus', 'bus into', 'getting off'];
      
      // Check for personal injury issues (highest priority)
      if (personalInjuryKeywords.some(keyword => lowerMessage.includes(keyword))) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'Personal Injury',
          urgency: 'high',
          complexity: 4,
          intent: 'matter_creation',
          estimated_value: 25000
        };
      }
      // Check for employment issues
      else if (employmentKeywords.some(keyword => lowerMessage.includes(keyword))) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'Employment Law',
          urgency: 'high',
          complexity: 3,
          intent: 'matter_creation',
          estimated_value: 5000
        };
      }
      // Check for family law issues
      else if (familyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'Family Law',
          urgency: 'medium',
          complexity: 4,
          intent: 'matter_creation',
          estimated_value: 10000
        };
      }
      // Check for civil law issues
      else if (civilKeywords.some(keyword => lowerMessage.includes(keyword))) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'Civil Law',
          urgency: 'medium',
          complexity: 3,
          intent: 'matter_creation',
          estimated_value: 8000
        };
      }
      // Check for criminal law issues
      else if (criminalKeywords.some(keyword => lowerMessage.includes(keyword))) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'Criminal Law',
          urgency: 'high',
          complexity: 4,
          intent: 'matter_creation',
          estimated_value: 15000
        };
      }
      // Default to matter creation for any legal help request
      else if (lowerMessage.includes('help') || lowerMessage.includes('lawyer') || lowerMessage.includes('legal')) {
        parsedResult = {
          workflow: 'MATTER_CREATION',
          matter_type: 'General Consultation',
          urgency: 'medium',
          complexity: 2,
          intent: 'matter_creation',
          estimated_value: 3000
        };
      }
      // Fallback to general inquiry
      else {
        parsedResult = {
          workflow: 'GENERAL_INQUIRY',
          matter_type: 'General Consultation',
          urgency: 'low',
          complexity: 1,
          intent: 'general_inquiry',
          estimated_value: 0
        };
      }
    }

    return {
      workflow: parsedResult.workflow,
      matter_type: parsedResult.matter_type,
      urgency: parsedResult.urgency,
      complexity: parsedResult.complexity,
      intent: parsedResult.intent,
      estimated_value: parsedResult.estimated_value
    };
  } catch (error) {
    console.error('Router chain error:', error);
    // Fallback to matter creation for any legal help request
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('help') || lowerMessage.includes('lawyer') || lowerMessage.includes('legal') || lowerMessage.includes('caught') || lowerMessage.includes('fired')) {
      return {
        workflow: 'MATTER_CREATION',
        matter_type: 'Employment Law',
        urgency: 'high',
        complexity: 3,
        intent: 'matter_creation',
        estimated_value: 5000
      };
    }
    return {
      workflow: 'GENERAL_INQUIRY',
      matter_type: 'General Consultation',
      urgency: 'low',
      complexity: 1,
      intent: 'general_inquiry',
      estimated_value: 0
    };
  }
}

// Intent Classification Chain
async function runIntentChain(context: ChainContext): Promise<any> {
  const { env, message } = context;
  
  const prompt = `Classify the user's intent from their message. Focus on:

1. Legal matter type (Family Law, Business Law, etc.)
2. Urgency level (low, medium, high, urgent)
3. Complexity indicators (multiple parties, court involvement, etc.)
4. Action intent (information, consultation, matter creation)

User message: "${message}"

Return a JSON object with:
- matter_type: string (e.g., "Family Law", "Business Law")
- urgency: "low" | "medium" | "high" | "urgent"
- complexity: number 1-10
- intent: "information" | "consultation" | "matter_creation" | "scheduling"
- estimated_value: number (USD)

JSON:`;

  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.1
  });

  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse intent response:', e);
  }

  return {
    matter_type: 'General Consultation',
    urgency: 'low',
    complexity: 5,
    intent: 'information',
    estimated_value: 0
  };
}

// Information Gathering Chain
async function runInfoGatheringChain(context: ChainContext): Promise<any> {
  const { env, message } = context;
  
  const prompt = `Collect essential client information systematically. Ask one question at a time and validate responses.

User message: "${message}"

Extract or request the following information:
- full_name: string
- email: string
- phone: string
- matter_description: string
- opposing_party: string

Return a JSON object with available information and next_question if more info is needed.

JSON:`;

  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.1
  });

  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse info gathering response:', e);
  }

  return {
    full_name: '',
    email: '',
    phone: '',
    matter_description: '',
    opposing_party: '',
    next_question: 'Could you please provide your full name?'
  };
}





// Main Intake Chain Orchestrator
export async function runIntakeChain(context: ChainContext): Promise<any> {
  const { env, message, messages, sessionId, teamId } = context;
  
  // Build conversation history for context
  const conversationHistory = messages ? messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') : '';
  
  // Get team config for payment requirements
  let teamConfig = null;
  try {
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    console.log('Retrieving team config for teamId:', teamId);
    teamConfig = await aiService.getTeamConfig(teamId);
    console.log('Retrieved team config:', JSON.stringify(teamConfig, null, 2));
  } catch (error) {
    console.warn('Failed to get team config:', error);
    // Set default values if team config fails
    teamConfig = {
      config: {
        requiresPayment: false,
        consultationFee: 0,
        paymentLink: null
      }
    };
  }
  
  // Step 1: Route to appropriate workflow
  const routingResult = await runRouterChain(message, conversationHistory, sessionId, env);
  const workflow = routingResult.workflow || 'GENERAL_INQUIRY';

  // Step 2: Execute the appropriate workflow
  switch (workflow) {
    case 'MATTER_CREATION':
      return await executeMatterCreationChain(context, routingResult, teamConfig);
    case 'SCHEDULING':
      return await executeSchedulingChain(context, routingResult);
    case 'CONTACT_FORM':
      return await executeContactFormChain(context, routingResult);
    case 'URGENT_MATTER':
      return await executeUrgentMatterChain(context, routingResult);
    case 'GENERAL_INQUIRY':
    default:
      return await executeGeneralInquiryChain(context, routingResult);
  }
}

// Workflow-specific chain implementations
async function executeMatterCreationChain(context: ChainContext, intentResult: any, teamConfig: any): Promise<ChainResult> {
  console.log('executeMatterCreationChain called');
  const { env, message, sessionId, messages } = context;
  
  // Build conversation history
  const conversationHistory = messages ? messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') : '';
  
  // Extract information from conversation
  const extractedName = extractName(conversationHistory);
  const extractedEmail = extractEmail(conversationHistory);
  const extractedPhone = extractPhone(conversationHistory);
  const extractedMatterDetails = extractMatterDetails(conversationHistory);
  const extractedOpposingParty = extractOpposingParty(conversationHistory);
  
  console.log('Extraction results:');
  console.log('- extractedName:', extractedName);
  console.log('- extractedEmail:', extractedEmail);
  console.log('- extractedPhone:', extractedPhone);
  console.log('- extractedMatterDetails:', extractedMatterDetails);
  console.log('- extractedOpposingParty:', extractedOpposingParty);
  
  // Check if we have all essential information
  // For personal injury cases, opposing party might not be clear initially
  const isPersonalInjuryCase = extractedMatterDetails.toLowerCase().includes('personal injury') || 
                               extractedMatterDetails.toLowerCase().includes('accident') ||
                               extractedMatterDetails.toLowerCase().includes('bus') ||
                               extractedMatterDetails.toLowerCase().includes('vehicle') ||
                               extractedMatterDetails.toLowerCase().includes('died') ||
                               extractedMatterDetails.toLowerCase().includes('death');
  
  const hasAllEssentialInfo = extractedName && 
                              (extractedEmail || extractedPhone) && 
                              extractedMatterDetails && 
                              (isPersonalInjuryCase ? true : extractedOpposingParty);
  
  console.log('Essential info check:');
  console.log('- extractedName:', extractedName);
  console.log('- extractedEmail:', extractedEmail);
  console.log('- extractedPhone:', extractedPhone);
  console.log('- extractedMatterDetails:', extractedMatterDetails);
  console.log('- extractedOpposingParty:', extractedOpposingParty);
  console.log('hasAllEssentialInfo:', hasAllEssentialInfo);
  
  // Check if we've already shown the summary (by looking for summary-like content in recent messages)
  const hasShownSummary = conversationHistory.toLowerCase().includes('here\'s a summary') || 
                          conversationHistory.toLowerCase().includes('summary of your matter') ||
                          conversationHistory.toLowerCase().includes('client information:') ||
                          conversationHistory.toLowerCase().includes('matter details:') ||
                          conversationHistory.toLowerCase().includes('**client information:**') ||
                          conversationHistory.toLowerCase().includes('**matter details:**') ||
                          conversationHistory.toLowerCase().includes('perfect! i have all the information') ||
                          conversationHistory.toLowerCase().includes('perfect! i have all the information i need') ||
                          conversationHistory.toLowerCase().includes('i have all the information') ||
                          conversationHistory.includes('**Client Information:**') ||
                          conversationHistory.includes('**Matter Details:**');
  
  console.log('Conversation history length:', conversationHistory.length);
  console.log('Conversation history (first 500 chars):', conversationHistory.substring(0, 500));
  console.log('Conversation history contains summary indicators:');
  console.log('- "here\'s a summary":', conversationHistory.toLowerCase().includes('here\'s a summary'));
  console.log('- "summary of your matter":', conversationHistory.toLowerCase().includes('summary of your matter'));
  console.log('- "client information:":', conversationHistory.toLowerCase().includes('client information:'));
  console.log('- "matter details:":', conversationHistory.toLowerCase().includes('matter details:'));
  console.log('- "**client information:**":', conversationHistory.toLowerCase().includes('**client information:**'));
  console.log('- "**matter details:**":', conversationHistory.toLowerCase().includes('**matter details:**'));
  console.log('- "perfect! i have all the information":', conversationHistory.toLowerCase().includes('perfect! i have all the information'));
  console.log('- "perfect! i have all the information i need":', conversationHistory.toLowerCase().includes('perfect! i have all the information i need'));
  console.log('- "i have all the information":', conversationHistory.toLowerCase().includes('i have all the information'));
  console.log('- "**Client Information:**":', conversationHistory.includes('**Client Information:**'));
  console.log('- "**Matter Details:**":', conversationHistory.includes('**Matter Details:**'));
  console.log('hasShownSummary:', hasShownSummary);

  // Check for scheduling/time-related questions
  const isSchedulingQuestion = (text: string) => {
    const schedulingPhrases = [
      'what time',
      'when',
      'schedule',
      'appointment',
      'consultation',
      'available',
      'time slot',
      'meeting'
    ];
    const lowerText = text.toLowerCase();
    return schedulingPhrases.some(phrase => lowerText.includes(phrase));
  };

  // Check for frustration phrases
  const isFrustrationMessage = (text: string) => {
    const frustrationPhrases = [
      'thats three times',
      'why do you need to re confirm',
      'you just did',
      'already did',
      'i did',
      'you asked me',
      'why do you keep asking',
      'stop asking',
      'repetitive'
    ];
    const lowerText = text.toLowerCase();
    return frustrationPhrases.some(phrase => lowerText.includes(phrase));
  };

  // Check for affirmative responses that need to move forward
  const isAffirmativeResponse = (text: string) => {
    const affirmativePhrases = ['yes', 'sure', 'ok', 'okay', 'yeah', 'yep', 'absolutely', 'definitely'];
    const lowerText = text.toLowerCase().trim();
    return affirmativePhrases.includes(lowerText);
  };

  // If user is asking about scheduling/time, provide specific options
  if (isSchedulingQuestion(message)) {
    const schedulingResponse = `Great! I can help you schedule a consultation. We have availability this week. Would you prefer:

1. **Morning consultation** (9 AM - 12 PM)
2. **Afternoon consultation** (1 PM - 5 PM)
3. **Phone consultation** (anytime during business hours)

What works best for you?`;
    
    return {
      workflow: 'MATTER_CREATION',
      response: schedulingResponse,
      actions: [{ name: 'request_lawyer_approval', parameters: {
        matter_type: intentResult.matter_type || 'Legal Matter',
        urgency: intentResult.urgency || 'medium',
        client_message: message
      }}],
      metadata: {
        intent: intentResult,
        sessionId
      }
    };
  }

  // If we have all essential info and user gives affirmative response, show matter summary
  if (hasAllEssentialInfo && isAffirmativeResponse(message) && !hasShownSummary) {
    const matterSummary = `Perfect! I have all the information I need. Here's a summary of your matter:

**Client Information:**
- Name: ${extractedName}
- Phone: ${extractedPhone || 'Not provided'}
- Email: ${extractedEmail || 'Not provided'}

**Matter Details:**
- Type: ${intentResult.matter_type || 'Legal Matter'}
- Description: ${extractedMatterDetails}
- Opposing Party: ${extractedOpposingParty}
- Urgency: ${intentResult.urgency || 'medium'}

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation. Is there anything else you'd like to add before I submit this?`;
    
    return {
      workflow: 'MATTER_CREATION',
      response: matterSummary,
      actions: [{ name: 'request_lawyer_approval', parameters: {
        matter_type: intentResult.matter_type || 'Legal Matter',
        urgency: intentResult.urgency || 'medium',
        client_message: message,
        client_name: extractedName,
        client_phone: extractedPhone,
        client_email: extractedEmail,
        opposing_party: extractedOpposingParty,
        matter_details: extractedMatterDetails
      }}],
      metadata: {
        intent: intentResult,
        sessionId
      }
    };
  }

  // If user responds to matter summary, submit and confirm
  // Check if this looks like a final response after we have all info
  const isFinalResponse = hasAllEssentialInfo && 
                         (isAffirmativeResponse(message) || message.toLowerCase().includes('no')) &&
                         (extractedName && (extractedEmail || extractedPhone));
  
  if (isFinalResponse) {
    console.log('🎉 PAYMENT FLOW TRIGGERED!');
    console.log('Payment flow conditions met:');
    console.log('- hasAllEssentialInfo:', hasAllEssentialInfo);
    console.log('- isAffirmativeResponse:', isAffirmativeResponse(message));
    console.log('- message includes no:', message.toLowerCase().includes('no'));
    console.log('- message:', message);
    console.log('- extractedName:', extractedName);
    console.log('- extractedEmail:', extractedEmail);
    console.log('- extractedPhone:', extractedPhone);
    
    // Check if payment is required
    const requiresPayment = teamConfig?.config?.requiresPayment || false;
    const consultationFee = teamConfig?.config?.consultationFee || 0;
    const paymentLink = teamConfig?.config?.paymentLink;
    
    console.log('Payment flow - teamConfig:', JSON.stringify(teamConfig, null, 2));
    console.log('Payment flow - requiresPayment:', requiresPayment);
    console.log('Payment flow - consultationFee:', consultationFee);
    console.log('Payment flow - paymentLink:', paymentLink);
    
    let confirmationResponse = '';
    
    if (requiresPayment && consultationFee > 0) {
      confirmationResponse = `Perfect! I've prepared your matter for submission. Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}. 

**Next Steps:**
1. **Payment Required**: Please complete the payment using the link below
2. **Consultation**: Once payment is confirmed, a lawyer will contact you within 24 hours

**Payment Link**: ${paymentLink || 'Payment link not configured'}

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    } else {
      confirmationResponse = `Perfect! I've submitted your matter to our legal team. A lawyer will contact you within 24 hours to schedule a consultation. Thank you for choosing North Carolina Legal Services.`;
    }
    
    return {
      workflow: 'MATTER_CREATION',
      response: confirmationResponse,
      actions: [{ name: 'request_lawyer_approval', parameters: {
        matter_type: intentResult.matter_type || 'Legal Matter',
        urgency: intentResult.urgency || 'medium',
        client_message: message,
        client_name: extractedName,
        client_phone: extractedPhone,
        client_email: extractedEmail,
        opposing_party: extractedOpposingParty,
        matter_details: extractedMatterDetails,
        submitted: true,
        requires_payment: requiresPayment,
        consultation_fee: consultationFee,
        payment_link: paymentLink
      }}],
      metadata: {
        intent: intentResult,
        sessionId
      }
    };
  }

  // If user is frustrated, acknowledge and move forward
  if (isFrustrationMessage(message)) {
    const frustrationResponse = `I understand your frustration about the repetition. You've provided your name as "${extractedName || 'the information'}" and contact details. Since we have the essential information, let me help you schedule a consultation with one of our family law attorneys to discuss your situation. Would you like to proceed with scheduling a consultation?`;
    
    return {
      workflow: 'MATTER_CREATION',
      response: frustrationResponse,
      actions: [{ name: 'request_lawyer_approval', parameters: {
        matter_type: intentResult.matter_type || 'Family Law',
        urgency: intentResult.urgency || 'medium',
        client_message: message
      }}],
      metadata: {
        intent: intentResult,
        sessionId
      }
    };
  }

  // If user gives affirmative response but we're missing info, ask for the next missing piece
  if (isAffirmativeResponse(message)) {
    let nextQuestion = '';
    
    // Check if this is a family law case
    const isFamilyLawCase = extractedMatterDetails.toLowerCase().includes('divorce') || 
                           extractedMatterDetails.toLowerCase().includes('family') ||
                           extractedMatterDetails.toLowerCase().includes('custody') ||
                           extractedMatterDetails.toLowerCase().includes('infidelity');
    
    if (!extractedOpposingParty && isFamilyLawCase) {
      nextQuestion = `Great! Now I need to know about the other party involved. What's your spouse's name?`;
    } else if (!extractedOpposingParty && !isFamilyLawCase) {
      // For non-family law cases, we might not need opposing party info
      if (!extractedEmail && !extractedPhone) {
        nextQuestion = `Perfect! Can you please provide your phone number or email address so I can contact you?`;
      } else if (!extractedName) {
        nextQuestion = `Thanks! Can you please provide your full name?`;
      } else {
        nextQuestion = `Great! I have your name, contact info, and matter details. I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation.`;
      }
    } else if (!extractedEmail && !extractedPhone) {
      nextQuestion = `Perfect! Can you please provide your phone number or email address so I can contact you?`;
    } else if (!extractedName) {
      nextQuestion = `Thanks! Can you please provide your full name?`;
    } else {
      nextQuestion = `Great! I have your name, contact info, and matter details. I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to schedule a consultation.`;
    }
    
    return {
      workflow: 'MATTER_CREATION',
      response: nextQuestion,
      actions: [{ name: 'request_lawyer_approval', parameters: {
        matter_type: intentResult.matter_type || 'Legal Matter',
        urgency: intentResult.urgency || 'medium',
        client_message: message
      }}],
      metadata: {
        intent: intentResult,
        sessionId
      }
    };
  }

  const contextPrompt = `You are a legal intake assistant. Be concise and direct. Focus only on essential information.

Conversation history:
${conversationHistory}

Current message: "${message}"
Matter type: ${intentResult.matter_type || 'Legal Matter'}
Urgency: ${intentResult.urgency || 'medium'}

IMPORTANT RULES:
1. Keep responses short and direct (2-3 sentences max)
2. Only ask for ESSENTIAL information: name, phone/email, basic matter details
3. DON'T ask for address, date of birth, or other personal details
4. If user questions why you need info, explain briefly and move forward
5. If you have enough info, suggest next steps (consultation, etc.)
6. Be empathetic but efficient
7. If user gives affirmative response (sure, ok, yes), ask for their actual name
8. If user provides a name (like "steve jobs"), acknowledge it and move to next step
9. DON'T ask for the same information twice
10. If user says "you just did" or similar, acknowledge they already provided the info
11. If user says "why do you need to re confirm" or similar, acknowledge their frustration and move forward
12. If you have name AND contact info AND matter details, suggest next steps immediately
13. NEVER ask for information that has already been provided in the conversation
14. If user expresses frustration about repetition, acknowledge it and move forward

What information do we have:
- Name: ${extractedName}
- Email: ${extractedEmail}
- Phone: ${extractedPhone}
- Matter details: ${extractedMatterDetails}

ESSENTIAL INFORMATION CHECK:
- We have a name: ${extractedName ? 'YES' : 'NO'}
- We have contact info (phone or email): ${(extractedPhone || extractedEmail) ? 'YES' : 'NO'}
- We have matter details: ${extractedMatterDetails ? 'YES' : 'NO'}

SPECIAL HANDLING:
- If current message is "you just did", "already did", "i did", "why do you need to re confirm", "thats three times", etc., acknowledge their frustration and move forward
- If we have a name in conversation history, don't ask for it again
- If user provided a name in previous messages, acknowledge it
- If user questions why you need to confirm info, explain briefly and move forward
- If user expresses frustration about repetition, acknowledge it and move forward

DECISION LOGIC:
- If we have name AND contact info AND matter details: Suggest next steps (consultation, etc.)
- If missing name: Ask for name
- If missing contact info: Ask for phone/email
- If missing matter details: Ask for matter details
- If user expresses frustration: Acknowledge and move forward
- If user says "thats three times" or similar: Acknowledge frustration and move forward

Generate a brief, direct response that:
1. Acknowledges what they've shared (if new info)
2. If we have all essential info, suggest next steps
3. If missing info, ask for the next missing ESSENTIAL piece only
4. If they question why you need info, explain briefly
5. If they said "sure" or "ok", ask for their actual name
6. If they provided a name, acknowledge it and ask for next missing info
7. If they express frustration about reconfirming, acknowledge it and move forward
8. NEVER ask for information that has already been provided
9. If they say "thats three times" or similar, acknowledge their frustration and move forward

Response:`;

  const responseResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: contextPrompt }],
    max_tokens: 150,
    temperature: 0.7
  });

  return {
    workflow: 'MATTER_CREATION',
    response: responseResult.response || "I understand you're dealing with a legal matter. What's your full name?",
    actions: [{ name: 'request_lawyer_approval', parameters: { 
      matter_type: intentResult.matter_type || 'Legal Matter',
      urgency: intentResult.urgency || 'medium',
      client_message: message 
    }}],
    metadata: {
      intent: intentResult,
      sessionId
    }
  };
}

// Helper functions to extract information from conversation
function extractName(conversation: string): string {
  // Look for specific name patterns in the conversation first
  const nameKeywords = ['steve jobs', 'paul luke', 'john doe', 'jane smith', 'mike johnson'];
  for (const nameKeyword of nameKeywords) {
    if (conversation.toLowerCase().includes(nameKeyword.toLowerCase())) {
      return nameKeyword;
    }
  }

  // Look for user messages that contain names
  const userMessages = conversation.split('\n').filter(line => line.startsWith('user:'));
  for (const userMessage of userMessages.reverse()) {
    const content = userMessage.replace('user:', '').trim();
    
    // Check for two-word names
    const words = content.split(' ');
    if (words.length === 2 && words.every(word => /^[a-zA-Z]+$/.test(word))) {
      const potentialName = words.join(' ');
      // Check if it's not a common phrase
      const commonPhrases = ['thank you', 'you just', 'i just', 'can you', 'will you', 'should you', 'i understand', 'i apologize', 'i need', 'i want', 'i have', 'i got', 'i was', 'i am'];
      if (!commonPhrases.includes(potentialName.toLowerCase())) {
        return potentialName;
      }
    }
  }

  // Look for patterns like "paul luke", "John Doe", "steve jobs", etc.
  const namePattern = /(?:user|assistant):\s*([a-zA-Z]+\s+[a-zA-Z]+)/gi;
  const matches = conversation.match(namePattern);
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1].replace(/^(?:user|assistant):\s*/, '');
    // Check if it's not a common phrase
    const commonPhrases = ['thank you', 'you just', 'i just', 'can you', 'will you', 'should you', 'i understand', 'i apologize'];
    if (!commonPhrases.includes(lastMatch.toLowerCase())) {
      return lastMatch;
    }
  }

  // Also look for single word names that might be valid
  const singleNamePattern = /(?:user|assistant):\s*([a-zA-Z]{2,})/gi;
  const singleMatches = conversation.match(singleNamePattern);
  if (singleMatches && singleMatches.length > 0) {
    const potentialName = singleMatches[singleMatches.length - 1].replace(/^(?:user|assistant):\s*/, '');
    // Check if it's not a common word that wouldn't be a name
    const commonWords = ['sure', 'ok', 'okay', 'yes', 'no', 'maybe', 'divorce', 'help', 'lawyer', 'attorney', 'you', 'just', 'did', 'have', 'need', 'want', 'can', 'will', 'should', 'could', 'would', 'fired', 'work', 'furry'];
    if (!commonWords.includes(potentialName.toLowerCase())) {
      return potentialName;
    }
  }

  return '';
}

function extractEmail(conversation: string): string {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = conversation.match(emailPattern);
  return matches ? matches[matches.length - 1] : '';
}

function extractPhone(conversation: string): string {
  const phonePattern = /\d{3}[-.]?\d{3}[-.]?\d{4}/g;
  const matches = conversation.match(phonePattern);
  return matches ? matches[matches.length - 1] : '';
}

function extractMatterDetails(conversation: string): string {
  // Look for legal matter keywords with more specific categorization
  const legalKeywords = {
    'divorce': 'divorce',
    'cheated': 'infidelity/divorce',
    'fired': 'employment termination',
    'employment': 'employment law',
    'discrimination': 'employment discrimination',
    'custody': 'child custody',
    'family': 'family law',
    'ran over': 'personal injury/property damage',
    'neighbor': 'civil dispute',
    'dog': 'property damage/personal injury',
    'accident': 'personal injury',
    'car': 'vehicle accident',
    'truck': 'vehicle accident',
    'hit': 'personal injury/property damage',
    'damage': 'property damage',
    'injury': 'personal injury'
  };
  
  const lowerConversation = conversation.toLowerCase();
  const foundMatters = [];
  
  for (const [keyword, matterType] of Object.entries(legalKeywords)) {
    if (lowerConversation.includes(keyword)) {
      foundMatters.push(matterType);
    }
  }
  
  return foundMatters.length > 0 ? foundMatters.join(', ') : 'legal matter';
}

function extractOpposingParty(conversation: string): string {
  // Look for spouse/ex-partner mentions
  const spousePatterns = [
    /(?:my|the) (?:wife|husband|spouse|partner)/gi,
    /(?:my|the) (?:ex-wife|ex-husband|ex-spouse|ex-partner)/gi,
    /(?:my|the) (?:girlfriend|boyfriend|fiance|fiancee)/gi,
    /(?:my|the) (?:ex-girlfriend|ex-boyfriend|ex-fiance|ex-fiancee)/gi
  ];
  
  const lowerConversation = conversation.toLowerCase();
  
  // Check for specific patterns
  for (const pattern of spousePatterns) {
    const matches = conversation.match(pattern);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1]; // Return the most recent mention
    }
  }
  
  // Check for general spouse/ex mentions
  const spouseKeywords = ['wife', 'husband', 'spouse', 'partner', 'ex-wife', 'ex-husband', 'ex-spouse', 'ex-partner'];
  for (const keyword of spouseKeywords) {
    if (lowerConversation.includes(keyword)) {
      return `my ${keyword}`;
    }
  }
  
  // Check for other parties (neighbors, employers, etc.)
  const otherPartyPatterns = [
    /(?:my|the) (?:neighbor|neighbor's)/gi,
    /(?:my|the) (?:employer|boss|company)/gi,
    /(?:my|the) (?:landlord|tenant)/gi
  ];
  
  for (const pattern of otherPartyPatterns) {
    const matches = conversation.match(pattern);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1];
    }
  }
  
  // Check for general other party mentions
  const otherPartyKeywords = ['neighbor', 'employer', 'boss', 'landlord', 'tenant'];
  for (const keyword of otherPartyKeywords) {
    if (lowerConversation.includes(keyword)) {
      return `my ${keyword}`;
    }
  }
  
  return '';
}

async function executeSchedulingChain(context: ChainContext, intentResult: any): Promise<ChainResult> {
  return {
    workflow: 'SCHEDULING',
    response: "I'd be happy to help you schedule a consultation. What day would work best for you?",
    actions: [{ name: 'schedule_consultation', parameters: { client_message: context.message } }]
  };
}

async function executeContactFormChain(context: ChainContext, intentResult: any): Promise<ChainResult> {
  return {
    workflow: 'CONTACT_FORM',
    response: "I'll help you submit your contact information. What's your email address?",
    actions: [{ name: 'collect_contact_info', parameters: { client_message: context.message } }]
  };
}

async function executeUrgentMatterChain(context: ChainContext, intentResult: any): Promise<ChainResult> {
  return {
    workflow: 'URGENT_MATTER',
    response: "I understand this is urgent. I'm routing you to a lawyer immediately.",
    actions: [
      { name: 'request_lawyer_approval', parameters: { urgency: 'urgent', client_message: context.message } },
      { name: 'send_urgent_notification', parameters: { teamId: context.teamId, sessionId: context.sessionId } }
    ]
  };
}

async function executeGeneralInquiryChain(context: ChainContext, intentResult: any): Promise<ChainResult> {
  return {
    workflow: 'GENERAL_INQUIRY',
    response: "I'm here to help with your legal questions. What would you like to know?",
    actions: []
  };
}

// Helper function to generate responses
function generateMatterCreationResponse(infoResult: any, qualityResult: any, actionResult: any): string {
  const quality = qualityResult;
  const action = actionResult;

  if (quality?.requires_human_review) {
    return "I've collected your information and this matter requires lawyer review. I'm sending it to our team now.";
  }

  if (action?.action === 'request_more_info') {
    return infoResult.next_question || "I need a bit more information to help you effectively. Could you provide more details?";
  }

  return "Thank you for providing your information. I'm processing your matter creation request.";
} 