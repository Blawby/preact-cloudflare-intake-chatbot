import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import ReviewItem from './ReviewItem';

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

interface ReviewQueueProps {
  teamId: string;
  onRefresh?: () => void;
}

const ReviewQueue: FunctionComponent<ReviewQueueProps> = ({ teamId, onRefresh }) => {
  const [matters, setMatters] = useState<ReviewMatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatter, setSelectedMatter] = useState<ReviewMatter | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchReviewMatters();
  }, [teamId]);

  const fetchReviewMatters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/review?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setMatters(data.matters || []);
      }
    } catch (error) {
      console.error('Failed to fetch review matters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (matterId: string, notes?: string) => {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          action: 'approve',
          notes
        })
      });

      if (response.ok) {
        // Update local state
        setMatters(prev => prev.map(matter => 
          matter.id === matterId 
            ? { ...matter, status: 'approved' as const, lawyerNotes: notes }
            : matter
        ));
        setSelectedMatter(null);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to approve matter:', error);
    }
  };

  const handleReject = async (matterId: string, notes?: string) => {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          action: 'reject',
          notes
        })
      });

      if (response.ok) {
        // Update local state
        setMatters(prev => prev.map(matter => 
          matter.id === matterId 
            ? { ...matter, status: 'rejected' as const, lawyerNotes: notes }
            : matter
        ));
        setSelectedMatter(null);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to reject matter:', error);
    }
  };

  const filteredMatters = matters.filter(matter => {
    if (filter === 'all') return true;
    return matter.status === filter;
  });

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'normal':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="review-queue">
        <div className="review-queue-header">
          <h2 className="review-queue-title">Review Queue</h2>
          <div className="review-queue-loading">
            <div className="loading-spinner"></div>
            <span>Loading review matters...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-queue">
      <div className="review-queue-header">
        <h2 className="review-queue-title">Review Queue</h2>
        <div className="review-queue-controls">
          <div className="filter-buttons">
            <button
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({matters.length})
            </button>
            <button
              className={`filter-button ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({matters.filter(m => m.status === 'pending').length})
            </button>
            <button
              className={`filter-button ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved ({matters.filter(m => m.status === 'approved').length})
            </button>
            <button
              className={`filter-button ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              Rejected ({matters.filter(m => m.status === 'rejected').length})
            </button>
          </div>
          <button
            className="refresh-button"
            onClick={fetchReviewMatters}
            title="Refresh review queue"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="review-queue-content">
        {filteredMatters.length === 0 ? (
          <div className="empty-review-queue">
            <EyeIcon className="w-12 h-12 text-gray-400" />
            <h3 className="empty-title">No matters to review</h3>
            <p className="empty-description">
              {filter === 'all' 
                ? 'No matters have been submitted for review yet.'
                : `No ${filter} matters found.`
              }
            </p>
          </div>
        ) : (
          <div className="review-matters-list">
            {filteredMatters.map((matter) => (
              <div
                key={matter.id}
                className={`review-matter-item ${matter.status} ${selectedMatter?.id === matter.id ? 'selected' : ''}`}
                onClick={() => setSelectedMatter(matter)}
              >
                <div className="matter-header">
                  <div className="matter-info">
                    <h3 className="matter-title">{matter.title}</h3>
                    <p className="matter-number">{matter.matterNumber}</p>
                  </div>
                  <div className="matter-status">
                    {getStatusIcon(matter.status)}
                    <span className="status-text">{matter.status}</span>
                  </div>
                </div>
                
                <div className="matter-details">
                  <div className="matter-service">
                    <span className="service-label">Service:</span>
                    <span className="service-value">{matter.service}</span>
                  </div>
                  
                  <div className="matter-urgency">
                    {getUrgencyIcon(matter.urgency)}
                    <span className="urgency-text">{matter.urgency} priority</span>
                  </div>
                  
                  <div className="matter-date">
                    <span className="date-label">Created:</span>
                    <span className="date-value">
                      {new Date(matter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="matter-description">
                  <p className="description-text">{matter.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMatter && (
        <ReviewItem
          matter={selectedMatter}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedMatter(null)}
        />
      )}
    </div>
  );
};

export default ReviewQueue; 