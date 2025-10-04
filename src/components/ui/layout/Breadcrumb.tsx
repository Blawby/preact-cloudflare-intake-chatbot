import { FunctionComponent } from 'preact';
import { cn } from '../../../utils/cn';

export interface BreadcrumbStep {
  id: string;
  label: string;
  href?: string;
  status?: 'completed' | 'current' | 'upcoming';
}

export interface BreadcrumbProps {
  steps: BreadcrumbStep[];
  className?: string;
  ariaLabel?: string;
  onStepClick?: (step: BreadcrumbStep) => void;
}

const statusClasses: Record<NonNullable<BreadcrumbStep['status']>, string> = {
  completed: 'text-accent-300 border-accent-400',
  current: 'text-white border-white',
  upcoming: 'text-gray-400 border-gray-600'
};

export const Breadcrumb: FunctionComponent<BreadcrumbProps> = ({
  steps,
  className = '',
  ariaLabel,
  onStepClick
}) => {
  return (
    <nav aria-label={ariaLabel ?? 'Progress'} className={cn('flex items-center space-x-2 text-sm', className)}>
      {steps.map((step, index) => {
        const status = step.status ?? 'upcoming';
        const isLast = index === steps.length - 1;
        const buttonClasses = cn(
          'px-3 py-1 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500',
          statusClasses[status]
        );

        const handleClick = () => {
          if (onStepClick) {
            onStepClick(step);
          } else if (step.href) {
            window.location.assign(step.href);
          }
        };

        return (
          <div key={step.id} className="flex items-center space-x-2">
            <button
              type="button"
              className={buttonClasses}
              onClick={handleClick}
              aria-current={status === 'current' ? 'step' : undefined}
              disabled={status === 'current'}
            >
              {step.label}
            </button>
            {!isLast && <span className="text-gray-500">/</span>}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
