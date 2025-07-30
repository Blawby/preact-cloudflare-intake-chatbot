import { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';

interface ReviewMatter {
  id: string;
  matterNumber: string;
  service: string;
  title: string;
  description: string;
  urgency: 'low' | 'normal' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  clientName?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  answers?: Record<string, string>;
  aiSummary?: string;
  lawyerNotes?: string;
}

interface ReviewItemProps {
  matter: ReviewMatter;
  onApprove: (matterId: string, notes?: string) => void;
  onReject: (matterId: string, notes?: string) => void;
  onClose: () => void;
}

const ReviewItem: FunctionComponent<ReviewItemProps> = ({ 
  matter, 
  onApprove, 
  onReject, 
  onClose 
}) => {
  const [notes, setNotes] = useState(matter.lawyerNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(matter.id, notes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(matter.id, notes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'normal':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="review-item-overlay">
      <div className="review-item-modal">
        <div className="review-item-header">
          <div className="review-item-title">
            <h2 className="modal-title">Review Matter</h2>
            <p className="modal-subtitle">{matter.matterNumber}</p>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="review-item-content">
          {/* Matter Overview */}
          <div className="matter-overview">
            <div className="overview-header">
              <h3 className="overview-title">{matter.title}</h3>
              <span className={`urgency-badge ${getUrgencyColor(matter.urgency)}`}>
                {matter.urgency} priority
              </span>
            </div>
            
            <div className="overview-details">
              <div className="detail-item">
                <span className="detail-label">Service:</span>
                <span className="detail-value">{matter.service}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">
                  {new Date(matter.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${matter.status}`}>
                  {matter.status}
                </span>
              </div>
            </div>
          </div>

          {/* Client Information */}
          {matter.clientName && (
            <div className="client-section">
              <h4 className="section-title">
                <UserIcon className="w-5 h-5" />
                Client Information
              </h4>
              <div className="client-info">
                <div className="client-name">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{matter.clientName}</span>
                </div>
                {matter.contactInfo?.email && (
                  <div className="client-email">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span className="info-value">{matter.contactInfo.email}</span>
                  </div>
                )}
                {matter.contactInfo?.phone && (
                  <div className="client-phone">
                    <PhoneIcon className="w-4 h-4" />
                    <span className="info-value">{matter.contactInfo.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matter Description */}
          <div className="description-section">
            <h4 className="section-title">
              <DocumentTextIcon className="w-5 h-5" />
              Matter Description
            </h4>
            <div className="description-content">
              <p className="description-text">{matter.description}</p>
            </div>
          </div>

          {/* AI Summary */}
          {matter.aiSummary && (
            <div className="ai-summary-section">
              <h4 className="section-title">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                AI Summary
              </h4>
              <div className="ai-summary-content">
                <p className="summary-text">{matter.aiSummary}</p>
              </div>
            </div>
          )}

          {/* Client Answers */}
          {matter.answers && Object.keys(matter.answers).length > 0 && (
            <div className="answers-section">
              <h4 className="section-title">
                <DocumentTextIcon className="w-5 h-5" />
                Client Responses
              </h4>
              <div className="answers-content">
                {Object.entries(matter.answers).map(([question, answer]) => (
                  <div key={question} className="answer-item">
                    <div className="question-text">{question}</div>
                    <div className="answer-text">{answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lawyer Notes */}
          <div className="notes-section">
            <h4 className="section-title">Lawyer Notes</h4>
            <textarea
              className="notes-textarea"
              placeholder="Add your notes about this matter..."
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {matter.status === 'pending' && (
          <div className="review-item-actions">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="cancel-button"
            >
              Cancel
            </Button>
            <div className="action-buttons">
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={isSubmitting}
                className="reject-button"
              >
                <XCircleIcon className="w-5 h-5" />
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="approve-button"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Approve
              </Button>
            </div>
          </div>
        )}

        {matter.status !== 'pending' && (
          <div className="review-item-actions">
            <Button
              variant="secondary"
              onClick={onClose}
              className="close-action-button"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewItem; 