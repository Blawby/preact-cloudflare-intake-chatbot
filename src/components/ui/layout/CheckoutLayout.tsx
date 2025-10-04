import { FunctionComponent, ComponentChildren } from 'preact';
import { Breadcrumb, BreadcrumbStep } from './Breadcrumb';

export interface CheckoutLayoutProps {
  className?: string;
  breadcrumbs: BreadcrumbStep[];
  breadcrumbAriaLabel: string;
  title: string;
  subtitle?: string;
  children: ComponentChildren;
}

const CheckoutLayout: FunctionComponent<CheckoutLayoutProps> = ({
  className = '',
  breadcrumbs,
  breadcrumbAriaLabel,
  title,
  subtitle,
  children
}) => {
  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex justify-start mb-6 sm:mb-8 min-h-0">
          <Breadcrumb steps={breadcrumbs} ariaLabel={breadcrumbAriaLabel} />
        </div>

        <header className="space-y-1 mb-6">
          <h1 className="text-3xl font-bold text-white focus:outline-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-300">{subtitle}</p>
          )}
        </header>

        {children}
      </div>
    </div>
  );
};

export default CheckoutLayout;
