import { useState } from 'preact/hooks';
import { Button } from '../../ui/Button';
import { useToastContext } from '../../../contexts/ToastContext';
import { useNavigation } from '../../../utils/navigation';

export interface MFAEnrollmentPageProps {
  className?: string;
}

export const MFAEnrollmentPage = ({
  className = ''
}: MFAEnrollmentPageProps) => {
  const { showSuccess, showError } = useToastContext();
  const { navigate } = useNavigation();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Mock QR code data - in real app, this would come from your backend
  const qrCodeData = 'otpauth://totp/BlawbyAI:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=BlawbyAI';
  const manualCode = 'JBSWY3DPEHPK3PXP';

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      showError('Code required', 'Please enter the verification code from your authenticator app');
      return;
    }

    if (verificationCode.length < 6) {
      showError('Invalid code', 'Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      // Here you would verify the code with your backend
      // await authService.verifyMFACode(verificationCode);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('MFA enabled', 'Multi-factor authentication has been successfully enabled');
      navigate('/settings/security');
    } catch (error) {
      showError('Verification failed', 'Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyManualCode = () => {
    navigator.clipboard.writeText(manualCode);
    showSuccess('Copied', 'Manual code copied to clipboard');
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-dark-bg ${className}`}>
      {/* Header */}
      <div className="px-6 py-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/settings/security')}
            className="mb-6 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center"
          >
            ← Back to Security
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            Secure your account
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        <div className="max-w-md mx-auto text-center space-y-8">
          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scan the QR Code below using your preferred authenticator app and then enter the provided one-time code below.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Mock QR Code - in real app, you'd use a QR code library */}
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-black dark:bg-white rounded grid grid-cols-8 gap-1 p-2">
                    {/* Mock QR pattern */}
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-full h-full rounded-sm ${
                          Math.random() > 0.5 ? 'bg-white dark:bg-black' : 'bg-black dark:bg-white'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    QR Code
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting Link */}
          <div>
            <button
              onClick={handleCopyManualCode}
              className="text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 underline"
            >
              Trouble scanning?
            </button>
          </div>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-dark-bg text-gray-500 dark:text-gray-400">
                Then
              </span>
            </div>
          </div>

          {/* Code Input */}
          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Enter your one-time code*
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            {/* Continue Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleVerification}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>

          {/* Footer Links */}
          <div className="pt-8 border-t border-gray-200 dark:border-dark-border">
            <div className="flex justify-center space-x-4 text-sm">
              <a
                href="#"
                className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
              >
                Terms of Use
              </a>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <a
                href="#"
                className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
