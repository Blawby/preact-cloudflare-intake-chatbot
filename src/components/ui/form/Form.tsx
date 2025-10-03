import { createContext, ComponentChildren } from 'preact';
import { useState, useCallback, useContext } from 'preact/hooks';
import { cn } from '../../../utils/cn';
import { z, ZodSchema } from 'zod';
import { useFormValidation } from '../validation';

export interface FormData {
  [key: string]: any;
}

export interface FormError {
  code: string;
  field: string;
  message: string;
  hint?: string;
}

export interface FormContextValue {
  data: FormData;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: FormError) => void;
  clearFieldError: (field: string) => void;
  setSubmitting: (submitting: boolean) => void;
  validate: () => boolean;
  reset: () => void;
}

const FormContext = createContext<FormContextValue | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};

export interface FormProps {
  children: ComponentChildren;
  initialData?: FormData;
  onSubmit?: (data: FormData) => void | Promise<void>;
  schema?: ZodSchema<any>;
  className?: string;
  disabled?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const Form = ({
  children,
  initialData = {},
  onSubmit,
  schema,
  className = '',
  disabled = false
}: FormProps) => {
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear field error when value changes
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const setFieldError = useCallback((field: string, error: FormError) => {
    setErrors(prev => {
      const filtered = prev.filter(e => e.field !== field);
      return [...filtered, error];
    });
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const validate = useCallback(() => {
    // TODO: Implement Zod validation when available
    // For now, basic validation
    const newErrors: FormError[] = [];
    
    // Basic required field validation
    Object.entries(data).forEach(([field, value]) => {
      if (value === undefined || value === null || value === '') {
        newErrors.push({
          code: 'required',
          field,
          message: `${field} is required`,
          hint: 'Please fill in this field'
        });
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [data]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors([]);
    setIsSubmitting(false);
  }, [initialData]);

  const handleSubmit = useCallback(async (e: Event) => {
    e.preventDefault();
    
    if (disabled || isSubmitting) return;
    
    const isValid = validate();
    if (!isValid) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit?.(data);
    } catch (error) {
      console.error('Form submission error:', error);
      // TODO: Handle submission errors
    } finally {
      setIsSubmitting(false);
    }
  }, [data, disabled, isSubmitting, onSubmit, validate]);

  const isValid = errors.length === 0;

  const contextValue: FormContextValue = {
    data,
    errors,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldError,
    clearFieldError,
    setSubmitting,
    validate,
    reset
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={cn('space-y-4', className)}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};
