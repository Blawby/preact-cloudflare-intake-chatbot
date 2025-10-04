import { FunctionComponent } from 'preact';
import { useNavigation } from '../utils/navigation';
import { useTranslation } from './ui/i18n/useTranslation';

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
        
        <div style="margin-top: 2rem;">
          <button onClick={() => navigate('/pricing/confirmation')}>
            {t('pricing.pay')}
          </button>
          
          <div style="margin-top: 1rem;">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/pricing/cart'); }}>
              {t('pricing.backToCart')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCheckout;
