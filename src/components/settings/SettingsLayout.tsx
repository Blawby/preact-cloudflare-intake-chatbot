import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsPage } from './SettingsPage';
import { THEME } from '../../utils/constants';

interface SettingsLayoutProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const SettingsLayout = ({
  isMobile = false,
  onClose,
  className = ''
}: SettingsLayoutProps) => {
  const [showSettings, setShowSettings] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setShowSettings(false);
    // Delay the onClose callback to allow exit animation to complete
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 250); // Match the animation duration
  }, [onClose]);

  // Handle Escape key, body scroll, and click outside for overlay
  useEffect(() => {
    const isModalVisible = showSettings;
    if (!isModalVisible) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    // Prevent body scroll when overlay is open
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Restore body scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showSettings, handleClose]);

  return (
    <AnimatePresence>
      {showSettings && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 backdrop-blur-sm ${
              isMobile 
                ? 'bg-black bg-opacity-50' // Darker backdrop for mobile
                : 'bg-black bg-opacity-20' // Lighter backdrop for desktop
            }`}
            style={{ zIndex: THEME.zIndex.settings }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          />
          {/* Settings Panel */}
          <motion.div
            ref={dropdownRef}
            className={`fixed bg-white dark:bg-dark-bg overflow-hidden rounded-lg shadow-2xl ${
              isMobile 
                ? 'inset-x-0 bottom-0 top-0' // Full screen on mobile
                : 'top-8 left-8 right-8 bottom-8 max-w-4xl mx-auto' // Centered modal on desktop
            } ${className}`}
            style={{ zIndex: THEME.zIndex.settingsContent }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              duration: 0.25, 
              ease: [0.25, 0.46, 0.45, 0.94] // iOS-like easing for smooth slide
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
          >
            <div className="h-full">
              <h1 id="settings-dialog-title" className="sr-only">Settings</h1>
              <SettingsPage 
                isMobile={isMobile}
                onClose={handleClose}
                className="h-full"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
