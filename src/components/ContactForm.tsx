import { useState } from 'preact/hooks';
import { Button } from './ui/Button';

export interface ContactFormProps {
  onSubmit: (data: ContactData) => void;
  fields?: string[];
  required?: string[];
  message?: string;
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

export function ContactForm({ onSubmit, fields = ['name', 'email', 'phone', 'location', 'opposingParty'], required = ['name', 'email', 'phone'], message }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    opposingParty: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: keyof ContactData, value: string): string | undefined => {
    if (required.includes(field) && !value.trim()) {
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

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newErrors: FormErrors = {};
    let hasErrors = false;

    for (const field of required) {
      const error = validateField(field as keyof ContactData, formData[field as keyof ContactData]);
      if (error) {
        newErrors[field as keyof ContactData] = error;
        hasErrors = true;
      }
    }

    // Also validate non-required fields if they have values
    for (const field of fields) {
      if (!required.includes(field) && formData[field as keyof ContactData]) {
        const error = validateField(field as keyof ContactData, formData[field as keyof ContactData]);
        if (error) {
          newErrors[field as keyof ContactData] = error;
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Submit the form
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting contact form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" data-testid="contact-form">
      {message && (
        <div class="mb-4 text-gray-700">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} class="space-y-4">
        {fields.includes('name') && (
          <div>
            <label for="contact-name" class="block text-sm font-medium text-gray-700 mb-1">
              Full Name {required.includes('name') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              value={formData.name}
              onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p class="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
        )}

        {fields.includes('email') && (
          <div>
            <label for="contact-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email Address {required.includes('email') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={formData.email}
              onInput={(e) => handleInputChange('email', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p class="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        )}

        {fields.includes('phone') && (
          <div>
            <label for="contact-phone" class="block text-sm font-medium text-gray-700 mb-1">
              Phone Number {required.includes('phone') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onInput={(e) => handleInputChange('phone', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your phone number"
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p class="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        )}

        {fields.includes('location') && (
          <div>
            <label for="contact-location" class="block text-sm font-medium text-gray-700 mb-1">
              Location {required.includes('location') && <span class="text-red-500">*</span>}
            </label>
            <input
              id="contact-location"
              name="location"
              type="text"
              value={formData.location}
              onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your city and state"
              disabled={isSubmitting}
            />
            {errors.location && (
              <p class="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>
        )}

        {fields.includes('opposingParty') && (
          <div>
            <label for="contact-opposing-party" class="block text-sm font-medium text-gray-700 mb-1">
              Opposing Party (Optional)
            </label>
            <input
              id="contact-opposing-party"
              name="opposingParty"
              type="text"
              value={formData.opposingParty || ''}
              onInput={(e) => handleInputChange('opposingParty', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
