import { h } from 'preact';
import { Button } from './ui/Button';

interface TeamNotFoundProps {
  teamId: string;
  onRetry?: () => void;
}

export function TeamNotFound({ teamId, onRetry }: TeamNotFoundProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-light-bg dark:bg-dark-bg">
      <div className="text-center max-w-lg p-12 bg-light-message-bg-ai dark:bg-dark-message-bg-ai rounded-2xl shadow-2xl border border-light-border dark:border-dark-border">
        <h1 className="mb-6 text-4xl font-bold text-light-text dark:text-dark-text">
          Team Not Found
        </h1>
        <p className="mb-10 text-lg leading-relaxed text-light-text dark:text-dark-text">
          We couldn't find the team "<strong className="font-semibold">{teamId}</strong>". 
          This could be because:
        </p>
        <ul className="mb-10 text-left text-base leading-relaxed text-light-text dark:text-dark-text">
          <li className="mb-2">• The team ID might be incorrect</li>
          <li className="mb-2">• The team may have been moved or removed</li>
          <li className="mb-2">• You might have an outdated link</li>
        </ul>
        <p className="mb-8 text-base text-light-text dark:text-dark-text">
          Please check the URL or try again. If you continue to have issues, please visit{' '}
          <a href="https://blawby.com/help" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
            blawby.com/help
          </a>
          {' '}or contact us on{' '}
          <a href="https://github.com/Blawby" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
            GitHub
          </a>
          {' '}for support.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              Try Again
            </Button>
          )}
          <Button 
            variant="secondary"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 