import { useEffect, useMemo, useState } from 'preact/hooks';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';

// Constants for allowed field names
export const ALLOWED_FIELDS = ['name', 'email', 'phone', 'location', 'opposingParty'] as const;
export type AllowedField = typeof ALLOWED_FIELDS[number];

export interface ContactFormProps {
  onSubmit: (data: ContactData) => void | Promise<void>;
  fields?: string[];
  required?: string[];
  message?: string;
  initialValues?: Partial<ContactData>;
}

export interface ContactData {
  name: string;
  email: string;
  phone: string;
  location: string;
  opposingParty?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  opposingParty?: string;
}

interface ValidatedProps {
  fields: readonly AllowedField[];
  required: readonly AllowedField[];
  message?: string;
}

/**
 * Validates and normalizes ContactForm props with proper type guards
 */
function validateContactFormProps(
  fields: unknown,
  required: unknown, 
  message: unknown
): ValidatedProps {
  // Validate fields with type guard
  const validatedFields = (() => {
    if (!Array.isArray(fields) || fields.length === 0) {
      console.error('[ContactForm] Invalid fields prop. Using defaults.');
      return ALLOWED_FIELDS;
    }
    
    const valid = [...new Set(fields)]
      .filter((f): f is AllowedField => 
        typeof f === 'string' && ALLOWED_FIELDS.includes(f as AllowedField)
      );
    
    if (valid.length === 0) {
      console.error('[ContactForm] No valid fields. Using defaults.');
      return ALLOWED_FIELDS;
    }
    
    if (valid.length !== fields.length) {
      const invalidFields = fields.filter(field => 
        !ALLOWED_FIELDS.includes(field as AllowedField)
      );
      console.warn('[ContactForm] Some invalid field names were filtered out:', invalidFields);
    }
    
    return valid;
  })();
  
  // Validate required with type guard  
  const validatedRequired = (() => {
    if (!Array.isArray(required)) {
      console.error('[ContactForm] Invalid required prop. Using defaults.');
      return ['name', 'email', 'phone'] as const;
    }
    
    const valid = [...new Set(required)]
      .filter((f): f is AllowedField =>
        typeof f === 'string' && 
        ALLOWED_FIELDS.includes(f as AllowedField) &&
        validatedFields.includes(f)
      );
    
    if (valid.length !== required.length) {
      const invalidRequired = required.filter(field => 
        !ALLOWED_FIELDS.includes(field as AllowedField) || 
        !validatedFields.includes(field as AllowedField)
      );
      console.warn('[ContactForm] Some invalid required fields were filtered out:', invalidRequired);
    }
    
    return valid.length > 0 ? valid : ['name', 'email', 'phone'] as const;
  })();
  
  // Validate message
  const validatedMessage = typeof message === 'string' ? message : undefined;
  
  return {
    fields: validatedFields,
    required: validatedRequired,
    message: validatedMessage
  };
}

function normalizeInitialValues(values?: Partial<ContactData>): Partial<ContactData> {
  return {
    name: typeof values?.name === 'string' && values.name.trim() ? values.name.trim() : undefined,
    email: typeof values?.email === 'string' && values.email.trim() ? values.email.trim() : undefined,
    phone: typeof values?.phone === 'string' && values.phone.trim() ? values.phone.trim() : undefined,
    location: typeof values?.location === 'string' && values.location.trim() ? values.location.trim() : undefined,
    opposingParty: typeof values?.opposingParty === 'string' && values.opposingParty.trim() ? values.opposingParty.trim() : undefined
  };
}

