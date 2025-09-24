// Payment-related type definitions

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
  status?: string;
  error?: string;
}

export interface InvoiceCreateRequest {
  customer_id: string;
  currency: string;
  due_date: string;
  status: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface InvoiceCreateResponse {
  data: {
    id: string;
    payment_link: string;
  };
}

export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  zip?: string;
  currency?: string;
  status?: string;
  team_id?: string;
}

export interface CustomerCreateResponse {
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PaymentConfig {
  defaultPrice: number; // in cents
  currency: string;
  dueDateDays: number;
  matterTypePricing?: Record<string, number>; // matter type -> price in cents
}

export type InvoiceErrorCode = 
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ABORT' 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface InvoiceResult {
  success: boolean;
  invoiceUrl?: string;
  paymentId?: string;
  error?: string;
  errorCode?: InvoiceErrorCode;
  isIndeterminate?: boolean; // true if we can't determine if invoice was created server-side
}
