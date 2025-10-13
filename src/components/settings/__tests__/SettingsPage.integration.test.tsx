import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../__tests__/test-utils';
import { SettingsPage } from '../SettingsPage';
import { useOrganizationManagement } from '../../../hooks/useOrganizationManagement';

// Mock the organization management hook
const mockLoadOrganizations = vi.fn();
const mockLoadInvitations = vi.fn();

// Create mutable mock object
const useOrgMgmtMock = {
  organizations: [],
  invitations: [],
  loading: false,
  error: null,
  loadOrganizations: mockLoadOrganizations,
  loadInvitations: mockLoadInvitations,
  createOrganization: vi.fn(),
  inviteMember: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
};

vi.mock('../../../hooks/useOrganizationManagement', () => ({
  useOrganizationManagement: vi.fn(),
}));

// Mock the payment upgrade hook
vi.mock('../../../hooks/usePaymentUpgrade', () => ({
  usePaymentUpgrade: () => ({
    upgradeToBusiness: vi.fn(),
    checkPaymentStatus: vi.fn(),
    loading: false,
    error: null,
  }),
}));

// Mock the toast context
vi.mock('../../../contexts/ToastContext', async () => {
  const actual = await vi.importActual<typeof import('../../../contexts/ToastContext')>(
    '../../../contexts/ToastContext'
  );
  return {
    ...actual,
    useToastContext: () => ({
      showSuccess: vi.fn(),
      showError: vi.fn(),
    }),
  };
});

// Mock the navigation hook
const mockNavigate = vi.fn();
vi.mock('../../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the organization context
vi.mock('../../../contexts/OrganizationContext', async () => {
  const actual = await vi.importActual<typeof import('../../../contexts/OrganizationContext')>(
    '../../../contexts/OrganizationContext'
  );
  return {
    ...actual,
    useOrganization: () => ({
      currentOrganization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
      },
    }),
  };
});

// Mock the feature flags
vi.mock('../../../config/features', async () => {
  const actual = await vi.importActual<typeof import('../../../config/features')>(
    '../../../config/features'
  );
  return {
    ...actual,
    useFeatureFlag: (flag: string) =>
      flag === 'enableMultipleOrganizations' ? false : actual.useFeatureFlag(flag),
  };
});

// Mock the auth client
vi.mock('../../../lib/authClient', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/authClient')>(
    '../../../lib/authClient'
  );
  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      signOut: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Return the key as the translation
  }),
  I18nextProvider: ({ children }: { children: any }) => children,
}));

// Mock preact-iso useLocation
vi.mock('preact-iso', () => ({
  useLocation: () => ({
    path: '/settings',
  }),
}));

