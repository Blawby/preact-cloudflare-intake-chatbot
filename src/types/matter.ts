export type MatterStatus = 'draft' | 'submitted' | 'in_review' | 'completed' | 'archived';

export interface Matter {
  id: string;
  matterNumber?: string;
  title: string;
  service: string;
  status: MatterStatus;
  createdAt: Date;
  updatedAt: Date;
  summary: string;
  urgency?: string;
  answers?: Record<string, string>;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
} 