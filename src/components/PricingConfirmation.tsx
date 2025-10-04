import { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useNavigation } from '../utils/navigation';
import { mockPaymentDataService } from '../utils/mockPaymentData';
import { useTranslation } from './ui/i18n/useTranslation';

interface PricingConfirmationProps {
  className?: string;
}

const PricingConfirmation: FunctionComponent<PricingConfirmationProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { t } = useTranslation('common');
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update user subscription on page load
  useEffect(() => {
    const processSubscription = async () => {
      try {
        const currentCart = mockPaymentDataService.getCurrentCart();
        if (currentCart) {
          await mockPaymentDataService.updateUserSubscription(currentCart.planTier);
          mockPaymentDataService.clearAllSessions();
        }
      } catch (_err) {
        // console.error('Failed to update subscription:', _err);
        setError('Failed to update subscription. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };
    processSubscription();
  }, []);

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-8 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <h1>{t('pricing.paymentSuccessful')}</h1>
        
        {isProcessing && (
          <div className="mt-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              <p className="mt-2 text-gray-300">Processing your subscription...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-8 p-4 bg-red-600 rounded-lg">
            <p className="text-white">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-800 rounded text-white"
            >
              Try Again
            </button>
          </div>
        )}
        
        {!isProcessing && !error && (
          <div className="mt-8">
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              {t('pricing.goToDashboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingConfirmation;
