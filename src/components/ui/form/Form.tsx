import { createContext, ComponentChildren } from 'preact';
import { useState, useCallback, useContext, useEffect } from 'preact/hooks';
import { cn } from '../../../utils/cn';
import { ZodSchema } from 'zod';

export interface FormData {
  [key: string]: unknown;
}

export interface FormError {
  code: string;
  field: string;
  message: string;
}

export interface FormContextValue {
  data: FormData;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
  validateOnChange: boolean;
  validateOnBlur: boolean;
  setFieldValue: (field: string, value: unknown) => void;
  setFieldError: (field: string, error: FormError) => void;
  clearFieldError: (field: string) => void;
  setSubmitting: (submitting: boolean) => void;
  validate: () => boolean;
  reset: () => void;
  onFieldBlur: (field: string) => void;
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
  schema?: ZodSchema<unknown>;
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
  disabled = false,
  validateOnChange = false,
  validateOnBlur = false
}: FormProps) => {
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rehydrate form when initialData changes
  useEffect(() => {
    setData(initialData);
    setErrors([]); // Clear any stale validation errors
  }, [initialData]);

  const validate = useCallback(() => {
    const newErrors: FormError[] = [];
    
    // Use schema validation if provided
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const field = issue.path.length ? issue.path.join('.') : 'unknown';
          newErrors.push({
            code: 'invalid',
            field,
            message: issue.message
          });
        });
      }
      
      // Get all fields defined in the schema
      const schemaFields = new Set<string>();
      if (result.success && result.data) {
        // Extract field names from the parsed data structure
        Object.keys(result.data).forEach(key => schemaFields.add(key));
      } else if (result.error) {
        // Extract field names from error paths
        result.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            schemaFields.add(issue.path[0] as string);
          }
        });
      }
      
      // For fields not defined in schema, fall back to basic required validation
      Object.entries(data).forEach(([field, value]) => {
        if (!schemaFields.has(field) && (value === undefined || value === null || value === '')) {
          newErrors.push({
            code: 'required',
            field,
            message: `${field} is required`
          });
        }
      });
    } else {
      // No schema provided, use basic required validation for all fields
      Object.entries(data).forEach(([field, value]) => {
        if (value === undefined || value === null || value === '') {
          newErrors.push({
            code: 'required',
            field,
            message: `${field} is required`
          });
        }
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [data, schema]);

  // Handle validation on change
  useEffect(() => {
    if (validateOnChange) {
      validate();
    }
  }, [data, validateOnChange, validate]);

  const setFieldValue = useCallback((field: string, value: unknown) => {
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

  const reset = useCallback(() => {
    setData(initialData);
    setErrors([]);
    setIsSubmitting(false);
  }, [initialData]);

  const onFieldBlur = useCallback((_field: string) => {
    if (validateOnBlur) {
      validate();
    }
  }, [validateOnBlur, validate]);

  const handleSubmit = useCallback(async (e: Event) => {
    e.preventDefault();
    
    if (disabled || isSubmitting) return;
    
    const isValid = validate();
    if (!isValid) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit?.(data);
    } catch (_error) {
      // Form submission error
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
    validateOnChange,
    validateOnBlur,
    setFieldValue,
    setFieldError,
    clearFieldError,
    setSubmitting,
    validate,
    reset,
    onFieldBlur
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
