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
  qualityScore?: {
    score: number;
    badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    color: 'blue' | 'green' | 'yellow' | 'red';
    inferredUrgency: string;
  };
  answers?: Record<string, string>;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

export interface MattersListProps {
  matters: Matter[];
  onMatterSelect: (matter: Matter) => void;
  onCreateMatter: () => void;
  isLoading?: boolean;
}

export interface MatterCardProps {
  matter: Matter;
  onClick: () => void;
}

export interface MatterDetailProps {
  matter: Matter;
  onBack: () => void;
  onEdit: () => void;
} 