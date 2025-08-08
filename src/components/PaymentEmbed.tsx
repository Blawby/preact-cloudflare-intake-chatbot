import { FunctionComponent, useState, useEffect, useRef } from 'preact/compat';
import { XMarkIcon, ArrowTopRightOnSquareIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentEmbedProps {
  paymentUrl: string;
  amount?: number;
  description?: string;
  onPaymentComplete?: (paymentId: string) => void;
  onClose?: () => void;
}

const PaymentEmbed: FunctionComponent<PaymentEmbedProps> = ({
  paymentUrl,
  amount,
  description,
  onPaymentComplete,
  onClose
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleIframeLoad = () => {
    console.log('✅ Payment iframe loaded successfully');
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    console.error('❌ Payment iframe failed to load');
    setIsLoading(false);
    setHasError(true);
  };

  const handleExternalLink = () => {
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handlePaymentClick = () => {
    setShowPaymentModal(true);
    setHasError(false);
    setIsLoading(true);
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
  };

  const handlePaymentComplete = (paymentId: string) => {
    handlePaymentModalClose();
    if (onPaymentComplete) {
      onPaymentComplete(paymentId);
    }
  };

  // Check for CSP violations
  useEffect(() => {
    const handleSecurityViolation = (event: SecurityPolicyViolationEvent) => {
      console.error('🚨 Security Policy Violation:', event);
      if (event.violatedDirective === 'frame-ancestors') {
        setHasError(true);
        setIsLoading(false);
      }
    };

    window.addEventListener('securitypolicyviolation', handleSecurityViolation);
    return () => window.removeEventListener('securitypolicyviolation', handleSecurityViolation);
  }, []);

  // Shared Payment Modal/Drawer Component
  const PaymentModal = () => {
    return (
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            className={`fixed inset-0 ${isMobile ? '' : 'flex items-center justify-center p-4'}`}
            style={{ zIndex: 1002 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="modal"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={handlePaymentModalClose}
            />
            
            {/* Content */}
            <motion.div 
              className={`shadow-2xl overflow-hidden ${
                isMobile 
                  ? 'fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]' 
                  : 'relative rounded-xl max-w-4xl w-full max-h-[90vh]'
              }`}
              style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)'
              }}
              initial={isMobile ? { y: "100%" } : { scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { scale: 1 }}
              exit={isMobile ? { y: "100%" } : { scale: 0.95 }}
              transition={isMobile ? { 
                type: "tween", 
                duration: 0.3, 
                ease: [0.25, 0.46, 0.45, 0.94] 
              } : { 
                type: "spring" 
              }}
              key={`content-${isMobile}`}
            >
              {/* Handle for mobile */}
              {isMobile && (
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}></div>
                </div>
              )}
              
              {/* Header */}
              <div 
                className="flex justify-between items-center p-4 border-b"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex items-center gap-3">
                  <CreditCardIcon className="w-6 h-6" style={{ color: 'var(--accent-color)' }} />
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold m-0 !mt-0 !mb-0 text-gray-900 dark:text-white">Complete Payment</h3>
                  {amount && (
                    <span 
                      className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold"
                      style={{
                        backgroundColor: 'var(--accent-color)',
                        color: '#1a1a1a'
                      }}
                    >
                      ${amount}
                    </span>
                  )}
                </div>
                <button
                  onClick={handlePaymentModalClose}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--text-color)' }}
                  aria-label="Close payment"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              {/* Payment iframe - Fixed height container */}
              <div className={`relative ${isMobile ? 'h-[400px]' : 'h-[500px]'}`}>
                {isLoading && !hasError && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  >
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm opacity-70">Loading payment form...</p>
                    </div>
                  </div>
                )}
                
                {hasError && (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                    style={{
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  >
                    <div className="mb-4">
                      <CreditCardIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">
                        Unable to load payment form. This may be due to security restrictions.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleExternalLink}
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                      Open Payment Page
                    </Button>
                    <p className="text-xs opacity-50 mt-2">
                      The payment form will open in a new tab for security reasons.
                    </p>
                  </div>
                )}
                
                <iframe
                  ref={iframeRef}
                  src={paymentUrl}
                  className="w-full h-full border-none"
                  style={{ backgroundColor: 'var(--bg-color)' }}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title="Payment Form"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Main Payment Link Component
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 my-4 w-full">
        <Button
          variant="primary"
          size="lg"
          onClick={handlePaymentClick}
          style={{ backgroundColor: '#d4af37', color: '#1a1a1a' }}
        >
          <CreditCardIcon className="w-5 h-5 mr-2" />
          Pay ${amount || '0'}
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={handleExternalLink}
          className="flex-1 sm:flex-none"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
          Open in Browser
        </Button>
      </div>
      
      <PaymentModal />
    </>
  );
};

export default PaymentEmbed; 