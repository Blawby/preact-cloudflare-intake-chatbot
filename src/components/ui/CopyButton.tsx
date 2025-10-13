import { ClipboardIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { useToastContext } from '../../contexts/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyButton = ({ text, label, className = '' }: CopyButtonProps) => {
  const { showSuccess } = useToastContext();
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied!', label || text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };
  
  return (
    <Button 
      variant="icon" 
      size="sm" 
      onClick={handleCopy} 
      aria-label="Copy to clipboard"
      className={className}
    >
      <ClipboardIcon className="w-4 h-4" />
    </Button>
  );
};
