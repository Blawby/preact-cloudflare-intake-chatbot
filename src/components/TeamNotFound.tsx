import { h } from 'preact';
import { Button } from './ui/Button';

interface TeamNotFoundProps {
  teamId: string;
  onRetry?: () => void;
}

export function TeamNotFound({ teamId, onRetry }: TeamNotFoundProps) {
  return (
    <div className="team-not-found">
      <div className="team-not-found-content">
        <div className="team-not-found-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2>Team Not Found</h2>
        <p>
          The team "<strong>{teamId}</strong>" could not be found. 
          This might be due to an incorrect team ID or the team may have been removed.
        </p>
        <div className="team-not-found-actions">
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              Try Again
            </Button>
          )}
          <a href="/" className="home-link">
            Go to Home
          </a>
        </div>
      </div>
    </div>
  );
} 