describe('SettingsPage Integration Tests', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadOrganizations.mockClear();
    mockLoadInvitations.mockClear();
    mockNavigate.mockClear();
    mockOnClose.mockClear();
    
    // Reset the mutable mock object to default values
    useOrgMgmtMock.organizations = [];
    useOrgMgmtMock.invitations = [];
    useOrgMgmtMock.loading = false;
    useOrgMgmtMock.error = null;
    useOrgMgmtMock.loadOrganizations = mockLoadOrganizations;
    useOrgMgmtMock.loadInvitations = mockLoadInvitations;
    useOrgMgmtMock.createOrganization = vi.fn();
    useOrgMgmtMock.inviteMember = vi.fn();
    useOrgMgmtMock.acceptInvitation = vi.fn();
    useOrgMgmtMock.declineInvitation = vi.fn();
    
    // Set up the mock return value
    vi.mocked(useOrganizationManagement).mockReturnValue(useOrgMgmtMock);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render settings page with all navigation items', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should show general page by default', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('General Settings')).toBeInTheDocument();
  });

  it('should navigate to organization page when organization is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const organizationNav = screen.getByText('Organization');
    fireEvent.click(organizationNav);
    
    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Manage your organization settings and members.')).toBeInTheDocument();
    });
  });

  it('should navigate to notifications page when notifications is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const notificationsNav = screen.getByText('Notifications');
    fireEvent.click(notificationsNav);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  it('should navigate to account page when account is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const accountNav = screen.getByText('Account');
    fireEvent.click(accountNav);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
  });

  it('should navigate to security page when security is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const securityNav = screen.getByText('Security');
    fireEvent.click(securityNav);
    
    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument();
    });
  });

  it('should navigate to help page when help is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const helpNav = screen.getByText('Help');
    fireEvent.click(helpNav);
    
    await waitFor(() => {
      expect(screen.getByText('Help & Support')).toBeInTheDocument();
    });
  });

  it('should handle sign out when sign out is clicked', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const signOutNav = screen.getByText('Sign Out');
    fireEvent.click(signOutNav);
    
    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to sign out?')).toBeInTheDocument();
    });
  });

  it('should close settings modal when close button is clicked', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close settings modal when backdrop is clicked', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const backdrop = screen.getByTestId('settings-backdrop');
    fireEvent.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close settings modal when content is clicked', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    const content = screen.getByTestId('settings-content');
    fireEvent.click(content);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle mobile view correctly', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} isMobile={true} />);
    
    // Should show mobile header
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
  });

  it('should handle desktop view correctly', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} isMobile={false} />);
    
    // Should show sidebar navigation
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('should navigate to business upgrade from account page', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    // Go to account page
    const accountNav = screen.getByText('Account');
    fireEvent.click(accountNav);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    // Click upgrade button (if business tier)
    const upgradeButton = screen.queryByText('Upgrade to Business');
    if (upgradeButton) {
      fireEvent.click(upgradeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Business Plan')).toBeInTheDocument();
      });
    }
  });

  it('should navigate to organization details from organization page', async () => {
    const mockOrganizations = [
      {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    // Update the mutable mock object for this test scenario
    useOrgMgmtMock.organizations = mockOrganizations;

    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    // Go to organization page
    const organizationNav = screen.getByText('Organization');
    fireEvent.click(organizationNav);
    
    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });
    
    // Click on organization
    const organizationCard = screen.getByText('Test Organization');
    fireEvent.click(organizationCard);
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings/organization-details?orgId=org-1');
  });

  it('should handle keyboard navigation', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    // Focus on the first navigation item (General)
    const generalNav = screen.getByText('General');
    generalNav.focus();
    
    // Verify General is focused initially
    expect(document.activeElement).toBe(generalNav);
    
    // Press ArrowDown to move to next navigation item
    fireEvent.keyDown(generalNav, { key: 'ArrowDown' });
    
    // Should focus next navigation item (Notifications)
    const notificationsNav = screen.getByText('Notifications');
    expect(document.activeElement).toBe(notificationsNav);
    
    // Press Enter to activate the navigation item
    fireEvent.keyDown(notificationsNav, { key: 'Enter' });
    
    // Should navigate to notifications page
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
    
    // Verify the navigation item has active state
    expect(notificationsNav).toHaveAttribute('aria-current', 'page');
  });

  it('should handle ArrowUp navigation', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    // Focus on the second navigation item (Notifications)
    const notificationsNav = screen.getByText('Notifications');
    notificationsNav.focus();
    
    // Verify Notifications is focused initially
    expect(document.activeElement).toBe(notificationsNav);
    
    // Press ArrowUp to move to previous navigation item
    fireEvent.keyDown(notificationsNav, { key: 'ArrowUp' });
    
    // Should focus previous navigation item (General)
    const generalNav = screen.getByText('General');
    expect(document.activeElement).toBe(generalNav);
  });

  it('should handle escape key to close modal', () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should maintain navigation state when switching between pages', async () => {
    render(<SettingsPage isOpen={true} onClose={mockOnClose} />);
    
    // Go to organization page
    const organizationNav = screen.getByText('Organization');
    fireEvent.click(organizationNav);
    
    await waitFor(() => {
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });
    
    // Go back to general
    const generalNav = screen.getByText('General');
    fireEvent.click(generalNav);
    
    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });
    
    // Organization nav should still be visible
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });
});
