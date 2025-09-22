import type { Ai, KVNamespace, R2Bucket, D1Database, Queue, DurableObjectNamespace } from '@cloudflare/workers-types';

// Environment interface with proper Cloudflare Workers types
export interface Env {
  AI: Ai;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
  DOC_EVENTS: Queue;
  PARALEGAL_TASKS: Queue;
  PARALEGAL_AGENT: DurableObjectNamespace;
  PAYMENT_API_KEY?: string;
  PAYMENT_API_URL?: string;
  
  // Cloudflare AI Configuration
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_PUBLIC_URL?: string;

  BLAWBY_API_URL?: string;
  BLAWBY_API_TOKEN?: string;
  BLAWBY_TEAM_ULID?: string;
  IDEMPOTENCY_SALT?: string;
  PAYMENT_IDEMPOTENCY_SECRET?: string;
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
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
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

/**
 * Represents the current state of AI processing for a chat message.
 * Use this to determine loading states and provide appropriate UI feedback.
 */
export type AiState = 'thinking' | 'processing' | 'generating';

/**
 * Centralized constant for AI loading states.
 * Use this for UI logic to determine when AI is actively processing.
 */
export const AI_LOADING_STATES: readonly AiState[] = ['thinking', 'processing', 'generating'] as const;

// Shared UI fields that can be attached to chat messages
export interface UIMessageExtras {
  files?: FileAttachment[];

  matterCreation?: MatterCreationData;
  welcomeMessage?: WelcomeMessageData;
  matterCanvas?: MatterCanvasData;
  paymentEmbed?: PaymentEmbedData;
  /** @deprecated Prefer deriving loading from aiState. */
  isLoading?: boolean;
}

// UI-specific ChatMessage interface that extends the base ChatMessage
export type ChatMessageUI = 
  | (ChatMessage & UIMessageExtras & {
      role: 'user'; // Explicitly constrain role to 'user' for user messages
      isUser: true;
      aiState?: never; // User messages cannot have aiState
    })
  | (ChatMessage & UIMessageExtras & {
      role: 'assistant'; // Explicitly constrain role to 'assistant' for assistant messages
      isUser: false;
      aiState?: AiState; // Assistant messages can have aiState
    })
  | (ChatMessage & {
      role: 'system'; // Explicitly constrain role to 'system' for system messages
      isUser: false;
      // System messages typically don't need most of these fields
      // Keep only what makes sense for system messages
    });
