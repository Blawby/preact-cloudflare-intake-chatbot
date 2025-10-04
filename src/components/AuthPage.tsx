import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import OnboardingModal from './onboarding/OnboardingModal';
import { OnboardingData } from '../utils/mockUserData';
import { Logo } from './ui/Logo';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input, EmailInput, PasswordInput } from './ui/input';
import { handleError } from '../utils/errorHandler';
// No authentication required - authClient removed

interface AuthPageProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void | Promise<void>;
  redirectDelay?: number;
}

const AuthPage = ({ mode = 'signin', onSuccess, redirectDelay = 1000 }: AuthPageProps) => {
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
    if (typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('mode');
        if (urlMode === 'signin' || urlMode === 'signup') {
          setIsSignUp(urlMode === 'signup');
        }
      } catch (error) {
        console.warn('Failed to parse URL parameters:', error);
      }
    }
  }, []);

  // Helper function to handle redirect with proper onSuccess awaiting
  const handleRedirect = async () => {
    if (onSuccess) {
      try {
        await onSuccess();
      } catch (error) {
        // onSuccess callback failed - use production-safe error handling
        handleError(error, {
          component: 'AuthPage',
          action: 'onSuccess-callback',
          mode
        }, {
          component: 'AuthPage',
          action: 'handleRedirect'
        });
        // Continue with redirect even if onSuccess fails
      }
    }
    
    // Reset loading state before delay so UI stops showing spinner
    setLoading(false);
    
    // Always respect the configured redirectDelay
    const delay = redirectDelay;
    
    const doRedirect = () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    };
    
    if (delay > 0) {
      setTimeout(doRedirect, delay);
    } else {
      doRedirect();
    }
  };

  const handleSubmit = async () => {
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
          password: formData.password, // Store password for validation (in production, this would be hashed)
          image: `https://i.pravatar.cc/300?u=${encodeURIComponent(formData.email)}`,
          teamId: null,
          role: 'user',
          phone: null,
          subscriptionTier: 'free' // Default to free tier
        };
        
        // Get existing users array or create new one
        let existingUsers: Array<{id: string; name: string; email: string; password: string | null; image: string; teamId: string | null; role: string; phone: string | null; subscriptionTier: string}> = [];
        if (typeof window !== 'undefined') {
          try {
            existingUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
          } catch (_error) {
            // Failed to parse existing users from localStorage
            existingUsers = [];
          }
        }
        
        // Check if user with this email already exists (case-insensitive)
        const emailExists = existingUsers.some(user => 
          user.email && user.email.toLowerCase() === mockUser.email.toLowerCase()
        );
        
        if (emailExists) {
          // Account already exists, set error
          setError(t('errors.accountExists'));
          setLoading(false);
          return;
        }
        
        // Add new user to the array
        existingUsers.push(mockUser);
        
        // Store updated users array and dispatch events only in browser environment
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('mockUsers', JSON.stringify(existingUsers));
          } catch (_error) {
            // Failed to store users in localStorage
            setError(t('errors.storageError'));
            setLoading(false);
            return;
          }
          
          // Also store as single user for backward compatibility
          try {
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
          } catch (_error) {
            // Failed to store user in localStorage
            setError(t('errors.storageError'));
            setLoading(false);
            return;
          }
          
          // Create user data without password for auth event
          const { password: _password, ...userDataWithoutPassword } = mockUser;
          
          // Dispatch custom event to notify UserProfile component
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userDataWithoutPassword }));
        }
        
                    setMessage(t('messages.accountCreated'));
        
        // Always show onboarding for new sign-ups
        // New user registration, showing onboarding modal
        setShowOnboarding(true);
      } else {
        // Simulate API call for sign-in
        if (typeof window !== 'undefined') {
          // Read mock users from localStorage as an array
          const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
          
          // Find user by email
          const user = mockUsers.find((u: {email: string; password: string}) => u.email === formData.email);
          
          if (user) {
            // Validate password (in production, this would be a secure hash comparison)
            if (user.password === formData.password) {
              // Create user data without password for auth event
              const { password: _password, ...userDataWithoutPassword } = user;
              
              // Dispatch custom event to notify UserProfile component
              window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userDataWithoutPassword }));
              
              setMessage(t('messages.signedIn'));
              
              // Redirect to home page after successful sign in, waiting for onSuccess if provided
              await handleRedirect();
            } else {
              // Password mismatch - use generic error to avoid user enumeration
              setError(t('errors.invalidCredentials'));
              setLoading(false);
              return;
            }
          } else {
            // User not found - use generic error to avoid user enumeration
            setError(t('errors.invalidCredentials'));
            setLoading(false);
            return;
          }
        } else {
          // In non-browser environment, show error
          setError(t('errors.browserRequired'));
          setLoading(false);
          return;
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
      if (isSignUp) {
        // Sign-up mode: Create new Google user and show onboarding
        const userId = `mock-user-google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const mockUser = {
          id: userId,
          name: t('defaults.googleUserName'),
          email: 'user@gmail.com',
          password: null, // Google users don't have passwords
          image: 'https://i.pravatar.cc/300?u=google-user',
          teamId: null,
          role: 'user',
          phone: null,
          subscriptionTier: 'free'
        };
        
        // Get existing users array or create new one
        if (typeof window !== 'undefined') {
          const existingUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
          
          // Add new user to the array
          existingUsers.push(mockUser);
          
          // Store updated users array
          localStorage.setItem('mockUsers', JSON.stringify(existingUsers));
          
          // Also store as single user for backward compatibility
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          
          // Create user data without password for auth event
          const { password: _password, ...userDataWithoutPassword } = mockUser;
          
          // Dispatch custom event to notify UserProfile component
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userDataWithoutPassword }));
        }
        
        setMessage(t('messages.googleSignedIn'));
        
        // Always show onboarding for new sign-ups
        setLoading(false);
        setShowOnboarding(true);
      } else {
        // Sign-in mode: Use existing mock user (simulate existing user)
        // Create a mock existing Google user for sign-in
        const existingMockUser = {
          id: 'mock-user-google-existing',
          name: t('defaults.googleUserName'),
          email: 'user@gmail.com',
          password: null, // Google users don't have passwords
          image: 'https://i.pravatar.cc/300?u=google-user',
          teamId: null,
          role: 'user',
          phone: null,
          subscriptionTier: 'free'
        };
        
        // Get existing users array or create new one
        if (typeof window !== 'undefined') {
          const existingUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
          
          // Check if this Google user already exists, if not add them
          const existingGoogleUser = existingUsers.find((u: {email: string}) => u.email === 'user@gmail.com');
          if (!existingGoogleUser) {
            existingUsers.push(existingMockUser);
            localStorage.setItem('mockUsers', JSON.stringify(existingUsers));
          }
          
          // Store the existing user data for backward compatibility
          localStorage.setItem('mockUser', JSON.stringify(existingMockUser));
          
          // Create user data without password for auth event
          const { password: _password, ...userDataWithoutPassword } = existingMockUser;
          
          // Dispatch custom event to notify UserProfile component
          window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userDataWithoutPassword }));
        }
        
        setMessage(t('messages.googleSignedIn'));
        
        // Sign-in should NOT show onboarding - redirect to main app
        setLoading(false);
        await handleRedirect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknownError'));
      setLoading(false);
    }
  };


  const handleBackToHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    // Development-only debug log with redacted sensitive data
    if (import.meta.env.DEV) {
      const _redactedData = {
        personalInfo: {
          fullName: data.personalInfo.fullName ? '[REDACTED]' : undefined,
          birthday: data.personalInfo.birthday ? '[REDACTED]' : undefined,
          agreedToTerms: data.personalInfo.agreedToTerms
        },
        useCase: {
          primaryUseCase: data.useCase.primaryUseCase,
          additionalInfo: data.useCase.additionalInfo ? '[REDACTED]' : undefined
        },
        completedAt: data.completedAt,
        skippedSteps: data.skippedSteps
      };
      // Onboarding completed with redacted data
    }
    // Persist onboarding completion flag before redirecting
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboardingCompleted', 'true');
    }
    // Close onboarding modal and redirect to main app
    setShowOnboarding(false);
    // Redirect to main app where the welcome modal will show, waiting for onSuccess if provided
    await handleRedirect();
  };

  const handleOnboardingClose = async () => {
    setShowOnboarding(false);
    // Redirect to home page if onboarding is closed, waiting for onSuccess if provided
    await handleRedirect();
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

          <Form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {isSignUp && (
                <FormField name="name">
                  {({ error, onChange }) => (
                    <FormItem>
                      <FormLabel htmlFor="signup-fullname">{t('signup.fullName')}</FormLabel>
                      <FormControl>
                        <Input
                          id="signup-fullname"
                          type="text"
                          required={isSignUp}
                          value={formData.name}
                          onChange={(value) => {
                            onChange(value);
                            setFormData(prev => ({ ...prev, name: String(value) }));
                          }}
                          placeholder={t('signup.fullNamePlaceholder')}
                          icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                          error={error?.message}
                        />
                      </FormControl>
                      {error && <FormMessage>{error.message}</FormMessage>}
                    </FormItem>
                  )}
                </FormField>
              )}

              <FormField name="email">
                {({ error, onChange }) => (
                  <FormItem>
                    <FormControl>
                      <EmailInput
                        label={t(isSignUp ? 'signup.email' : 'signin.email')}
                        required
                        value={formData.email}
                        onChange={(value) => {
                          onChange(value);
                          setFormData(prev => ({ ...prev, email: String(value) }));
                        }}
                        placeholder={t(isSignUp ? 'signup.emailPlaceholder' : 'signin.emailPlaceholder')}
                        error={error?.message}
                      />
                    </FormControl>
                    {error && <FormMessage>{error.message}</FormMessage>}
                  </FormItem>
                )}
              </FormField>

              <FormField name="password">
                {({ error, onChange }) => (
                  <FormItem>
                    <FormControl>
                      <PasswordInput
                        id="password-field"
                        label={t(isSignUp ? 'signup.password' : 'signin.password')}
                        required
                        value={formData.password}
                        onChange={(value) => {
                          onChange(value);
                          setFormData(prev => ({ ...prev, password: String(value) }));
                        }}
                        placeholder={t(isSignUp ? 'signup.passwordPlaceholder' : 'signin.passwordPlaceholder')}
                        error={error?.message}
                      />
                    </FormControl>
                    {error && <FormMessage>{error.message}</FormMessage>}
                  </FormItem>
                )}
              </FormField>

              {isSignUp && (
                <FormField name="confirmPassword">
                  {({ error, onChange }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          id="confirm-password-field"
                          label={t('signup.confirmPassword')}
                          required={isSignUp}
                          value={formData.confirmPassword}
                          onChange={(value) => {
                            onChange(value);
                            setFormData(prev => ({ ...prev, confirmPassword: String(value) }));
                          }}
                          placeholder={t('signup.confirmPasswordPlaceholder')}
                          error={error?.message}
                        />
                      </FormControl>
                      {error && <FormMessage>{error.message}</FormMessage>}
                    </FormItem>
                  )}
                </FormField>
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
          </Form>
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