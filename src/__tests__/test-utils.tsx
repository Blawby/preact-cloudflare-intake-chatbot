import { render, RenderOptions } from '@testing-library/preact';
import { ComponentChildren } from 'preact';
import { ToastProvider } from '../contexts/ToastContext';
import { OrganizationProvider } from '../contexts/OrganizationContext';

// Mock the navigation hook
const mockNavigate = vi.fn();
vi.mock('../hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the feature flags
vi.mock('../config/features', () => ({
  useFeatureFlag: (flag: string) => {
    if (flag === 'enableMultipleOrganizations') return false;
    return false;
  },
}));

// Mock the auth client
vi.mock('../lib/authClient', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

interface AllTheProvidersProps {
  children: ComponentChildren;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ToastProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </ToastProvider>
  );
};

const customRender = (
  ui: ComponentChildren,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/preact';

// Override render method
export { customRender as render };
