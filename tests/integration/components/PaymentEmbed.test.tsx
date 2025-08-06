import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import PaymentEmbed from '../../../src/components/PaymentEmbed';

describe('PaymentEmbed Component', () => {
  const mockProps = {
    paymentUrl: 'https://staging.blawby.com/pay/test-invoice',
    amount: 75,
    description: 'Legal consultation fee',
    paymentId: 'pay_test_123'
  };

  it('renders payment embed with correct information', () => {
    render(<PaymentEmbed {...mockProps} />);
    
    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('$75')).toBeInTheDocument();
    // Description is only shown in fallback mode, not in iframe mode
  });

  it('renders fallback with description when iframe fails', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    render(<PaymentEmbed {...mockProps} />);
    
    // Wait for the fallback to appear
    await screen.findByText('Open Payment Page');
    expect(screen.getByText('Legal consultation fee')).toBeInTheDocument();
  });

  it('renders iframe with correct src', () => {
    render(<PaymentEmbed {...mockProps} />);
    
    const iframe = screen.getByTitle('Payment Form');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', mockProps.paymentUrl);
  });

  it('shows loading state initially', () => {
    render(<PaymentEmbed {...mockProps} />);
    
    expect(screen.getByText('Loading payment form...')).toBeInTheDocument();
  });

  it('handles external link click', () => {
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true
    });

    render(<PaymentEmbed {...mockProps} />);
    
    const externalLinkButton = screen.getByText('Open in new tab');
    fireEvent.click(externalLinkButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      mockProps.paymentUrl,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('handles close button when onClose is provided', () => {
    const mockOnClose = vi.fn();
    render(<PaymentEmbed {...mockProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close payment');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });


}); 