import type { Env } from '../types';

export interface PaymentRequest {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  matterInfo: {
    type: string;
    description: string;
    urgency: string;
    opposingParty?: string;
  };
  teamId: string;
  sessionId: string;
}

export interface PaymentResponse {
  success: boolean;
  invoiceUrl?: string;
  paymentId?: string;
  error?: string;
}

export class PaymentService {
  private env: Env;
  private mcpServerUrl: string;

  constructor(env: Env) {
    this.env = env;
    // Use the Blawby staging API with proper authentication
    this.mcpServerUrl = env.BLAWBY_API_URL || 'https://staging.blawby.com';
    console.log('💰 PaymentService initialized with API URL:', this.mcpServerUrl);
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle test phone numbers (like 555-123-4567) by converting to a real format
    if (digits.startsWith('555') && digits.length === 10) {
      // Convert test numbers to a real format that the API will accept
      return '13322097232'; // Use a real phone number format for test numbers
    }
    
    // For US numbers, ensure we have the format that the API expects
    if (digits.length === 10) {
      return digits; // Return as 10 digits without country code
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1); // Remove country code for US numbers
    } else if (digits.length > 10) {
      // For international numbers, try to extract the main part
      return digits.slice(-10); // Take last 10 digits
    }
    
    return digits; // Return as is if we can't format it
  }

  async createInvoice(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💰 Creating invoice for payment request:', paymentRequest);
      
      const teamId = paymentRequest.teamId;
      console.log('💰 Using team ID:', teamId);
      
      // Get team configuration to check if Blawby API is enabled
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(this.env);
      const team = await teamService.getTeam(teamId);
      
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }
      
      // Check if Blawby API is enabled for this team
      if (!team.config.blawbyApi?.enabled) {
        console.log('❌ Blawby API not enabled for team:', teamId);
        return {
          success: false,
          error: 'Blawby API not enabled for this team'
        };
      }
      
      // Use team-specific API credentials with proper error handling
      const apiToken = team.config.blawbyApi?.apiKey;
      const teamUlid = team.config.blawbyApi?.teamUlid;
      
      if (!apiToken) {
        console.error('❌ CRITICAL: No API token available for payment processing');
        console.error('   - team.config.blawbyApi?.apiKey:', team.config.blawbyApi?.apiKey ? 'SET' : 'NOT SET');
        console.error('   - env.BLAWBY_API_TOKEN:', this.env.BLAWBY_API_TOKEN ? 'SET' : 'NOT SET');
        console.error('   - Team configuration should include blawbyApi.apiKey for team:', team.slug);
        return {
          success: false,
          error: 'API token not configured - cannot process payment. Check team configuration in database.'
        };
      }
      
      if (!teamUlid) {
        console.error('❌ CRITICAL: No team ULID available for payment processing');
        console.error('   - team.config.blawbyApi?.teamUlid:', team.config.blawbyApi?.teamUlid ? 'SET' : 'NOT SET');
        console.error('   - Team configuration should include blawbyApi.teamUlid for team:', team.slug);
        return {
          success: false,
          error: 'Team ULID not configured - cannot process payment. Check team configuration in database.'
        };
      }
      
      console.log('💰 Team API configuration:', {
        enabled: team.config.blawbyApi?.enabled,
        hasApiKey: !!apiToken,
        teamUlid: teamUlid
      });
      
      // Step 1: Create customer
      const customerResponse = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken || ''}`,
          'Accept': 'application/json',
          'User-Agent': 'Blawby-Legal-Intake/1.0'
        },
        body: JSON.stringify({
          name: paymentRequest.customerInfo.name,
          email: paymentRequest.customerInfo.email,
          phone: this.formatPhoneNumber(paymentRequest.customerInfo.phone),
          currency: 'USD',
          status: 'Lead',
          team_id: teamUlid,
          address_line_1: paymentRequest.customerInfo.location || '',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        })
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('❌ Customer creation error:', customerResponse.status, errorText);
        return {
          success: false,
          error: `Customer creation failed: ${customerResponse.status} - ${errorText}`
        };
      }

      const customerResult = await customerResponse.json();
      console.log('✅ Customer created:', customerResult);

      // Extract customer ID from the response
      const customerId = customerResult.data?.id;
      if (!customerId) {
        return {
          success: false,
          error: 'Failed to extract customer ID from response'
        };
      }

      // Step 2: Create invoice
      const invoiceResponse = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken || ''}`,
          'Accept': 'application/json',
          'User-Agent': 'Blawby-Legal-Intake/1.0'
        },
        body: JSON.stringify({
          customer_id: customerId,
          currency: 'USD',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          status: 'draft',
          line_items: [
            {
              description: `${paymentRequest.matterInfo.type}: ${paymentRequest.matterInfo.description}`,
              quantity: 1,
              unit_price: 7500, // $75.00 in cents
              line_total: 7500
            }
          ]
        })
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error('❌ Invoice creation error:', invoiceResponse.status, errorText);
        return {
          success: false,
          error: `Invoice creation failed: ${invoiceResponse.status} - ${errorText}`
        };
      }

      const invoiceResult = await invoiceResponse.json();
      console.log('✅ Invoice created:', invoiceResult);

      return {
        success: true,
        invoiceUrl: invoiceResult.data.payment_link,
        paymentId: invoiceResult.data.id
      };

    } catch (error) {
      console.error('❌ Payment service error:', error);
      return {
        success: false,
        error: `Payment service error: ${error}`
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const teamId = this.env.BLAWBY_TEAM_ULID || 'default';
      const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamId}/invoices/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.env.BLAWBY_API_TOKEN || ''}`,
          'Accept': 'application/json',
          'User-Agent': 'Blawby-Legal-Intake/1.0'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get payment status: ${response.status}`
        };
      }

      const result = await response.json();
      return {
        success: true,
        invoiceUrl: result[0]?.payment_link,
        paymentId: result[0]?.id,
        status: result[0]?.status
      };

    } catch (error) {
      console.error('❌ Payment status check error:', error);
      return {
        success: false,
        error: `Failed to check payment status: ${error}`
      };
    }
  }
} 