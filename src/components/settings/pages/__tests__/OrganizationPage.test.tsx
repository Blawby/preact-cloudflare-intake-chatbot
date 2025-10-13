import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../../__tests__/test-utils';
import { OrganizationPage } from '../OrganizationPage';

// Mock the organization management hook
const mockLoadOrganizations = vi.fn();
const mockLoadInvitations = vi.fn();
const mockCreateOrganization = vi.fn();
const mockInviteMember = vi.fn();
const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();

vi.mock('../../../hooks/useOrganizationManagement', () => ({
  useOrganizationManagement: () => ({
    organizations: [],
    invitations: [],
    loading: false,
    error: null,
    loadOrganizations: mockLoadOrganizations,
    loadInvitations: mockLoadInvitations,
    createOrganization: mockCreateOrganization,
    inviteMember: mockInviteMember,
    acceptInvitation: mockAcceptInvitation,
    declineInvitation: mockDeclineInvitation,
  }),
}));

// Mock the toast context
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

// Mock the feature flags
vi.mock('../../../config/features', () => ({
  useFeatureFlag: (flag: string) => {
    if (flag === 'enableMultipleOrganizations') return false;
    return false;
  },
}));

// Mock the navigation hook
const mockNavigate = vi.fn();
vi.mock('../../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('OrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadOrganizations.mockClear();
    mockLoadInvitations.mockClear();
    mockCreateOrganization.mockClear();
    mockInviteMember.mockClear();
    mockAcceptInvitation.mockClear();
    mockDeclineInvitation.mockClear();
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render organization page with correct title', () => {
    render(<OrganizationPage className="test-class" />);
    
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Manage your organization settings and members.')).toBeInTheDocument();
  });

  it('should load organizations and invitations on mount', () => {
    render(<OrganizationPage />);
    
    expect(mockLoadOrganizations).toHaveBeenCalled();
    expect(mockLoadInvitations).toHaveBeenCalled();
  });

  it('should show loading state when loading', () => {
    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: [],
      invitations: [],
      loading: true,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error state when there is an error', () => {
    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: [],
      invitations: [],
      loading: false,
      error: 'Failed to load organizations',
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    expect(screen.getByText('Failed to load organizations')).toBeInTheDocument();
  });

  it('should display organizations when available', () => {
    const mockOrganizations = [
      {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        config: {
          consultationFee: 150,
          requiresPayment: true,
          availableServices: ['Family Law'],
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: mockOrganizations,
      invitations: [],
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('test-org')).toBeInTheDocument();
  });

  it('should display invitations when available', () => {
    const mockInvitations = [
      {
        id: 'inv-1',
        email: 'user@example.com',
        role: 'attorney',
        status: 'pending',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
      },
    ];

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: [],
      invitations: mockInvitations,
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('Attorney')).toBeInTheDocument();
  });

  it('should open create organization modal when create button is clicked', async () => {
    render(<OrganizationPage />);
    
    const createButton = screen.getByText('Create Organization');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Organization')).toBeInTheDocument();
    });
  });

  it('should open invite member modal when invite button is clicked', async () => {
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

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: mockOrganizations,
      invitations: [],
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    const inviteButton = screen.getByText('Invite Member');
    fireEvent.click(inviteButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    });
  });

  it('should handle organization creation', async () => {
    mockCreateOrganization.mockResolvedValueOnce(undefined);
    
    render(<OrganizationPage />);
    
    // Open create modal
    const createButton = screen.getByText('Create Organization');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Organization')).toBeInTheDocument();
    });
    
    // Fill form
    const nameInput = screen.getByLabelText('Organization Name');
    const slugInput = screen.getByLabelText('Organization Slug');
    
    fireEvent.input(nameInput, { target: { value: 'New Organization' } });
    fireEvent.input(slugInput, { target: { value: 'new-org' } });
    
    // Submit form
    const submitButton = screen.getByText('Create Organization');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        name: 'New Organization',
        slug: 'new-org',
        config: {
          consultationFee: 0,
          requiresPayment: false,
          availableServices: ['General Consultation'],
          jurisdiction: {
            type: 'national',
            description: 'Available nationwide',
            supportedStates: ['all'],
            supportedCountries: ['US'],
          },
        },
      });
    });
  });

  it('should handle member invitation', async () => {
    mockInviteMember.mockResolvedValueOnce(undefined);
    
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

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: mockOrganizations,
      invitations: [],
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    // Open invite modal
    const inviteButton = screen.getByText('Invite Member');
    fireEvent.click(inviteButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    });
    
    // Fill form
    const emailInput = screen.getByLabelText('Email Address');
    const roleSelect = screen.getByLabelText('Role');
    
    fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(roleSelect, { target: { value: 'attorney' } });
    
    // Submit form
    const submitButton = screen.getByText('Send Invitation');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        role: 'attorney',
        organizationId: 'org-1',
      });
    });
  });

  it('should handle invitation acceptance', async () => {
    mockAcceptInvitation.mockResolvedValueOnce(undefined);
    
    const mockInvitations = [
      {
        id: 'inv-1',
        email: 'user@example.com',
        role: 'attorney',
        status: 'pending',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
      },
    ];

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: [],
      invitations: mockInvitations,
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);
    
    await waitFor(() => {
      expect(mockAcceptInvitation).toHaveBeenCalledWith('inv-1');
    });
  });

  it('should handle invitation decline', async () => {
    mockDeclineInvitation.mockResolvedValueOnce(undefined);
    
    const mockInvitations = [
      {
        id: 'inv-1',
        email: 'user@example.com',
        role: 'attorney',
        status: 'pending',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
      },
    ];

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: [],
      invitations: mockInvitations,
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    const declineButton = screen.getByText('Decline');
    fireEvent.click(declineButton);
    
    await waitFor(() => {
      expect(mockDeclineInvitation).toHaveBeenCalledWith('inv-1');
    });
  });

  it('should navigate to organization details when organization is clicked', async () => {
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

    vi.mocked(require('../../../../hooks/useOrganizationManagement').useOrganizationManagement).mockReturnValue({
      organizations: mockOrganizations,
      invitations: [],
      loading: false,
      error: null,
      loadOrganizations: mockLoadOrganizations,
      loadInvitations: mockLoadInvitations,
      createOrganization: mockCreateOrganization,
      inviteMember: mockInviteMember,
      acceptInvitation: mockAcceptInvitation,
      declineInvitation: mockDeclineInvitation,
    });

    render(<OrganizationPage />);
    
    const organizationCard = screen.getByText('Test Organization');
    fireEvent.click(organizationCard);
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings/organization-details?orgId=org-1');
  });

  it('should show empty state when no organizations or invitations', () => {
    render(<OrganizationPage />);
    
    expect(screen.getByText('No organizations found')).toBeInTheDocument();
    expect(screen.getByText('Create your first organization to get started.')).toBeInTheDocument();
  });
});
