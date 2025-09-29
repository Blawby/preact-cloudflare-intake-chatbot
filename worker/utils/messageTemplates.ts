/**
 * Reusable message templates for consistent communication
 * Provides standardized messaging across all legal intake flows
 */

export interface MatterSummaryData {
  name: string;
  email: string;
  phone: string;
  location: string;
  opposingParty?: string;
  matterType: string;
  description: string;
  urgency: string;
  requiresPayment: boolean;
  consultationFee?: number;
  paymentLink?: string;
  pdfFilename?: string;
  missingInfo?: string[];
}

/**
 * Generate a professional matter summary message
 */
export function generateMatterSummaryMessage(data: MatterSummaryData): string {
  const { name, email, phone, location, opposingParty, matterType, description, urgency } = data;
  
  let message = `Perfect! I have all the information I need. Here's a summary of your matter:\n\n`;
  
  // Client Information Section
  message += `**Client Information:**\n`;
  message += `• Name: ${name}\n`;
  message += `• Contact: ${phone}, ${email}, ${location}\n`;
  if (opposingParty) {
    message += `• Opposing Party: ${opposingParty}\n`;
  }
  message += `\n`;
  
  // Matter Details Section
  message += `**Matter Details:**\n`;
  message += `• Type: ${matterType}\n`;
  message += `• Description: ${description}\n`;
  message += `• Urgency: ${urgency}\n`;
  message += `\n`;
  
  return message;
}

/**
 * Generate payment required message
 */
export function generatePaymentRequiredMessage(data: MatterSummaryData): string {
  const { consultationFee, paymentLink } = data;
  
  let message = `Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.\n\n`;
  
  message += `**Next Steps:**\n`;
  message += `1. Please complete the payment using the embedded payment form below\n`;
  message += `2. Once payment is confirmed, a lawyer will contact you within 24 hours\n\n`;
  
  message += `Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
  
  return message;
}

/**
 * Generate no payment required message
 */
export function generateNoPaymentMessage(): string {
  return `I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;
}

/**
 * Generate PDF generation message
 */
export function generatePDFMessage(pdfFilename: string): string {
  return `I've generated a case summary PDF (${pdfFilename}) you can download or share when you're ready.`;
}

/**
 * Generate notification confirmation message
 */
export function generateNotificationMessage(requiresPayment: boolean): string {
  if (requiresPayment) {
    return `Your full submission has already been sent to our legal team for review, and we alerted them that payment is pending.`;
  }
  return `Your full submission has already been sent to our legal team for review.`;
}

/**
 * Generate missing information message
 */
export function generateMissingInfoMessage(missingInfo: string[]): string {
  if (missingInfo.length === 0) {
    return '';
  }
  
  let message = `**Missing Information**\n`;
  message += `To strengthen your matter, consider providing:\n\n`;
  message += missingInfo.map(info => `• ${info}`).join('\n');
  message += `\n\nYou can provide this information by continuing our conversation. The more details you share, the better we can assist you.`;
  
  return message;
}

/**
 * Generate complete matter summary with all sections
 */
export function generateCompleteMatterMessage(data: MatterSummaryData): string {
  let message = generateMatterSummaryMessage(data);
  
  // Add payment section if required
  if (data.requiresPayment && data.consultationFee && data.consultationFee > 0) {
    message += generatePaymentRequiredMessage(data);
  } else {
    message += generateNoPaymentMessage();
  }
  
  // Add PDF message if available
  if (data.pdfFilename) {
    message += `\n\n${generatePDFMessage(data.pdfFilename)}`;
  }
  
  // Add notification message
  message += `\n\n${generateNotificationMessage(data.requiresPayment)}`;
  
  // Add missing information if any
  if (data.missingInfo && data.missingInfo.length > 0) {
    message += `\n\n${generateMissingInfoMessage(data.missingInfo)}`;
  }
  
  return message;
}
