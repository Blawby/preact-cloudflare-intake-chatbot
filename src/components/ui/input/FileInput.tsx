import { forwardRef, useState, useCallback } from 'preact/compat';
import { cn } from '../../../utils/cn';

export interface FileInputProps {
  value?: FileList | File[];
  onChange?: (files: FileList | File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  description?: string;
  error?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  labelKey?: string;
  descriptionKey?: string;
  errorKey?: string;
  namespace?: string;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(({
  value,
  onChange,
  accept,
  multiple = false,
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  variant = 'default',
  label,
  description,
  error,
  maxSize,
  maxFiles,
  labelKey,
  descriptionKey,
  errorKey,
  namespace = 'common'
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  // TODO: Add i18n support when useTranslation hook is available
  // const { t } = useTranslation(namespace);
  // const displayLabel = labelKey ? t(labelKey) : label;
  // const displayDescription = descriptionKey ? t(descriptionKey) : description;
  // const displayError = errorKey ? t(errorKey) : error;
  
  const displayLabel = label;
  const displayDescription = description;
  const displayError = error;

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    default: 'border-gray-300 dark:border-gray-600 focus:ring-accent-500 focus:border-accent-500',
    error: 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500',
    success: 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
  };

  const handleFileChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files) {
      onChange?.(Array.from(files));
    }
  }, [onChange]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer?.files;
    if (files) {
      onChange?.(Array.from(files));
    }
  }, [onChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const files = Array.isArray(value) ? value : value ? Array.from(value) : [];
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="w-full">
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {displayLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-colors',
          'hover:border-accent-400 dark:hover:border-accent-500',
          isDragOver ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20' : 'border-gray-300 dark:border-gray-600',
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-accent-600 dark:text-accent-400">
                Click to upload
              </span>
              {' '}or drag and drop
            </p>
            {accept && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {accept}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {maxSize && file.size > maxSize && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  Too large
                </span>
              )}
            </div>
          ))}
          
          {maxSize && totalSize > maxSize && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Total size exceeds {formatFileSize(maxSize)}
            </p>
          )}
        </div>
      )}
      
      {displayDescription && !displayError && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {displayDescription}
        </p>
      )}
      
      {displayError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {displayError}
        </p>
      )}
    </div>
  );
});
