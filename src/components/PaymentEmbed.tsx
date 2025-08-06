import { FunctionComponent, useState, useEffect, useRef } from 'preact/compat';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(600);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Test if the URL can be embedded
    const testIframeEmbedding = async () => {
      try {
        // Try to fetch the URL to check if it's embeddable
        const response = await fetch(paymentUrl, { 
          method: 'HEAD',
          mode: 'no-cors' // This will fail if CORS is not allowed
        });
        // If we get here, the URL might be embeddable
        setShowFallback(false);
      } catch (error) {
        console.warn('Payment URL may not be embeddable, showing fallback');
        setShowFallback(true);
      }
    };

    // For staging.blawby.com, we know it has X-Frame-Options restrictions
    // so we'll show the fallback immediately
    if (paymentUrl.includes('staging.blawby.com')) {
      console.log('🎯 [PaymentEmbed] Detected staging.blawby.com URL, showing fallback');
      setShowFallback(true);
    } else {
      testIframeEmbedding();
    }
  }, [paymentUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    setShowFallback(true);
  };

  const handleExternalLink = () => {
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Fallback component when iframe embedding fails
  if (showFallback) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden my-4 shadow-lg">
        <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white m-0">Complete Payment</h3>
            {amount && (
              <span className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                ${amount}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md transition-colors"
              aria-label="Close payment"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="p-4 sm:p-6 text-center">
          {description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
              {description}
            </p>
          )}
          
          <div className="flex justify-center">
            <button
              onClick={handleExternalLink}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none px-4 sm:px-6 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Open Payment Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden my-4 shadow-lg">
      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">Complete Payment</h3>
          {amount && (
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              ${amount}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md transition-colors"
            aria-label="Close payment"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="relative min-h-[300px] sm:min-h-[400px]">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p>Loading payment form...</p>
          </div>
        )}
        
        {hasError && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="mb-4 text-sm">Unable to load payment form. Please use the external link below.</p>
            <button
              onClick={handleExternalLink}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none px-6 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Open Payment Page
            </button>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={paymentUrl}
          className="w-full border-none bg-white dark:bg-gray-800"
          style={{ height: `${iframeHeight}px` }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Payment Form"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
        />
      </div>
      
      <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={handleExternalLink}
          className="flex items-center gap-2 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-500"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          Open in new tab
        </button>
      </div>
    </div>
  );
};

export default PaymentEmbed; 