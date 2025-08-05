import type { Ai, KVNamespace, R2Bucket, D1Database } from '@cloudflare/workers-types';

// Environment interface with proper Cloudflare Workers types
export interface Env {
  AI: Ai;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  TEAM_SECRETS: KVNamespace; // Multi-tenant secret storage
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
  PAYMENT_API_KEY?: string;
  PAYMENT_API_URL?: string;
  WEBHOOK_SECRET?: string;
}

// HTTP Error class for centralized error handling
export class HttpError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Matter interface for legal intake
export interface Matter {
  id: string;
  teamId: string;
  sessionId: string;
  status: 'lead' | 'active' | 'closed' | 'archived';
  matterType: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientLocation?: string;
  opposingParty?: string;
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Media interface for file attachments
export interface Media {
  id: string;
  teamId: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  teamId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Team configuration interface
export interface TeamConfig {
  id: string;
  slug: string;
  name: string;
  config: {
    aiModel?: string;
    consultationFee?: number;
    requiresPayment?: boolean;
    ownerEmail?: string;
    availableServices?: string[];
    jurisdiction?: {
      type: 'national' | 'state';
      description: string;
      supportedStates: string[];
      supportedCountries: string[];
      primaryState?: string;
    };
    domain?: string;
    description?: string;
    paymentLink?: string | null;
    brandColor?: string;
    accentColor?: string;
    introMessage?: string;
    profileImage?: string | null;
    webhooks?: {
      enabled?: boolean;
      url?: string;
      secret?: string;
      events?: {
        matterCreation?: boolean;
        matterDetails?: boolean;
        contactForm?: boolean;
        appointment?: boolean;
      };
      retryConfig?: {
        maxRetries?: number;
        retryDelay?: number;
      };
    };
    blawbyApi?: {
      enabled?: boolean;
      apiKey?: string;
      teamUlid?: string;
    };
  };
}

// Payment request interface
export interface PaymentRequest {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
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

// Payment response interface
export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  customerId?: string;
  error?: string;
}
// Common response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  teamId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

// Matter types
export interface Matter {
  id: string;
  teamId: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

// Team types
export interface Team {
  id: string;
  name: string;
  config: {
    aiModel: string;
    consultationFee: number;
    requiresPayment: boolean;
    ownerEmail: string;
    availableServices: string[];
    serviceQuestions: Record<string, string[]>;
    domain: string;
    description: string;
    paymentLink?: string;
    brandColor: string;
    accentColor: string;
    introMessage: string;
    profileImage?: string;
    webhooks: {
      enabled: boolean;
      url: string;
      secret: string;
      events: {
        matterCreation: boolean;
        matterDetails: boolean;
        contactForm: boolean;
        appointment: boolean;
      };
      retryConfig: {
        maxRetries: number;
        retryDelay: number;
      };
    };
  };
}

// Form types
export interface ContactForm {
  id: string;
  teamId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  service?: string;
  createdAt: number;
}

// Scheduling types
export interface Appointment {
  id: string;
  teamId: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  service: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
}

// File upload types
export interface FileUpload {
  id: string;
  teamId: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  uploadedAt: number;
  metadata?: Record<string, any>;
}

// Feedback types
export interface Feedback {
  id: string;
  teamId: string;
  sessionId: string;
  rating: number;
  comment?: string;
  createdAt: number;
}

// Webhook types
export interface WebhookEvent {
  type: 'matterCreation' | 'matterDetails' | 'contactForm' | 'appointment';
  data: any;
  timestamp: number;
  signature?: string;
}

// Request validation types
export interface ValidatedRequest<T = any> {
  data: T;
  env: Env;
  corsHeaders: Record<string, string>;
} 