import { FunctionComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { memo } from 'preact/compat';
import { getFeedbackEndpoint } from '../config/api';
import { Button } from './ui/Button';

interface FeedbackUIProps {
  messageId?: string;
  sessionId?: string;
  teamId?: string;
  onFeedbackSubmit?: (feedback: FeedbackData) => void;
  content?: string;
}

interface FeedbackData {
  thumbsUp?: boolean;
}

const FeedbackUI: FunctionComponent<FeedbackUIProps> = memo(({ 
  messageId, 
  sessionId, 
  teamId, 
  onFeedbackSubmit, 
  content
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleThumbsUp = useCallback(() => {
    const newFeedback = { ...feedback, thumbsUp: true };
    setFeedback(newFeedback);
    submitFeedback(newFeedback);
  }, [feedback]);

  const handleThumbsDown = useCallback(() => {
    const newFeedback = { ...feedback, thumbsUp: false };
    setFeedback(newFeedback);
    submitFeedback(newFeedback);
  }, [feedback]);

  const handleCopy = useCallback(() => {
    if (!content) return;
    // Remove HTML tags if present
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [content]);

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
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div class="feedback-thumbs">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThumbsUp}
            disabled={isSubmitting}
            aria-label="This response was helpful"
            title="This response was helpful"
            className={`${feedback.thumbsUp === true ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}`}
          >
            <HandThumbUpIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThumbsDown}
            disabled={isSubmitting}
            aria-label="This response was not helpful"
            title="This response was not helpful"
            className={`${feedback.thumbsUp === false ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}`}
          >
            <HandThumbDownIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            aria-label="Copy response to clipboard"
            title="Copy response to clipboard"
            disabled={copied}
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6V4.125A2.625 2.625 0 0 0 13.875 1.5h-7.5A2.625 2.625 0 0 0 3.75 4.125v13.5A2.625 2.625 0 0 0 6.375 20.25H8.25" />
              <rect width="13.5" height="13.5" x="9.75" y="6.75" rx="2.25" />
            </svg>
          </Button>
        </div>
        {copied && <div style={{ fontSize: '0.85em', color: 'var(--accent-color)', marginTop: '0.25rem' }}>Copied!</div>}
      </div>
    </div>
  );
});

export default FeedbackUI; 