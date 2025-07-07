// Intent detection utility for chat messages

export type IntentType = 'schedule_consultation' | 'learn_services' | 'general_inquiry' | 'contact_form';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  metadata?: Record<string, any>;
}

// Keywords and patterns for intent detection
const INTENT_PATTERNS = {
  schedule_consultation: {
    keywords: [
      'schedule', 'appointment', 'consultation', 'meet', 'book', 'reserve',
      'call me', 'contact me', 'speak with', 'talk to lawyer', 'legal advice',
      'need help', 'urgent', 'emergency', 'asap', 'soon', 'today', 'tomorrow'
    ],
    phrases: [
      'schedule a consultation', 'book appointment', 'meet with lawyer',
      'speak with attorney', 'get legal advice', 'need consultation',
      'want to schedule', 'make appointment', 'set up meeting'
    ]
  },
  learn_services: {
    keywords: [
      'services', 'practice areas', 'specialties', 'what do you do',
      'types of cases', 'areas of law', 'expertise', 'specialize',
      'help with', 'handle', 'experience in', 'practice'
    ],
    phrases: [
      'what services', 'practice areas', 'types of cases',
      'areas of expertise', 'what do you specialize in',
      'tell me about your services', 'what can you help with'
    ]
  },
  contact_form: {
    keywords: [
      'contact', 'form', 'submit', 'apply', 'application',
      'fill out', 'complete', 'send', 'submit case',
      'get in touch', 'reach out', 'contact form'
    ],
    phrases: [
      'contact form', 'fill out form', 'submit application',
      'apply for help', 'send case details', 'get in touch'
    ]
  },
  general_inquiry: {
    keywords: [
      'question', 'ask', 'wonder', 'curious', 'information',
      'how', 'what', 'when', 'where', 'why', 'tell me',
      'explain', 'understand', 'learn about'
    ],
    phrases: [
      'I have a question', 'I was wondering', 'can you tell me',
      'I want to know', 'how does', 'what is', 'explain'
    ]
  }
};

// Calculate confidence score based on keyword matches
function calculateConfidence(text: string, patterns: typeof INTENT_PATTERNS[keyof typeof INTENT_PATTERNS]): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  let totalPossible = 0;

  // Check keywords
  for (const keyword of patterns.keywords) {
    totalPossible++;
    if (lowerText.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  // Check phrases (weighted higher)
  for (const phrase of patterns.phrases) {
    totalPossible += 2; // Phrases are worth more
    if (lowerText.includes(phrase.toLowerCase())) {
      score += 2;
    }
  }

  return totalPossible > 0 ? Math.min(score / totalPossible, 1) : 0;
}

// Detect intent from a message
export function detectIntent(message: string): IntentResult {
  const results: Array<IntentResult> = [];
  
  // Calculate confidence for each intent type
  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    const confidence = calculateConfidence(message, patterns);
    if (confidence > 0) {
      results.push({
        intent: intentType as IntentType,
        confidence,
        metadata: {
          matchedKeywords: patterns.keywords.filter(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
          ),
          matchedPhrases: patterns.phrases.filter(phrase => 
            message.toLowerCase().includes(phrase.toLowerCase())
          )
        }
      });
    }
  }

  // Sort by confidence and return the highest
  results.sort((a, b) => b.confidence - a.confidence);
  
  if (results.length === 0) {
    return {
      intent: 'general_inquiry',
      confidence: 0.1,
      metadata: { reason: 'no specific intent detected' }
    };
  }

  return results[0];
}

// Get appropriate response based on intent
export function getIntentResponse(intent: IntentResult, teamConfig?: any): string {
  const baseResponses = {
    schedule_consultation: "I'd be happy to help you schedule a consultation! To get started, I'll need some basic information from you. Would you like to fill out our contact form so a lawyer can get back to you?",
    learn_services: "Our firm specializes in several practice areas. I'd be happy to tell you more about our services, but for personalized legal advice, I'd recommend speaking directly with one of our attorneys. Would you like to fill out our contact form?",
    contact_form: "Perfect! I can help you with our contact form. I'll need your phone number, email, and some details about your case. Let me guide you through this process.",
    general_inquiry: "I'm here to help with your legal questions! For the most accurate and personalized advice, I'd recommend speaking with one of our attorneys. Would you like to fill out our contact form so they can get back to you?"
  };

  let response = baseResponses[intent.intent];
  
  // Add team-specific information
  if (teamConfig) {
    if (teamConfig.config?.consultationFee > 0) {
      response += ` Consultation fee: $${teamConfig.config.consultationFee}.`;
    } else {
      response += " Free consultation available.";
    }
  }

  return response;
}

// Check if message indicates form completion intent
export function shouldShowContactForm(intent: IntentResult): boolean {
  return intent.intent === 'contact_form' || intent.intent === 'schedule_consultation';
}

// Extract potential contact information from message
export function extractContactInfo(message: string): { phone?: string; email?: string } {
  const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  const phone = message.match(phoneRegex)?.[0];
  const email = message.match(emailRegex)?.[0];
  
  return { phone, email };
} 