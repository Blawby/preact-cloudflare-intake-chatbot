import { FunctionComponent } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastComponent: FunctionComponent<ToastProps> = ({ toast, onRemove }) => {
  const [_isVisible, setIsVisible] = useState(true);
  const visibilityTimerRef = useRef<number | null>(null);
  const removalTimerRef = useRef<number | null>(null);

  const handleRemove = () => {
    setIsVisible(false);
    removalTimerRef.current = globalThis.setTimeout(() => onRemove(toast.id), 300);
  };

  useEffect(() => {
    const duration = toast.duration || 5000; // Default 5 seconds
    visibilityTimerRef.current = globalThis.setTimeout(handleRemove, duration);

    return () => {
      if (visibilityTimerRef.current) {
        globalThis.clearTimeout(visibilityTimerRef.current);
        visibilityTimerRef.current = null;
      }
      if (removalTimerRef.current) {
        globalThis.clearTimeout(removalTimerRef.current);
        removalTimerRef.current = null;
      }
    };
  }, [toast.id, toast.duration, onRemove, handleRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`max-w-sm w-full ${getBackgroundColor()} border rounded-lg shadow-lg p-4 relative`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {toast.title}
          </h3>
          {toast.message && (
            <p className="mt-1 text-sm text-gray-600">
              {toast.message}
            </p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleRemove}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ToastComponent;
