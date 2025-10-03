import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { UserIcon, LockClosedIcon, EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import OnboardingModal, { OnboardingData } from './onboarding/OnboardingModal';
import { Logo } from './ui/Logo';
// No authentication required - authClient removed

interface AuthPageProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

const AuthPage = ({ mode = 'signin', onSuccess }: AuthPageProps) => {
  const { t } = useTranslation('auth');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check URL params for mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');
    if (urlMode === 'signin' || urlMode === 'signup') {
      setIsSignUp(urlMode === 'signup');
    }
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError(t('errors.passwordsDoNotMatch'));
          setLoading(false);
          return;
        }

        // Simulate API call for new user registration
        // Always create a new user for sign-up (like a real API would)
        const userId = `mock-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const mockUser = {
          id: userId,
          name: formData.name || formData.email.split('@')[0] || t('defaults.demoUserName'),
          email: formData.email,
          image: `https://i.pravatar.cc/300?u=${encodeURIComponent(formData.email)}`,
          teamId: null,
          role: 'user',
          phone: null,
          subscriptionTier: 'free' // Default to free tier
        };
        
        // Store new user data (this simulates API response)
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        
        // Dispatch custom event to notify UserProfile component
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: mockUser }));
        
                    setMessage(t('messages.accountCreated'));
        
        // Always show onboarding for new sign-ups
        console.log('New user registration, showing onboarding modal');
        setShowOnboarding(true);
      } else {
        // Simulate API call for sign-in
        // Check if user exists (simulate API lookup)
        const existingUser = localStorage.getItem('mockUser');
        
        if (existingUser) {
          // User exists - sign them in
          const userData = JSON.parse(existingUser);
          userData.email = formData.email; // Update email if different
          
          // Dispatch custom event to notify UserProfile component
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userData }));
          
                      setMessage(t('messages.signedIn'));
          
          // Call onSuccess callback and wait for it to complete before redirecting
          if (onSuccess) {
            await onSuccess();
          }
          // Redirect to home page after successful sign in and callback completion
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          // User doesn't exist - create new user (like some APIs do)
          const userId = `mock-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const mockUser = {
            id: userId,
            name: formData.email.split('@')[0] || t('defaults.demoUserName'),
            email: formData.email,
            image: `https://i.pravatar.cc/300?u=${encodeURIComponent(formData.email)}`,
            teamId: null,
            role: 'user',
            phone: null,
            subscriptionTier: 'free'
          };
          
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          
          // Dispatch custom event to notify UserProfile component
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: mockUser }));
          
                      setMessage(t('messages.accountCreatedAndSignedIn'));
          
          // Show onboarding for new users created via sign-in
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Check if this is a new Google user
      const existingUser = localStorage.getItem('mockUser');
      const isNewUser = !existingUser;
      
      // Generate unique ID for new users
      const userId = isNewUser ? `mock-user-google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : 'mock-user-google-123';
      
      // No actual authentication - just simulate success
      // Store mock user data in localStorage
      const mockUser = {
        id: userId,
        name: t('defaults.googleUserName'),
        email: 'user@gmail.com',
        image: 'https://i.pravatar.cc/300?u=google-user',
        teamId: null,
        role: 'user',
        phone: null,
        subscriptionTier: 'free' // Default to free tier
      };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      
      // Dispatch custom event to notify UserProfile component
      window.dispatchEvent(new CustomEvent('authStateChanged', { detail: mockUser }));
      
      setMessage(t('messages.googleSignedIn'));
      
      // Only show onboarding modal for new Google users
      if (isNewUser) {
        console.log('New Google user detected, showing onboarding modal');
        setShowOnboarding(true);
      } else {
        console.log('Existing Google user, skipping onboarding');
        // Redirect existing users immediately
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknownError'));
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed:', data);
    // Close onboarding modal and redirect to main app
    setShowOnboarding(false);
    // Redirect to main app where the welcome modal will show
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // Redirect to home page if onboarding is closed
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };



  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header with back button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
{t('navigation.backToHome')}
          </button>
        </div>
        
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {isSignUp ? t('signup.title') : t('signin.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {isSignUp ? t('signup.subtitle') : t('signin.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-light-card-bg dark:bg-dark-card-bg py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Google Sign In Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-dark-input-bg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
{t(isSignUp ? 'signup.googleSignIn' : 'signin.googleSignIn')}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-light-card-bg dark:bg-dark-card-bg text-gray-500 dark:text-gray-400">{t('common.orContinueWithEmail')}</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('signup.fullName')}
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required={isSignUp}
                      value={formData.name}
                      onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                      className="input-base input-with-icon relative block"
                      placeholder={t('signup.fullNamePlaceholder')}
                    />
                    <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(isSignUp ? 'signup.email' : 'signin.email')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onInput={(e) => handleInputChange('email', (e.target as HTMLInputElement).value)}
                    className="input-base input-with-icon relative block"
                    placeholder={t(isSignUp ? 'signup.emailPlaceholder' : 'signin.emailPlaceholder')}
                  />
                  <EnvelopeIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(isSignUp ? 'signup.password' : 'signin.password')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    value={formData.password}
                    onInput={(e) => handleInputChange('password', (e.target as HTMLInputElement).value)}
                    className="input-base input-with-icon relative block"
                    placeholder={t(isSignUp ? 'signup.passwordPlaceholder' : 'signin.passwordPlaceholder')}
                  />
                  <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('signup.confirmPassword')}
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required={isSignUp}
                      value={formData.confirmPassword}
                      onInput={(e) => handleInputChange('confirmPassword', (e.target as HTMLInputElement).value)}
                      className="input-base input-with-icon relative block"
                      placeholder={t('signup.confirmPasswordPlaceholder')}
                    />
                    <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  isSignUp ? t('signup.submit') : t('signin.submit')
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                  setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                }}
                className="text-sm text-accent-600 dark:text-accent-400 hover:text-accent-500 dark:hover:text-accent-300 transition-colors"
              >
                {isSignUp ? `${t('signup.hasAccount')} ${t('signup.signInLink')}` : `${t('signin.noAccount')} ${t('signin.signUpLink')}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default AuthPage;