import { 
  ArrowLeftIcon, 
  PencilIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { Matter, MatterDetailProps } from '../types/matter';

const getStatusIcon = (status: Matter['status']) => {
  switch (status) {
    case 'draft':
      return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    case 'submitted':
      return <ClockIcon className="w-5 h-5 text-blue-500" />;
    case 'in_review':
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'archived':
      return <ArchiveBoxIcon className="w-5 h-5 text-gray-400" />;
    default:
      return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusText = (status: Matter['status']) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'in_review':
      return 'In Review';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return 'Unknown';
  }
};

const getStatusColor = (status: Matter['status']) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'submitted':
      return 'bg-blue-100 text-blue-700';
    case 'in_review':
      return 'bg-yellow-100 text-yellow-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'archived':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const MatterDetail = ({ matter, onBack, onEdit }: MatterDetailProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="matter-detail-container">
      <div className="matter-detail-header">
        <button 
          className="back-button"
          onClick={onBack}
          aria-label="Back to matters"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Matters
        </button>
        
        <div className="matter-detail-actions">
          <button 
            className="edit-button"
            onClick={onEdit}
            aria-label="Edit matter"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="matter-detail-content">
        <div className="matter-detail-title">
          <h1 className="matter-title">
            {matter.matterNumber ? `Matter ${matter.matterNumber}` : matter.title}
          </h1>
          <span className={`matter-status ${getStatusColor(matter.status)}`}>
            {getStatusIcon(matter.status)}
            {getStatusText(matter.status)}
          </span>
        </div>

        <div className="matter-detail-meta">
          <div className="meta-item">
            <span className="meta-label">Service:</span>
            <span className="meta-value">{matter.service}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Created:</span>
            <span className="meta-value">{formatDate(matter.createdAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Updated:</span>
            <span className="meta-value">{formatDate(matter.updatedAt)}</span>
          </div>
          {matter.urgency && (
            <div className="meta-item">
              <span className="meta-label">Urgency:</span>
              <span className="meta-value urgency">{matter.urgency}</span>
            </div>
          )}
        </div>

        {matter.qualityScore && (
          <div className="matter-quality-section">
            <h3 className="section-title">Quality Assessment</h3>
            <div className="quality-score-display">
              <div className="quality-score-main">
                <span className="quality-score-value">
                  {matter.qualityScore.score}/100
                </span>
                <span className={`quality-score-badge quality-${matter.qualityScore.badge.toLowerCase()}`}>
                  {matter.qualityScore.badge}
                </span>
              </div>
              <div className="quality-score-details">
                <span className="quality-urgency">
                  Inferred Urgency: {matter.qualityScore.inferredUrgency}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="matter-summary-section">
          <h3 className="section-title">Summary</h3>
          <div className="matter-summary-content">
            {matter.summary}
          </div>
        </div>

        {matter.contactInfo && (matter.contactInfo.email || matter.contactInfo.phone) && (
          <div className="matter-contact-section">
            <h3 className="section-title">Contact Information</h3>
            <div className="contact-info">
              {matter.contactInfo.email && (
                <div className="contact-item">
                  <span className="contact-label">Email:</span>
                  <span className="contact-value">{matter.contactInfo.email}</span>
                </div>
              )}
              {matter.contactInfo.phone && (
                <div className="contact-item">
                  <span className="contact-label">Phone:</span>
                  <span className="contact-value">{matter.contactInfo.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {matter.answers && Object.keys(matter.answers).length > 0 && (
          <div className="matter-answers-section">
            <h3 className="section-title">Matter Details</h3>
            <div className="answers-list">
              {Object.entries(matter.answers).map(([key, value]) => (
                <div key={key} className="answer-item">
                  <span className="answer-question">{key}:</span>
                  <span className="answer-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatterDetail; 