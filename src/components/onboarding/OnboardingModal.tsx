import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import PersonalInfoStep from './PersonalInfoStep';
import UseCaseStep from './UseCaseStep';
import { mockUserDataService } from '../../utils/mockUserData';

export interface OnboardingData {
  personalInfo: {
    fullName: string;
    birthday?: string;
    agreedToTerms: boolean;
  };
  useCase: {
    primaryUseCase: 'personal' | 'business' | 'research' | 'documents' | 'other';
    additionalInfo?: string;
  };
  completedAt?: string;
  skippedSteps: string[];
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

type OnboardingStep = 'personal' | 'useCase';

const OnboardingModal = ({ isOpen, onClose, onComplete }: OnboardingModalProps) => {
  console.log('OnboardingModal rendered with isOpen:', isOpen);
  const { t } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    personalInfo: {
      fullName: '',
      birthday: '',
      agreedToTerms: false
    },
    useCase: {
      primaryUseCase: 'personal',
      additionalInfo: ''
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

  const handleStepComplete = (step: OnboardingStep, data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({
      ...prev,
      ...data
    }));

    if (step === 'personal') {
      setCurrentStep('useCase');
    } else if (step === 'useCase') {
      // After use case step, complete onboarding and redirect to main app
      handleComplete();
    }
  };

  const handleSkip = (step: OnboardingStep) => {
    setOnboardingData(prev => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps, step]
    }));

    if (step === 'useCase') {
      // Skip use case step and complete onboarding
      handleComplete();
    }
  };

  const handleComplete = () => {
    const completedData = {
      ...onboardingData,
      completedAt: new Date().toISOString()
    };

    // Save onboarding data to user preferences
    mockUserDataService.setPreferences({
      onboardingCompleted: true,
      onboardingData: completedData
    });

    // Set flag for main app to show welcome modal
    localStorage.setItem('onboardingCompleted', 'true');

    onComplete(completedData);
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'useCase') {
      setCurrentStep('personal');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'personal':
        return (
          <PersonalInfoStep
            data={onboardingData.personalInfo}
            onComplete={(data) => handleStepComplete('personal', { personalInfo: data })}
            onBack={onClose}
          />
        );
      case 'useCase':
        return (
          <UseCaseStep
            data={onboardingData.useCase}
            onComplete={(data) => handleStepComplete('useCase', { useCase: data })}
            onSkip={() => handleSkip('useCase')}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  console.log('OnboardingModal render - isOpen:', isOpen, 'currentStep:', currentStep);
  
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
