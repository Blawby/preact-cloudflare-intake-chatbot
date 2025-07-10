import { FunctionComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { memo } from 'preact/compat';
import { getFeedbackEndpoint } from '../config/api';

interface FeedbackUIProps {
  messageId?: string;
  sessionId?: string;
  teamId?: string;
  onFeedbackSubmit?: (feedback: FeedbackData) => void;
}

interface FeedbackData {
  rating?: number;
  thumbsUp?: boolean;
  comments?: string;
  intent?: string;
}

const FeedbackUI: FunctionComponent<FeedbackUIProps> = memo(({ 
  messageId, 
  sessionId, 
  teamId, 
  onFeedbackSubmit 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleThumbsUp = useCallback(() => {
    const newFeedback = { ...feedback, thumbsUp: true };
    setFeedback(newFeedback);
    submitFeedback(newFeedback);
  }, [feedback]);

  const handleThumbsDown = useCallback(() => {
    const newFeedback = { ...feedback, thumbsUp: false };
    setFeedback(newFeedback);
    setIsExpanded(true); // Expand to show comment box for negative feedback
  }, [feedback]);

  const handleRating = useCallback((rating: number) => {
    const newFeedback = { ...feedback, rating };
    setFeedback(newFeedback);
    if (rating <= 3) {
      setIsExpanded(true); // Expand for low ratings
    }
  }, [feedback]);

  const handleCommentChange = useCallback((e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setFeedback(prev => ({ ...prev, comments: target.value }));
  }, []);

  const submitFeedback = async (feedbackData: FeedbackData) => {
    if (isSubmitting || hasSubmitted) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(getFeedbackEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          teamId,
          ...feedbackData,
          intent: 'message_feedback'
        }),
      });

      if (response.ok) {
        setHasSubmitted(true);
        onFeedbackSubmit?.(feedbackData);
        
        // Auto-collapse after successful submission
        setTimeout(() => {
          setIsExpanded(false);
        }, 2000);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = useCallback(() => {
    submitFeedback(feedback);
  }, [feedback]);

  if (hasSubmitted) {
    return (
      <div class="feedback-ui submitted">
        <div class="feedback-thanks">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Thank you for your feedback!
        </div>
      </div>
    );
  }

  return (
    <div class="feedback-ui">
      <div class="feedback-actions">
        {/* Thumbs up/down buttons */}
        <div class="feedback-thumbs">
          <button
            class={`feedback-btn ${feedback.thumbsUp === true ? 'active' : ''}`}
            onClick={handleThumbsUp}
            disabled={isSubmitting}
            aria-label="This response was helpful"
            title="This response was helpful"
          >
            <HandThumbUpIcon className="w-4 h-4" />
          </button>
          <button
            class={`feedback-btn ${feedback.thumbsUp === false ? 'active' : ''}`}
            onClick={handleThumbsDown}
            disabled={isSubmitting}
            aria-label="This response was not helpful"
            title="This response was not helpful"
          >
            <HandThumbDownIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Star rating */}
        <div class="feedback-rating">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              class={`feedback-star ${feedback.rating && feedback.rating >= star ? 'active' : ''}`}
              onClick={() => handleRating(star)}
              disabled={isSubmitting}
              aria-label={`Rate ${star} out of 5 stars`}
              title={`Rate ${star} out of 5 stars`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Expand button for comments */}
        {!isExpanded && (
          <button
            class="feedback-expand-btn"
            onClick={() => setIsExpanded(true)}
            disabled={isSubmitting}
            aria-label="Add detailed feedback"
            title="Add detailed feedback"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M8 9h8"/>
              <path d="M8 13h6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Expanded comment area */}
      {isExpanded && (
        <div class="feedback-expanded">
          <textarea
            class="feedback-comment"
            placeholder="What could be improved? (optional)"
            value={feedback.comments || ''}
            onInput={handleCommentChange}
            rows={3}
            disabled={isSubmitting}
          />
          <div class="feedback-submit-actions">
            <button
              class="feedback-submit-btn"
              onClick={handleSubmitComment}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              class="feedback-cancel-btn"
              onClick={() => setIsExpanded(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default FeedbackUI; 