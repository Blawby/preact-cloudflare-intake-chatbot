import { FunctionComponent } from 'preact';
import { useEffect } from 'preact/hooks';
import { useNavigation } from '../utils/navigation';
import { mockPaymentDataService } from '../utils/mockPaymentData';
import { useTranslation } from './ui/i18n/useTranslation';

interface PricingConfirmationProps {
  className?: string;
}

const PricingConfirmation: FunctionComponent<PricingConfirmationProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { t } = useTranslation('common');

  // Update user subscription on page load
  useEffect(() => {
    // Get the current cart to determine the plan tier
    const currentCart = mockPaymentDataService.getCurrentCart();
    if (currentCart) {
      // Update the user's subscription tier
      mockPaymentDataService.updateUserSubscription(currentCart.planTier);
      
      // Clear the cart session since payment is complete
      mockPaymentDataService.clearAllSessions();
    }
  }, []);

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-8 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <h1>{t('pricing.paymentSuccessful')}</h1>
        
        <div style="margin-top: 2rem;">
          <button onClick={() => navigate('/')}>
            {t('pricing.goToDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingConfirmation;
