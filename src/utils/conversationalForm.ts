// Conversational form collection utility

export interface FormData {
  email?: string;
  phone?: string;
  caseDetails?: string;
  caseType?: string;
  caseDescription?: string;
  urgency?: string;
}

export type FormStep = 'idle' | 'collecting_email' | 'collecting_phone' | 'collecting_case_details' | 'complete';

export interface FormState {
  step: FormStep;
  data: FormData;
  isActive: boolean;
  conversationId?: string;
}

// Form validation
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  // Disallow consecutive dots
  if (email.includes('..')) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

export function validateCaseDetails(details: string): boolean {
  if (typeof details !== 'string') return false;
  return details.trim().length > 5; // Must be more than 5 characters
}

// Extract contact info from message
export function extractContactInfo(message: string): { email?: string; phone?: string } {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
  
  const email = message.match(emailRegex)?.[0];
  const phone = message.match(phoneRegex)?.[0];
  
  return { email, phone };
}

// Get next form step based on current state and user input
export function processFormStep(
  currentState: FormState,
  userMessage: string,
  extractedInfo: { email?: string; phone?: string }
): { newState: FormState; response: string; shouldSubmit?: boolean } {
  const newState = { ...currentState };
  let response = '';
  let shouldSubmit = false;

  switch (currentState.step) {
    case 'collecting_email':
      if (extractedInfo.email && validateEmail(extractedInfo.email)) {
        newState.data.email = extractedInfo.email;
        newState.step = 'collecting_phone';
        response = `Great! I have your email: ${extractedInfo.email}. Now, what's your phone number?`;
      } else if (userMessage.toLowerCase().includes('email')) {
        // User might be asking about email format
        response = "Please provide your email address. For example: john.doe@example.com";
      } else {
        response = "I need a valid email address to get back to you. Could you please provide your email?";
      }
      break;

    case 'collecting_phone':
      if (extractedInfo.phone && validatePhone(extractedInfo.phone)) {
        newState.data.phone = extractedInfo.phone;
        
        // Check if we already have case details from case creation flow
        if (currentState.data.caseDescription && currentState.data.caseDescription !== '') {
          // Skip case details collection if we already have comprehensive case info
          newState.step = 'complete';
          response = `Perfect! I have your phone: ${extractedInfo.phone}. I have all your contact information now. Let me update your case summary with your contact details and submit everything to our legal team.`;
          shouldSubmit = true;
        } else {
          // No existing case details, collect them
          newState.step = 'collecting_case_details';
          response = `Perfect! I have your phone: ${extractedInfo.phone}. Now, can you tell me more about your legal situation? What type of case or legal issue are you dealing with?`;
        }
      } else if (userMessage.toLowerCase().includes('phone')) {
        response = "Please provide your phone number. For example: (555) 123-4567 or 555-123-4567";
      } else {
        response = "I need a valid phone number to contact you. Could you please provide your phone number?";
      }
      break;

    case 'collecting_case_details':
      if (validateCaseDetails(userMessage)) {
        newState.data.caseDetails = userMessage;
        newState.step = 'complete';
        response = `Thank you! I have all the information I need. Here's what I'll send to our team:\n\n` +
          `📧 Email: ${newState.data.email}\n` +
          `📞 Phone: ${newState.data.phone}\n` +
          `📋 Case Details: ${userMessage}\n\n` +
          `A lawyer will review your case and get back to you within 24 hours. Is there anything else you'd like to add?`;
        shouldSubmit = true;
      } else {
        response = "I need a bit more detail about your legal situation to help our lawyers understand your case. Could you please provide more information about what you're dealing with?";
      }
      break;

    default:
      response = "I'm not sure what you're referring to. Let me know if you need help with anything!";
  }

  return { newState, response, shouldSubmit };
}

// Start the conversational form
export function startConversationalForm(conversationId?: string): FormState {
  return {
    step: 'collecting_email',
    data: {},
    isActive: true,
    conversationId
  };
}

// Get the initial form prompt
export function getFormStartPrompt(): string {
  return "I'd be happy to help you get in touch with one of our lawyers! To get started, I'll need some basic information from you. What's your email address?";
}



// Format form data for submission
export function formatFormData(formData: FormData, teamId: string, conversationId?: string) {
  return {
    teamId,
    conversationId,
    phoneNumber: formData.phone,
    email: formData.email,
    caseDetails: formData.caseDescription || formData.caseDetails || 'Case details provided through consultation'
  };
} 