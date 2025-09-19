import { ValidationService } from '../../services/ValidationService.js';
import { PaymentServiceFactory } from '../../services/PaymentServiceFactory.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';
import { Logger } from '../../utils/logger.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any) {
  Logger.debug('[handleCreateMatter] parameters:', ToolCallParser.sanitizeParameters(parameters));
  Logger.logTeamConfig(teamConfig, true); // Include sanitized config in debug mode
  const { matter_type, description, name, phone, email, location, opposing_party } = parameters;
  
  // Check for placeholder values and reject them (but don't block if contact info is missing)
  if (phone && email && ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Additional check for common placeholder patterns
  const placeholderPatterns = [
    /^your.*phone$/i, /^your.*email$/i, /^your.*location$/i,
    /^un.*known$/i, /^not.*provided$/i, /^n\/a$/i, /^none$/i,
    /^placeholder/i, /^example/i, /^test/i, /^fake/i
  ];
  
  if (phone && placeholderPatterns.some(pattern => pattern.test(phone))) {
    return createValidationError("I need your actual phone number to proceed. Could you please provide your real phone number?");
  }
  
  if (email && placeholderPatterns.some(pattern => pattern.test(email))) {
    return createValidationError("I need your actual email address to proceed. Could you please provide your real email address?");
  }
  
  if (location && placeholderPatterns.some(pattern => pattern.test(location))) {
    return createValidationError("I need your actual location to proceed. Could you please provide your real city and state?");
  }
  
  // Validate required fields
  if (!matter_type || !description || !name) {
    return createValidationError("I'm missing some essential information. Could you please provide your name and describe your legal issue?");
  }
  
  // Validate matter type
  if (!ValidationService.validateMatterType(matter_type)) {
    return createValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
  }
  
  
  // Validate name format
  if (!ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided (but don't block if invalid)
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      // Don't block the conversation for invalid phone - just note it
      console.warn(`Invalid phone number provided: ${phone} - ${phoneValidation.error}`);
      // Continue with the conversation instead of blocking
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    console.warn(`Location validation failed for: ${location} - proceeding anyway`);
    // Don't block matter creation for location validation issues
  }
  
  // Don't require contact info - just note if missing
  if (!phone && !email) {
    console.warn(`No contact method provided for ${name} - proceeding with name only`);
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
`;

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

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;
  }
  
  const result = createSuccessResponse(summaryMessage, {
    matter_type,
    description,
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
  
  Logger.debug('[handleCreateMatter] result created successfully');
  return result;
}