import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useOrganizationManagement } from '../useOrganizationManagement';

// Mock the API endpoints
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the toast context
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../../contexts/ToastContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/ToastContext')>(
    '../../contexts/ToastContext'
  );
  return {
    ...actual,
    useToastContext: () => ({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    }),
  };
});

// Mock the auth client
vi.mock('../../lib/authClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/authClient')>(
    '../../lib/authClient'
  );
  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
      }),
    },
  };
});

// Mock the API config
vi.mock('../../config/api', async () => {
  const actual = await vi.importActual<typeof import('../../config/api')>(
    '../../config/api'
  );
  return {
    ...actual,
    getOrganizationsEndpoint: () => 'http://localhost:8787/api/organizations',
    getOrganizationWorkspaceEndpoint: (orgId: string, resource: string) => 
      `http://localhost:8787/api/organizations/${orgId}/workspace/${resource}`,
  };
});

describe('useOrganizationManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    // Default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
      status: 200,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadOrganizations', () => {
    it('should load organizations successfully', async () => {
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
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockOrganizations }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/me',
        expect.objectContaining({
          credentials: 'include',
        })
      );

      expect(result.current.organizations).toEqual(mockOrganizations);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors when loading organizations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.organizations).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to load organizations');
    });

    it('should handle network errors when loading organizations', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.organizations).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to load organizations');
    });
  });

  describe('loadInvitations', () => {
    it('should load invitations successfully', async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockInvitations }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/me/invitations',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );

      expect(result.current.invitations).toEqual(mockInvitations);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors when loading invitations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.invitations).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch invitations');
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to fetch invitations',
        'Unable to load invitations. Please try again.'
      );
    });
  });

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      const newOrgData = {
        name: 'New Organization',
        slug: 'new-org',
        config: {
          consultationFee: 100,
          requiresPayment: false,
          availableServices: ['General Consultation'],
        },
      };

      const createdOrg = {
        id: 'org-new',
        ...newOrgData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createdOrg }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.createOrganization(newOrgData);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newOrgData),
          credentials: 'include',
        })
      );

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Organization created',
        'Your organization has been created successfully.'
      );
    });

    it('should handle validation errors when creating organization', async () => {
      const invalidOrgData = {
        name: '', // Invalid: empty name
        slug: 'new-org',
        config: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Name is required',
        }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.createOrganization(invalidOrgData);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to create organization',
        'Name is required'
      );
    });
  });

  describe('inviteMember', () => {
    it('should invite member successfully', async () => {
      const inviteData = {
        email: 'newuser@example.com',
        role: 'attorney' as const,
        organizationId: 'org-1',
      };

      const mockInvitation = {
        id: 'inv-new',
        email: inviteData.email,
        role: inviteData.role,
        status: 'pending',
        organizationId: inviteData.organizationId,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockInvitation }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.sendInvitation('org-1', inviteData.email, inviteData.role);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/org-1/members',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inviteData.email,
            role: inviteData.role,
          }),
          credentials: 'include',
        })
      );

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Invitation sent',
        'An invitation has been sent to newuser@example.com'
      );
    });

    it('should handle duplicate invitation errors', async () => {
      const inviteData = {
        email: 'existing@example.com',
        role: 'attorney' as const,
        organizationId: 'org-1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: 'User is already a member of this organization',
        }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.sendInvitation('org-1', inviteData.email, inviteData.role);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to send invitation',
        'User is already a member of this organization'
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.updateMemberRole('org-1', 'user-1', 'admin');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/org-1/members',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: 'user-1', role: 'admin' }),
          credentials: 'include',
        })
      );

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Role updated',
        'Member role has been updated successfully.'
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.removeMember('org-1', 'user-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/org-1/members?userId=user-1',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Member removed',
        'Member has been removed from the organization.'
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const invitationId = 'inv-1';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationManagement());

      await act(async () => {
        await result.current.acceptInvitation(invitationId);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/organizations/me/invitations/inv-1/accept',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Invitation accepted',
        'You have successfully joined the organization.'
      );
    });
  });


  describe('initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useOrganizationManagement());

      // Wait for initial refetch to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.organizations).toEqual([]);
      expect(result.current.invitations).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
