import type { ComponentChildren } from 'preact';
import type { Role } from '../../../hooks/useOrganizationManagement';

const ROLE_STYLES = {
  owner: 'bg-accent-500 text-gray-900',
  admin: 'bg-primary-500 text-white',
  attorney: 'bg-blue-500 text-white',
  paralegal: 'bg-green-500 text-white'
};

interface RoleBadgeProps {
  role: Role;
  children?: ComponentChildren;
  className?: string;
}

export const RoleBadge = ({ role, children, className }: RoleBadgeProps) => {
  const roleStyles = ROLE_STYLES[role] || '';
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded';
  const combinedClasses = className ? `${baseClasses} ${roleStyles} ${className}` : `${baseClasses} ${roleStyles}`;
  
  return (
    <span className={combinedClasses}>
      {children || role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};
