import { FunctionComponent } from 'preact';
import { cn } from '../../../utils/cn';
import { useNavigation } from '../../../utils/navigation';

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
  completed: 'text-accent-300',
  current: 'text-white font-medium',
  upcoming: 'text-gray-400'
};

export const Breadcrumb: FunctionComponent<BreadcrumbProps> = ({
  steps,
  className = '',
  ariaLabel,
  onStepClick
}) => {
  const { navigate } = useNavigation();
  return (
    <nav aria-label={ariaLabel ?? 'Progress'} className={cn('flex items-center space-x-2 text-sm', className)}>
      {steps.map((step, index) => {
        const status = step.status ?? 'upcoming';
        const isLast = index === steps.length - 1;
        const buttonClasses = cn(
          'transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500',
          statusClasses[status],
          status === 'current' && 'pointer-events-none'
        );

        const handleClick = () => {
          if (onStepClick) {
            onStepClick(step);
          } else if (step.href) {
            // Use SPA-aware navigation when available, fallback to full page navigation
            try {
              navigate(step.href);
            } catch (error) {
              // Fallback to full page navigation if router navigation fails
              console.warn('Router navigation failed, falling back to full page navigation:', error);
              if (typeof window !== 'undefined') {
                window.location.assign(step.href);
              }
            }
          }
        };

        return (
          <div key={step.id} className="flex items-center space-x-2">
            <button
              type="button"
              className={buttonClasses}
              onClick={handleClick}
              aria-current={status === 'current' ? 'step' : undefined}
              aria-disabled={status === 'current' ? 'true' : undefined}
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
