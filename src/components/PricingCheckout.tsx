import { FunctionComponent } from 'preact';
import { useNavigation } from '../utils/navigation';
import { useTranslation } from './ui/i18n/useTranslation';
import { Button } from './ui/Button';

interface PricingCheckoutProps {
  className?: string;
}

const PricingCheckout: FunctionComponent<PricingCheckoutProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { t } = useTranslation('common');

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-8 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <h1>{t('pricing.checkout')}</h1>
        
        <div style={{ marginTop: '2rem' }}>
          <Button 
            type="button"
            variant="primary"
            size="lg"
            onClick={() => navigate('/pricing/confirmation')}
            aria-label={t('pricing.pay')}
            className="w-full"
          >
            {t('pricing.pay')}
          </Button>
          
          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={() => navigate('/pricing/cart')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {t('pricing.backToCart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCheckout;
