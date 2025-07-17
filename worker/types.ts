import type { Ai, KVNamespace, R2Bucket, D1Database } from '@cloudflare/workers-types';

// Environment interface with proper Cloudflare Workers types
export interface Env {
  AI: Ai;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
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