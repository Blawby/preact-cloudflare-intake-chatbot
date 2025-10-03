import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import PersonalInfoStep from './PersonalInfoStep';
import UseCaseStep from './UseCaseStep';
import { mockUserDataService, OnboardingData } from '../../utils/mockUserData';
import { useToastContext } from '../../contexts/ToastContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

type OnboardingStep = 'personal' | 'useCase';

const OnboardingModal = ({ isOpen, onClose, onComplete }: OnboardingModalProps) => {
  const { t } = useTranslation('common');
  const { showError, showSuccess } = useToastContext();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    personalInfo: {
      fullName: '',
      birthday: undefined,
      agreedToTerms: false
    },
    useCase: {
      primaryUseCase: 'personal',
      additionalInfo: undefined
    },
    skippedSteps: []
  });

  // Load existing user data if available
  useEffect(() => {
    if (isOpen) {
      const userProfile = mockUserDataService.getUserProfile();
      if (userProfile.name) {
        setOnboardingData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: userProfile.name
          }
        }));
      }
    }
  }, [isOpen]);

  const handleStepComplete = async (step: OnboardingStep, data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({
      ...prev,
      ...data
    }));

    if (step === 'personal') {
      setCurrentStep('useCase');
    } else if (step === 'useCase') {
      // After use case step, complete onboarding and redirect to main app
      await handleComplete();
    }
  };

  const handleSkip = async (step: OnboardingStep) => {
    setOnboardingData(prev => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps, step]
    }));

    if (step === 'useCase') {
      // Skip use case step and complete onboarding
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    const completedData = {
      ...onboardingData,
      completedAt: new Date().toISOString()
    };

    try {
      // Save onboarding data to user preferences (single source of truth)
      mockUserDataService.setPreferences({
        onboardingCompleted: true,
        onboardingData: completedData
      });

      // Cache the completion status in localStorage for quick access
      // This is just a cache, not the source of truth
      localStorage.setItem('onboardingCompleted', 'true');

      // Show success notification
      showSuccess(
        t('onboarding.completed.title', 'Onboarding Complete!'),
        t('onboarding.completed.message', 'Welcome to Blawby AI! Your preferences have been saved.')
      );

      onComplete(completedData);
      onClose();
    } catch (error) {
      // Log the error for debugging in development
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Failed to save onboarding data:', error);
      }
      
      // Show error notification to user
      showError(
        t('onboarding.error.title', 'Save Failed'),
        t('onboarding.error.message', 'Unable to save your onboarding data. Please try again.')
      );
      
      // Don't close the modal or call onComplete - keep state consistent
      // User can retry by completing the step again
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <PersonalInfoStep
            data={onboardingData.personalInfo}
            onComplete={async (data) => await handleStepComplete('personal', { personalInfo: data })}
            onBack={onClose}
          />
        );
      case 'useCase':
        return (
          <UseCaseStep
            data={onboardingData.useCase}
            onComplete={async (data) => await handleStepComplete('useCase', { useCase: data })}
            onSkip={async () => await handleSkip('useCase')}
          />
        );
      default:
        return null;
    }
  };

  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type="fullscreen"
      showCloseButton={false}
    >
      <div className="h-full bg-white dark:bg-dark-bg flex flex-col">
        {renderStep()}
      </div>
    </Modal>
  );
};

export default OnboardingModal;
