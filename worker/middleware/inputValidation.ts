import { SecurityFilter } from '../utils/securityFilter.js';

export async function validateInput(body: any, teamConfig?: any): Promise<{ isValid: boolean; reason?: string; violations?: string[] }> {
  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    return { isValid: false, reason: 'Invalid message format' };
  }

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage?.content) {
    return { isValid: false, reason: 'No message content' };
  }

  // Comprehensive security validation
  const securityValidation = SecurityFilter.validateRequest(latestMessage.content, teamConfig);
  if (!securityValidation.isValid) {
    return { 
      isValid: false, 
      reason: securityValidation.reason || 'Security violation detected',
      violations: securityValidation.violations
    };
  }

  return { isValid: true };
}

export function getSecurityResponse(violations: string[], teamConfig?: any): string {
  const teamName = teamConfig?.name || 'our legal team';
  
  // Team-specific responses
  if (violations.includes('service_not_offered')) {
    return `I understand your legal concern, but this type of matter is not within our practice areas. I'd be happy to help you find a lawyer who specializes in this area.`;
  }
  
  if (violations.includes('jurisdiction_not_supported')) {
    return `I can only help with legal matters in our supported jurisdictions. Please contact a local attorney for matters outside our service area.`;
  }
  
  // Universal responses
  if (violations.includes('non_legal_request')) {
    return `I'm a legal intake specialist and cannot help with non-legal matters. I can only help with legal matters and connecting you with lawyers.`;
  }
  
  if (violations.includes('jailbreak_attempt')) {
    return `I'm a legal intake specialist and can only help with legal matters. I cannot change my role or provide other types of assistance.`;
  }
  
  // Default response
  return `I'm a legal intake specialist. I can only help with legal matters and connecting you with lawyers.`;
} 