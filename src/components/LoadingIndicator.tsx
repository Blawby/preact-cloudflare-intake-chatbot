import { memo } from 'preact/hooks';

const LoadingIndicator = memo(() => {
  return (
    <div className="message message-ai">
      <div 
        className="loading-indicator"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
});

LoadingIndicator.displayName = 'LoadingIndicator';

export default LoadingIndicator;
