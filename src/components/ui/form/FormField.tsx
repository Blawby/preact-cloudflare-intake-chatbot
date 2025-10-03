import { ComponentChildren } from 'preact';
import { useFormContext } from './Form';
import { cn } from '../../../utils/cn';

export interface FormFieldProps {
  name: string;
  children: ComponentChildren;
  className?: string;
}

export const FormField = ({
  name,
  children,
  className = ''
}: FormFieldProps) => {
  const { data, errors, setFieldValue, clearFieldError } = useFormContext();
  
  const fieldValue = data[name];
  const fieldError = errors.find(error => error.field === name);
  
  const handleChange = (value: any) => {
    setFieldValue(name, value);
    if (fieldError) {
      clearFieldError(name);
    }
  };

  return (
    <div className={cn('form-field', className)}>
      {children}
    </div>
  );
};
