import { useState, useRef, useEffect } from 'preact/hooks';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { UserIcon } from '@heroicons/react/24/outline';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { Input, DatePicker } from '../ui/input';
import { Checkbox } from '../ui/input';

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

const PersonalInfoStep = ({ data, onComplete, onBack: _onBack }: PersonalInfoStepProps) => {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState<PersonalInfoData>(data);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfoData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfoData, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('onboarding.step1.required');
    }

    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = t('onboarding.step1.required');
    }

    // Validate birthday format if provided (now expects ISO date format YYYY-MM-DD)
    if (formData.birthday && formData.birthday.trim()) {
      const date = new Date(formData.birthday);
      if (isNaN(date.getTime())) {
        newErrors.birthday = t('validation.invalidDate');
      } else {
        // Check if the date is in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date > today) {
          newErrors.birthday = t('validation.futureDate');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onComplete(formData);
    
    // Only update state if component is still mounted
    if (mountedRef.current) {
      setIsSubmitting(false);
    }
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
          <Form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Full Name */}
              <FormField name="fullName">
                <FormItem>
                  <FormLabel>{t('onboarding.step1.fullName')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e)}
                      placeholder={t('onboarding.step1.fullNamePlaceholder')}
                      icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                      error={errors.fullName}
                    />
                  </FormControl>
                  {errors.fullName && (
                    <FormMessage>{errors.fullName}</FormMessage>
                  )}
                </FormItem>
              </FormField>

              {/* Birthday */}
              <FormField name="birthday">
                <FormItem>
                  <FormLabel>{t('onboarding.step1.birthday')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={formData.birthday || ''}
                      onChange={(value) => handleInputChange('birthday', value)}
                      placeholder={t('onboarding.step1.birthdayPlaceholder')}
                      format="date"
                      max={new Date().toISOString().split('T')[0]} // Prevent future dates
                      error={errors.birthday}
                    />
                  </FormControl>
                  {errors.birthday && (
                    <FormMessage>{errors.birthday}</FormMessage>
                  )}
                </FormItem>
              </FormField>
            </div>

            {/* Terms Agreement */}
            <FormField name="agreedToTerms">
              <FormItem>
                <div className="flex items-start space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={formData.agreedToTerms}
                      onChange={(e) => handleInputChange('agreedToTerms', e)}
                    />
                  </FormControl>
                  <div className="text-sm">
                    <FormLabel htmlFor="agreedToTerms" className="text-gray-700 dark:text-gray-300">
                      <Trans
                        i18nKey="onboarding.step1.termsAgreement"
                        components={{
                          termsLink: <a href="/terms" className="text-accent-600 dark:text-accent-400 hover:text-accent-500 dark:hover:text-accent-300 underline" aria-label="Terms of Service">Terms</a>,
                          privacyLink: <a href="/privacy" className="text-accent-600 dark:text-accent-400 hover:text-accent-500 dark:hover:text-accent-300 underline" aria-label="Privacy Policy">Privacy Policy</a>
                        }}
                      />
                    </FormLabel>
                    {errors.agreedToTerms && (
                      <FormMessage>{errors.agreedToTerms}</FormMessage>
                    )}
                  </div>
                </div>
              </FormItem>
            </FormField>

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
          </Form>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;
