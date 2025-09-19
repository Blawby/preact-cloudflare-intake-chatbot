import type { CaseBriefV1, HandoffDecision } from '../../types';

// Matter formation stages
export type MatterFormationStage =
  | 'collect_parties'
  | 'conflicts_check'
  | 'documents_needed'
  | 'fee_scope'
  | 'engagement'
  | 'filing_prep'
  | 'completed';

// Checklist item for tracking progress
export interface ChecklistItem {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
  required: boolean;
  assignedTo?: string;
  dueDate?: string;
}

// Durable Object state
export interface ParalegalState {
  stage: MatterFormationStage;
  checklist: ChecklistItem[];
  caseBrief?: CaseBriefV1;
  handoff?: HandoffDecision;
  metadata: {
    teamId?: string;
    matterId?: string;
    clientInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    opposingParty?: string;
    matterType?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Event data types for different event types
export interface ClientInfoData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface PartyInfoData {
  clientInfo: ClientInfoData;
  opposingParty: string | string[];
  matterType: string;
}

export interface PaymentData {
  feeApproved: boolean;
  paymentComplete: boolean;
  amount?: number;
  paymentMethod?: string;
}

export interface EngagementData {
  letterSigned: boolean;
  engagementComplete: boolean;
  signedDate?: string;
}

export interface DocumentData {
  documentsReceived: boolean;
  documentCount?: number;
  documentTypes?: string[];
}

// Union type for all possible event data
export type MatterFormationEventData = 
  | PartyInfoData 
  | PaymentData 
  | EngagementData 
  | DocumentData 
  | Record<string, unknown>;

// Discriminated union for events that can advance the state machine
export type MatterFormationEvent = 
  | {
      type: 'user_input';
      data?: PartyInfoData;
      idempotencyKey?: string;
      teamId?: string;
      matterId?: string;
    }
  | {
      type: 'conflict_check_complete';
      data?: Record<string, unknown>;
      idempotencyKey?: string;
      teamId?: string;
      matterId?: string;
    }
  | {
      type: 'documents_received';
      data?: DocumentData;
      idempotencyKey?: string;
      teamId?: string;
      matterId?: string;
    }
  | {
      type: 'payment_complete';
      data?: PaymentData;
      idempotencyKey?: string;
      teamId?: string;
      matterId?: string;
    }
  | {
      type: 'letter_signed';
      data?: EngagementData;
      idempotencyKey?: string;
      teamId?: string;
      matterId?: string;
    };

// Response from state machine operations
export interface MatterFormationResponse {
  stage: MatterFormationStage;
  checklist: ChecklistItem[];
  nextActions: string[];
  missing?: string[];
  completed: boolean;
  metadata?: {
    teamId?: string;
    matterId?: string;
    clientInfo?: ClientInfoData;
    opposingParty?: string;
    matterType?: string;
  };
  caseBrief?: CaseBriefV1;
  directive?: string;
  handoffReason?: string;
  handoffMessage?: string;
}