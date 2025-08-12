import type { Ai, KVNamespace, R2Bucket, D1Database, Queue } from '@cloudflare/workers-types';

// Environment interface with proper Cloudflare Workers types
export interface Env {
  AI: Ai;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
  DOC_EVENTS: Queue;
  PAYMENT_API_KEY?: string;
  PAYMENT_API_URL?: string;
  
  // Cloudflare AI Configuration
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_PUBLIC_URL?: string;

  BLAWBY_API_URL?: string;
  BLAWBY_API_TOKEN?: string;
  BLAWBY_TEAM_ULID?: string;
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



// Request validation types
export interface ValidatedRequest<T = any> {
  data: T;
  env: Env;
  corsHeaders: Record<string, string>;
}

// UI-specific types that extend base types
export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface SchedulingData {
  type: 'date-selection' | 'time-of-day-selection' | 'time-slot-selection' | 'confirmation';
  selectedDate?: Date;
  timeOfDay?: 'morning' | 'afternoon';
  scheduledDateTime?: Date;
}

export interface MatterCreationData {
  type: 'service-selection';
  availableServices: string[];
}

export interface WelcomeMessageData {
  showButtons: boolean;
}

export interface MatterCanvasData {
  matterId?: string;
  matterNumber?: string;
  service: string;
  matterSummary: string;
  qualityScore?: {
    score: number;
    badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    color: 'blue' | 'green' | 'yellow' | 'red';
    inferredUrgency: string;
    breakdown: {
      followUpCompletion: number;
      requiredFields: number;
      evidence: number;
      clarity: number;
      urgency: number;
      consistency: number;
      aiConfidence: number;
    };
    suggestions: string[];
  };
  answers?: Record<string, string>;
}

export interface PaymentEmbedData {
  paymentUrl: string;
  amount?: number;
  description?: string;
  paymentId?: string;
}

// UI-specific ChatMessage interface that extends the base ChatMessage
export interface ChatMessageUI extends ChatMessage {
  isUser: boolean;
  files?: FileAttachment[];
  scheduling?: SchedulingData;
  matterCreation?: MatterCreationData;
  welcomeMessage?: WelcomeMessageData;
  matterCanvas?: MatterCanvasData;
  paymentEmbed?: PaymentEmbedData;
  isLoading?: boolean;
} 