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

// Events that can advance the state machine
export interface MatterFormationEvent {
  type: 'user_input' | 'conflict_check_complete' | 'documents_received' | 'payment_complete' | 'letter_signed';
  data?: any;
  idempotencyKey?: string;
  teamId?: string;
  matterId?: string;
}

// Response from state machine operations
export interface MatterFormationResponse {
  stage: MatterFormationStage;
  checklist: ChecklistItem[];
  nextActions: string[];
  missing?: string[];
  completed: boolean;
  metadata?: any;
}