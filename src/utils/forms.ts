import { getFormsEndpoint, getTeamsEndpoint } from '../config/api';
import { ChatMessageUI } from '../../worker/types';

// Utility function to format form data for submission
export function formatFormData(formData: any, teamId: string) {
  return {
    ...formData,
    teamId,
    timestamp: new Date().toISOString()
  };
}

// Submit contact form to API
export async function submitContactForm(
  formData: any, 
  teamId: string, 
  onLoadingMessage: (messageId: string) => void,
  onUpdateMessage: (messageId: string, content: string, isLoading: boolean) => void,
  onError?: (error: string) => void
) {
  const loadingMessageId = crypto.randomUUID();
  
  try {
    onLoadingMessage(loadingMessageId);
    
    const formPayload = formatFormData(formData, teamId);
    const response = await fetch(getFormsEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Form submitted successfully:', result);
      
      // Fetch team configuration to check payment requirements
      let teamConfig = null;
      try {
        const teamsResponse = await fetch(getTeamsEndpoint());
        if (teamsResponse.ok) {
          const teamsJson = await teamsResponse.json() as any;
          teamConfig = teamsJson.data.find((team: any) => team.slug === teamId || team.id === teamId);
        }
      } catch (error) {
        console.warn('Failed to fetch team config:', error);
      }
      
      // Create confirmation message based on payment requirements and matter creation status
      let confirmationContent = "";
      
      // Check if this came from matter creation flow
      const hasMatter = formData.matterDescription && formData.matterDescription !== '';
      
      if (hasMatter) {
        // Show matter canvas focus message
        confirmationContent = `✅ Perfect! Your complete matter information has been submitted successfully and updated below.`;
      } else {
        // Regular form submission
        if (teamConfig?.config?.requiresPayment) {
          const fee = teamConfig.config.consultationFee ?? 0;
          const paymentLink = teamConfig.config.paymentLink ?? 'Payment link will be sent shortly';
          
          confirmationContent = `✅ Thank you! Your information has been submitted successfully.\n\n` +
            `💰 **Consultation Fee**: $${fee}\n\n` +
            `To schedule your consultation with our lawyer, please complete the payment first. ` +
            `This helps us prioritize your matter and ensures we can provide you with the best legal assistance.\n\n` +
            `🔗 **Payment Link**: ${paymentLink}\n\n` +
            `Once payment is completed, a lawyer will review your matter and contact you within 24 hours. ` +
            `Thank you for choosing ${teamConfig.name}!`;
        } else {
          confirmationContent = `✅ Your information has been submitted successfully! A lawyer will review your matter and contact you within 24 hours. Thank you for choosing our firm.`;
        }
      }
      
      // Update the loading message with confirmation
      setTimeout(() => {
        onUpdateMessage(loadingMessageId, confirmationContent, false);
      }, 300);
      
      // Show updated matter canvas with contact information (only if from matter creation)
      if (hasMatter) {
        setTimeout(() => {
          // Find the last message with a matter canvas to get the matter data
          // This would need to be handled by the parent component
          // For now, we'll just show the confirmation message
        }, 1000);
      }
      
    } else {
      throw new Error('Form submission failed');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    
    // Update loading message with error content
    setTimeout(() => {
      onUpdateMessage(loadingMessageId, "Sorry, there was an error submitting your information. Please try again or contact us directly.", false);
    }, 300);
    
    onError?.('Form submission failed');
  }
} 