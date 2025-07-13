import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { Matter, MatterCardProps } from '../types/matter';

const getStatusIcon = (status: Matter['status']) => {
  switch (status) {
    case 'draft':
      return <DocumentTextIcon className="w-4 h-4 text-gray-500" />;
    case 'submitted':
      return <ClockIcon className="w-4 h-4 text-blue-500" />;
    case 'in_review':
      return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
    case 'completed':
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case 'archived':
      return <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />;
    default:
      return <DocumentTextIcon className="w-4 h-4 text-gray-500" />;
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

const MatterCard = ({ matter, onClick }: MatterCardProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="matter-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="matter-card-header">
        <div className="matter-card-title">
          <h3 className="matter-title">
            {matter.matterNumber ? `Matter ${matter.matterNumber}` : matter.title}
          </h3>
          <span className={`matter-status ${getStatusColor(matter.status)}`}>
            {getStatusIcon(matter.status)}
            {getStatusText(matter.status)}
          </span>
        </div>
        <div className="matter-card-meta">
          <span className="matter-service">{matter.service}</span>
          <span className="matter-date">{formatDate(matter.updatedAt)}</span>
        </div>
      </div>
      
      <div className="matter-card-content">
        <p className="matter-summary">
          {truncateText(matter.summary, 120)}
        </p>
      </div>
      
      {matter.qualityScore && (
        <div className="matter-card-footer">
          <div className="quality-score">
            <span className="quality-label">Quality Score:</span>
            <span className={`quality-badge quality-${matter.qualityScore.badge.toLowerCase()}`}>
              {matter.qualityScore.score}/100
            </span>
          </div>
          {matter.urgency && (
            <span className="urgency-badge">
              {matter.urgency}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MatterCard; 