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
import { componentStyles } from '../config/component-styles';

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
      <div className={componentStyles.pageContainer}>
        <div className={componentStyles.headerContainer}>
          <h2 className={componentStyles.title}>Review Queue</h2>
          <div className={componentStyles.loadingContainer}>
            <div className={componentStyles.loadingText}>Loading review matters...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={componentStyles.pageContainer}>
      <div className={componentStyles.headerContainer}>
        <h2 className={componentStyles.title}>Review Queue</h2>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-background border border-border text-text hover:bg-hover'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({matters.length})
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending' 
                  ? 'bg-primary text-white' 
                  : 'bg-background border border-border text-text hover:bg-hover'
              }`}
              onClick={() => setFilter('pending')}
            >
              Pending ({matters.filter(m => m.status === 'pending').length})
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'approved' 
                  ? 'bg-primary text-white' 
                  : 'bg-background border border-border text-text hover:bg-hover'
              }`}
              onClick={() => setFilter('approved')}
            >
              Approved ({matters.filter(m => m.status === 'approved').length})
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'rejected' 
                  ? 'bg-primary text-white' 
                  : 'bg-background border border-border text-text hover:bg-hover'
              }`}
              onClick={() => setFilter('rejected')}
            >
              Rejected ({matters.filter(m => m.status === 'rejected').length})
            </button>
          </div>
          <button
            className="p-2 rounded-md text-text hover:bg-hover transition-colors"
            onClick={fetchReviewMatters}
            title="Refresh review queue"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredMatters.length === 0 ? (
          <div className={componentStyles.emptyState}>
            <EyeIcon className={componentStyles.emptyIcon} />
            <h3 className={componentStyles.emptyTitle}>No matters to review</h3>
            <p className={componentStyles.emptyDescription}>
              {filter === 'all' 
                ? 'No matters have been submitted for review yet.'
                : `No ${filter} matters found.`
              }
            </p>
          </div>
        ) : (
          <div className={componentStyles.listContainer}>
            {filteredMatters.map((matter) => (
              <div
                key={matter.id}
                className={`${componentStyles.listItem} ${
                  selectedMatter?.id === matter.id ? 'border-2 border-primary' : ''
                }`}
                onClick={() => setSelectedMatter(matter)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-1">{matter.title}</h3>
                    <p className="text-sm text-muted">{matter.matterNumber}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(matter.status)}
                    <span className="text-sm font-medium capitalize">{matter.status}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted">Service:</span>
                    <span className="text-sm font-medium">{matter.service}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getUrgencyIcon(matter.urgency)}
                    <span className="text-sm font-medium capitalize">{matter.urgency} priority</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted">Created:</span>
                    <span className="text-sm">
                      {new Date(matter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-text">
                  <p className="line-clamp-2">{matter.description}</p>
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