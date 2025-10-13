import { useState, useCallback, useEffect } from 'preact/hooks';
import { 
  getOrganizationsEndpoint, 
  getOrganizationWorkspaceEndpoint 
} from '../config/api';

// Types
export type Role = 'owner' | 'admin' | 'attorney' | 'paralegal';

export interface Organization {
  id: string;
  slug: string;
  name: string;
  description?: string;
  config?: {
    metadata?: {
      subscriptionPlan?: string;
      planStatus?: string;
    };
  };
}

export interface Member {
  userId: string;
  role: Role;
  email: string;
  name?: string;
  image?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
}

export interface CreateOrgData {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateOrgData {
  name?: string;
  description?: string;
}

interface UseOrganizationManagementReturn {
  // Organization CRUD
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  
  // Organization operations
  createOrganization: (data: CreateOrgData) => Promise<Organization>;
  updateOrganization: (id: string, data: UpdateOrgData) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  
  // Team management
  members: Member[];
  fetchMembers: (orgId: string) => Promise<void>;
  updateMemberRole: (orgId: string, userId: string, role: Role) => Promise<void>;
  removeMember: (orgId: string, userId: string) => Promise<void>;
  
  // Invitations
  invitations: Invitation[];
  sendInvitation: (orgId: string, email: string, role: Role) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  
  // API Tokens
  tokens: ApiToken[];
  fetchTokens: (orgId: string) => Promise<void>;
  createToken: (orgId: string, name: string) => Promise<{ token: string; tokenId: string }>;
  revokeToken: (orgId: string, tokenId: string) => Promise<void>;
  
  // Workspace data
  workspaceData: any[];
  fetchWorkspaceData: (orgId: string, resource: string) => Promise<void>;
  
  refetch: () => Promise<void>;
}

export function useOrganizationManagement(): UseOrganizationManagementReturn {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [workspaceData, setWorkspaceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make API calls
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }

    return data.data;
  }, []);

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall(`${getOrganizationsEndpoint()}/me`);
      setOrganizations(data || []);
      // Set first organization as current (single org model)
      setCurrentOrganization(data?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const data = await apiCall(`${getOrganizationsEndpoint()}/me/invitations`);
      setInvitations(data || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  }, [apiCall]);

  // Create organization
  const createOrganization = useCallback(async (data: CreateOrgData): Promise<Organization> => {
    const result = await apiCall(getOrganizationsEndpoint(), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await fetchOrganizations(); // Refresh list
    return result;
  }, [apiCall, fetchOrganizations]);

  // Update organization
  const updateOrganization = useCallback(async (id: string, data: UpdateOrgData): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await fetchOrganizations(); // Refresh list
  }, [apiCall, fetchOrganizations]);

  // Delete organization
  const deleteOrganization = useCallback(async (id: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${id}`, {
      method: 'DELETE',
    });
    await fetchOrganizations(); // Refresh list
  }, [apiCall, fetchOrganizations]);

  // Fetch members
  const fetchMembers = useCallback(async (orgId: string): Promise<void> => {
    try {
      const data = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/members`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    }
  }, [apiCall]);

  // Update member role
  const updateMemberRole = useCallback(async (orgId: string, userId: string, role: Role): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${orgId}/members`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, role }),
    });
    await fetchMembers(orgId); // Refresh members
  }, [apiCall, fetchMembers]);

  // Remove member
  const removeMember = useCallback(async (orgId: string, userId: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${orgId}/members?userId=${userId}`, {
      method: 'DELETE',
    });
    await fetchMembers(orgId); // Refresh members
  }, [apiCall, fetchMembers]);

  // Send invitation
  const sendInvitation = useCallback(async (orgId: string, email: string, role: Role): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ organizationId: orgId, email, role }),
    });
    await fetchInvitations(); // Refresh invitations
  }, [apiCall, fetchInvitations]);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${invitationId}/accept-invitation`, {
      method: 'POST',
    });
    await fetchInvitations(); // Refresh invitations
    await fetchOrganizations(); // Refresh organizations
  }, [apiCall, fetchInvitations, fetchOrganizations]);

  // Fetch API tokens
  const fetchTokens = useCallback(async (orgId: string): Promise<void> => {
    try {
      const data = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/tokens`);
      setTokens(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    }
  }, [apiCall]);

  // Create API token
  const createToken = useCallback(async (orgId: string, name: string): Promise<{ token: string; tokenId: string }> => {
    const result = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/tokens`, {
      method: 'POST',
      body: JSON.stringify({ tokenName: name }),
    });
    await fetchTokens(orgId); // Refresh tokens
    return { token: result.token, tokenId: result.tokenId };
  }, [apiCall, fetchTokens]);

  // Revoke API token
  const revokeToken = useCallback(async (orgId: string, tokenId: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${orgId}/tokens/${tokenId}`, {
      method: 'DELETE',
    });
    await fetchTokens(orgId); // Refresh tokens
  }, [apiCall, fetchTokens]);

  // Fetch workspace data
  const fetchWorkspaceData = useCallback(async (orgId: string, resource: string): Promise<void> => {
    try {
      const data = await apiCall(getOrganizationWorkspaceEndpoint(orgId, resource));
      setWorkspaceData(data[resource] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspace data');
    }
  }, [apiCall]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchOrganizations(),
      fetchInvitations(),
    ]);
  }, [fetchOrganizations, fetchInvitations]);

  // Initial load
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    members,
    fetchMembers,
    updateMemberRole,
    removeMember,
    invitations,
    sendInvitation,
    acceptInvitation,
    tokens,
    fetchTokens,
    createToken,
    revokeToken,
    workspaceData,
    fetchWorkspaceData,
    refetch,
  };
}
