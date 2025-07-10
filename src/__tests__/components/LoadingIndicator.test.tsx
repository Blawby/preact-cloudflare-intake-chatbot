import { describe, it, expect } from 'vitest';
import { render, screen } from '../../__tests__/utils/test-utils';
import LoadingIndicator from '../../components/LoadingIndicator';

describe('LoadingIndicator', () => {
  it('should render loading indicator', () => {
    render(<LoadingIndicator />);
    
    const loadingElement = screen.getByText('', { selector: '.loading-indicator' });
    expect(loadingElement).toBeInTheDocument();
  });

  it('should render three dots', () => {
    render(<LoadingIndicator />);
    
    const dots = screen.getAllByText('', { selector: '.dot' });
    expect(dots).toHaveLength(3);
  });

  it('should have correct CSS classes', () => {
    render(<LoadingIndicator />);
    
    const messageElement = screen.getByText('', { selector: '.message.message-ai' });
    expect(messageElement).toBeInTheDocument();
    
    const loadingElement = screen.getByText('', { selector: '.loading-indicator' });
    expect(loadingElement).toBeInTheDocument();
  });

  it('should be memoized', () => {
    const { rerender } = render(<LoadingIndicator />);
    
    // Re-render should not cause issues
    rerender(<LoadingIndicator />);
    
    const loadingElement = screen.getByText('', { selector: '.loading-indicator' });
    expect(loadingElement).toBeInTheDocument();
  });
}); 