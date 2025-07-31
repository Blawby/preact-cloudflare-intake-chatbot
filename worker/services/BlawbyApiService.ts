interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
  currency?: string;
  status?: string;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface CreateInvoiceRequest {
  customer_id: string;
  currency: string;
  due_date: string;
  status: string;
  line_items: InvoiceLineItem[];
}

interface BlawbyApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class BlawbyApiService {
  private baseUrl: string;
  private apiToken: string;

  constructor(apiToken?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.BLAWBY_API_URL || 'https://staging.blawby.com';
    this.apiToken = apiToken || process.env.BLAWBY_API_TOKEN || '';
  }

  /**
   * Get the properly formatted authorization header
   */
  private getAuthHeader(): string {
    if (!this.apiToken) return '';
    // Add "Bearer " prefix if not already present
    return this.apiToken.startsWith('Bearer ') ? this.apiToken : `Bearer ${this.apiToken}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<BlawbyApiResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log('🔍 [DEBUG] Blawby API request:', {
      url,
      method: options.method || 'GET',
      headers: {
        'Authorization': this.getAuthHeader() ? 'Bearer ***' : 'NOT SET',
        'Content-Type': 'application/json'
      },
      body: options.body ? '***BODY***' : 'NO BODY'
    });

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      console.log('🔍 [DEBUG] Blawby API response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (!response.ok) {
        console.error(`Blawby API error: ${response.status}`, data);
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Blawby API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a customer/client via the Blawby API
   */
  async createCustomer(teamUlid: string, customerInfo: CustomerInfo): Promise<BlawbyApiResponse> {
    const customerData = {
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      currency: customerInfo.currency || 'USD',
      status: customerInfo.status || 'Lead',
      team_id: teamUlid,
      // Note: Removed address fields as they cause API errors
    };

    console.log('Creating customer via Blawby API:', customerData);
    
    return await this.makeRequest(`/api/v1/teams/${teamUlid}/customer`, {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  /**
   * Get customer details by email
   */
  async getCustomerByEmail(teamUlid: string, email: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}/customers?search=${encodeURIComponent(email)}`;
    
    const response = await this.makeRequest(endpoint, {
      method: 'GET',
    });

    if (!response.success) {
      return response;
    }

    // Find customer by email in the response
    const customers = response.data?.customers?.data;
    if (!customers || customers.length === 0) {
      return {
        success: false,
        error: 'Customer not found',
      };
    }

    // Since we're searching by email, the first result should be the customer we want
    const customer = customers[0];
    
    if (customer.email !== email) {
      return {
        success: false,
        error: 'Customer not found',
      };
    }

    return {
      success: true,
      data: customer,
    };
  }

  /**
   * Create an invoice via the Blawby API
   */
  async createInvoice(teamUlid: string, customerId: string, amount: number, description: string): Promise<BlawbyApiResponse> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    const invoiceData: CreateInvoiceRequest = {
      customer_id: customerId,
      currency: 'USD',
      due_date: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: 'draft',
      line_items: [
        {
          description: description,
          quantity: 1,
          unit_price: amount,
          line_total: amount,
        },
      ],
    };

    console.log('Creating invoice via Blawby API:', invoiceData);

    return await this.makeRequest(`/api/v1/teams/${teamUlid}/invoice`, {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  /**
   * Get invoice details
   */
  async getInvoice(teamUlid: string, invoiceId: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}/invoices/${invoiceId}`;
    
    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Update customer status
   */
  async updateCustomerStatus(teamUlid: string, customerId: string, status: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}/customers/${customerId}`;
    
    return await this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Create a memo for a customer
   */
  async createCustomerMemo(teamUlid: string, customerId: string, content: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}/customers/${customerId}/memos`;
    
    return await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        content,
        event_time: new Date().toISOString(),
      }),
    });
  }

  /**
   * Get team information
   */
  async getTeamInfo(teamUlid: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}`;
    
    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Get all customers for a team (for debugging)
   */
  async getTeamCustomers(teamUlid: string): Promise<BlawbyApiResponse> {
    const endpoint = `/api/v1/teams/${teamUlid}/customers`;
    
    return await this.makeRequest(endpoint, {
      method: 'GET',
    });
  }
} 