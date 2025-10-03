import { useState } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface PersonalInfoData {
  fullName: string;
  birthday?: string;
  agreedToTerms: boolean;
}

interface PersonalInfoStepProps {
  data: PersonalInfoData;
  onComplete: (data: PersonalInfoData) => void;
  onBack: () => void;
}

const PersonalInfoStep = ({ data, onComplete, onBack }: PersonalInfoStepProps) => {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState<PersonalInfoData>(data);
  const [errors, setErrors] = useState<Partial<PersonalInfoData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalInfoData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('onboarding.step1.required');
    }

    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = t('onboarding.step1.required');
    }

    // Validate birthday format if provided
    if (formData.birthday && formData.birthday.trim()) {
      const birthdayRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      if (!birthdayRegex.test(formData.birthday)) {
        newErrors.birthday = 'Please enter a valid date (MM/DD/YYYY)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onComplete(formData);
    setIsSubmitting(false);
  };

  const handleInputChange = (field: keyof PersonalInfoData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('onboarding.step1.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('onboarding.step1.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-dark-card-bg py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('onboarding.step1.fullName')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onInput={(e) => handleInputChange('fullName', (e.target as HTMLInputElement).value)}
                    className={`input-base input-with-icon relative block ${
                      errors.fullName ? 'error' : ''
                    }`}
                    placeholder={t('onboarding.step1.fullNamePlaceholder')}
                  />
                  <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
                )}
              </div>

              {/* Birthday */}
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('onboarding.step1.birthday')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="birthday"
                    name="birthday"
                    type="text"
                    value={formData.birthday || ''}
                    onInput={(e) => handleInputChange('birthday', (e.target as HTMLInputElement).value)}
                    className={`input-base input-with-icon relative block ${
                      errors.birthday ? 'error' : ''
                    }`}
                    placeholder={t('onboarding.step1.birthdayPlaceholder')}
                  />
                  <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.birthday && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.birthday}</p>
                )}
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="agreedToTerms"
                  name="agreedToTerms"
                  type="checkbox"
                  checked={formData.agreedToTerms}
                  onChange={(e) => handleInputChange('agreedToTerms', (e.target as HTMLInputElement).checked)}
                  className="focus:ring-accent-500 h-4 w-4 text-accent-600 border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreedToTerms" className="text-gray-700 dark:text-gray-300">
                  {t('onboarding.step1.termsAgreement').split('Terms')[0]}
                  <a href="/terms" className="text-accent-600 dark:text-accent-400 hover:text-accent-500 dark:hover:text-accent-300 underline">
                    {t('onboarding.step1.termsLink')}
                  </a>
                  {t('onboarding.step1.termsAgreement').split('Terms')[1].split('Privacy Policy')[0]}
                  <a href="/privacy" className="text-accent-600 dark:text-accent-400 hover:text-accent-500 dark:hover:text-accent-300 underline">
                    {t('onboarding.step1.privacyLink')}
                  </a>
                  {t('onboarding.step1.termsAgreement').split('Privacy Policy')[1]}
                </label>
                {errors.agreedToTerms && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.agreedToTerms}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('onboarding.step1.continue')
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;