export function ContactForm({
  onSubmit,
  fields = ALLOWED_FIELDS,
  required = ['name', 'email', 'phone'],
  message,
  initialValues
}: ContactFormProps): JSX.Element {
  // Validate props without mutation
  const validatedProps = validateContactFormProps(fields, required, message);
  const { fields: validFields, required: validRequired, message: validMessage } = validatedProps;
  
  // Validate onSubmit function
  if (typeof onSubmit !== 'function') {
    console.error('[ContactForm] Invalid onSubmit prop: must be a function. Returning fallback UI.');
    return (
      <div class="bg-white dark:bg-dark-bg border border-red-300 dark:border-red-600 rounded-lg p-6 shadow-sm" data-testid="contact-form-error">
        <div class="text-red-600 dark:text-red-400 text-center">
          <p class="font-medium">Contact Form Error</p>
          <p class="text-sm mt-1">Invalid configuration. Please check the form setup.</p>
        </div>
      </div>
    );
  }

  const normalizedInitialValues = useMemo(() => normalizeInitialValues(initialValues), [
    initialValues?.name,
    initialValues?.email,
    initialValues?.phone,
    initialValues?.location,
    initialValues?.opposingParty
  ]);

  const { isDark } = useTheme();
  const [formData, setFormData] = useState<ContactData>(() => ({
    name: normalizedInitialValues.name ?? '',
    email: normalizedInitialValues.email ?? '',
    phone: normalizedInitialValues.phone ?? '',
    location: normalizedInitialValues.location ?? '',
    opposingParty: normalizedInitialValues.opposingParty ?? ''
  }));
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const validateField = (field: keyof ContactData, value: string): string | undefined => {
    if (validRequired.includes(field as AllowedField) && !value.trim()) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    switch (field) {
      case 'email':
        if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (value && !/^[\+]?[1-9][\d\s\-\(\)]{7,15}$/.test(value)) {
          return 'Please enter a valid phone number';
        }
        break;
    }
    return undefined;
  };

  const handleInputChange = (field: keyof ContactData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (!isDirty) {
      setIsDirty(true);
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear submission error when user starts typing
    if (submissionError) {
      setSubmissionError(null);
    }
  };

  const validateAllFields = (): { errors: FormErrors; hasErrors: boolean } => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    // Validate required fields
    for (const field of validRequired) {
      const error = validateField(field as keyof ContactData, formData[field as keyof ContactData]);
      if (error) {
        newErrors[field as keyof ContactData] = error;
        hasErrors = true;
      }
    }

    // Also validate non-required fields if they have values
    for (const field of validFields) {
      if (!validRequired.includes(field) && formData[field as keyof ContactData]) {
        const error = validateField(field as keyof ContactData, formData[field as keyof ContactData]);
        if (error) {
          newErrors[field as keyof ContactData] = error;
          hasErrors = true;
        }
      }
    }

    return { errors: newErrors, hasErrors };
  };

  const handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionError(null); // Clear any previous submission errors

    try {
      // Validate all fields
      const { errors: validationErrors, hasErrors } = validateAllFields();

      if (hasErrors) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      // Submit the form
      await onSubmit(formData);
      
      // If we get here, submission was successful
      // Clear any previous errors
      setErrors({});
      setSubmissionError(null);
    } catch (error) {
      // Structured logging with contextual metadata (PII sanitized)
      const logData = {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        formData: {
          hasName: !!formData.name,
          hasEmail: !!formData.email,
          hasPhone: !!formData.phone,
          hasLocation: !!formData.location,
          hasOpposingParty: !!formData.opposingParty
        },
        fields: validFields,
        required: validRequired,
        timestamp: new Date().toISOString(),
        component: 'ContactForm'
      };
      
      console.error('[ContactForm] Error submitting contact form:', logData);
      
      // Set user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while submitting your information. Please try again.';
      setSubmissionError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isDirty) {
      return;
    }

    setFormData(prev => {
      let changed = false;
      const updated: ContactData = { ...prev };

      for (const field of validFields) {
        const key = field as keyof ContactData;
        const value = normalizedInitialValues[key];
        if (typeof value === 'string' && value.trim() && !prev[key]) {
          updated[key] = value;
          changed = true;
        }
      }

      return changed ? updated : prev;
    });
  }, [normalizedInitialValues, validFields, isDirty]);

  return (
    <div class="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-6 shadow-sm" data-testid="contact-form">
      {validMessage && (
        <div class="mb-4 text-gray-700 dark:text-gray-300">
          {validMessage}
        </div>
      )}
      
      {submissionError && (
        <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md" data-testid="submission-error">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800 dark:text-red-200">{submissionError}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} class="space-y-4">
        {validFields.includes('name') && (
          <div>
            <label for="contact-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name {validRequired.includes('name') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              value={formData.name}
              onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your full name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>
        )}

        {validFields.includes('email') && (
          <div>
            <label for="contact-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address {validRequired.includes('email') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={formData.email}
              onInput={(e) => handleInputChange('email', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your email address"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>
        )}

        {validFields.includes('phone') && (
          <div>
            <label for="contact-phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number {validRequired.includes('phone') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onInput={(e) => handleInputChange('phone', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your phone number"
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
            )}
          </div>
        )}

        {validFields.includes('location') && (
          <div>
            <label for="contact-location" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location {validRequired.includes('location') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-location"
              name="location"
              type="text"
              value={formData.location}
              onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                errors.location ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your city and state"
              disabled={isSubmitting}
            />
            {errors.location && (
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
            )}
          </div>
        )}

        {validFields.includes('opposingParty') && (
          <div>
            <label for="contact-opposing-party" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opposing Party (Optional)
            </label>
            <input
              id="contact-opposing-party"
              name="opposingParty"
              type="text"
              value={formData.opposingParty || ''}
              onInput={(e) => handleInputChange('opposingParty', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Name of the other party involved (if any)"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div class="pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="contact-form-submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Contact Information'}
          </Button>
        </div>
      </form>
    </div>
  );
}
