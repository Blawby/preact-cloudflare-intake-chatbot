import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { z } from 'zod';
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
  stripeCustomerId?: string | null;
  subscriptionTier?: 'free' | 'plus' | 'business' | 'enterprise' | null;
  seats?: number | null;
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
  organizationName?: string;
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

// API Response types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface WorkspaceResource {
  [key: string]: unknown[];
}

interface TokenApiResponse {
  id: string;
  tokenName: string;
  permissions?: string[];
  createdAt: string;
  lastUsedAt?: string;
  [key: string]: unknown;
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

// Zod validation schemas
const RoleSchema = z.enum(['owner', 'admin', 'attorney', 'paralegal']);

const OrganizationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  stripeCustomerId: z.string().nullable().optional(),
  subscriptionTier: z.enum(['free', 'plus', 'business', 'enterprise']).nullable().optional(),
  seats: z.number().nullable().optional(),
  config: z.object({
    metadata: z.object({
      subscriptionPlan: z.string().optional(),
      planStatus: z.string().optional(),
    }).optional(),
  }).optional(),
});

const MemberSchema = z.object({
  userId: z.string(),
  role: RoleSchema,
  email: z.string(),
  name: z.string().optional(),
  image: z.string().optional(),
  createdAt: z.string(),
});

const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string().optional(),
  email: z.string(),
  role: RoleSchema,
  status: z.enum(['pending', 'accepted', 'declined']),
  invitedBy: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});


const TokenApiResponseSchema = z.object({
  id: z.string(),
  tokenName: z.string(),
  permissions: z.array(z.string()).optional(),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
});

const CreateTokenResponseSchema = z.object({
  token: z.string(),
  tokenId: z.string(),
});

const MembersResponseSchema = z.object({
  members: z.array(MemberSchema),
});

const WorkspaceResourceSchema = z.record(z.string(), z.array(z.unknown()));

// Type guard functions
function validateOrganizations(data: unknown): Organization[] {
  const result = z.array(OrganizationSchema).safeParse(data);
  if (!result.success) {
    console.error('Organization validation failed:', result.error);
    throw new Error('Invalid organization data received from API');
  }
  return result.data;
}

function validateOrganization(data: unknown): Organization {
  const result = OrganizationSchema.safeParse(data);
  if (!result.success) {
    console.error('Single organization validation failed:', result.error);
    throw new Error('Invalid organization data received from API');
  }
  return result.data;
}

function validateInvitations(data: unknown): Invitation[] {
  const result = z.array(InvitationSchema).safeParse(data);
  if (!result.success) {
    console.error('Invitation validation failed:', result.error);
    throw new Error('Invalid invitation data received from API');
  }
  return result.data;
}

function validateMembersResponse(data: unknown): { members: Member[] } {
  const result = MembersResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('Members response validation failed:', result.error);
    throw new Error('Invalid members data received from API');
  }
  return result.data;
}

function validateTokenApiResponses(data: unknown): TokenApiResponse[] {
  const result = z.array(TokenApiResponseSchema).safeParse(data);
  if (!result.success) {
    console.error('Token API response validation failed:', result.error);
    throw new Error('Invalid token data received from API');
  }
  return result.data;
}

function validateCreateTokenResponse(data: unknown): { token: string; tokenId: string } {
  const result = CreateTokenResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('Create token response validation failed:', result.error);
    throw new Error('Invalid create token response received from API');
  }
  return result.data;
}

function validateWorkspaceResource(data: unknown): WorkspaceResource {
  const result = WorkspaceResourceSchema.safeParse(data);
  if (!result.success) {
    console.error('Workspace resource validation failed:', result.error);
    throw new Error('Invalid workspace data received from API');
  }
  return result.data;
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
  getMembers: (orgId: string) => Member[];
  fetchMembers: (orgId: string) => Promise<void>;
  updateMemberRole: (orgId: string, userId: string, role: Role) => Promise<void>;
  removeMember: (orgId: string, userId: string) => Promise<void>;
  
  // Invitations
  invitations: Invitation[];
  sendInvitation: (orgId: string, email: string, role: Role) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  
  // API Tokens
  getTokens: (orgId: string) => ApiToken[];
  fetchTokens: (orgId: string) => Promise<void>;
  createToken: (orgId: string, name: string) => Promise<{ token: string; tokenId: string }>;
  revokeToken: (orgId: string, tokenId: string) => Promise<void>;
  
  // Workspace data
  getWorkspaceData: (orgId: string, resource: string) => unknown[];
  fetchWorkspaceData: (orgId: string, resource: string) => Promise<void>;
  
  refetch: () => Promise<void>;
}

export function useOrganizationManagement(): UseOrganizationManagementReturn {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tokens, setTokens] = useState<Record<string, ApiToken[]>>({});
  const [workspaceData, setWorkspaceData] = useState<Record<string, Record<string, unknown[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook-scoped flag to prevent multiple simultaneous API calls
  const fetchingInProgress = useRef(false);

  // Helper function to make API calls - stable reference
  const apiCall = useCallback(async (url: string, options: RequestInit = {}, timeoutMs: number = 15000) => {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // Helper function to safely parse JSON response
      const safeJsonParse = async (response: Response): Promise<ApiResponse> => {
        // Check for no-content responses
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return { success: true, data: null };
        }
        
        // Check content-type for JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return { success: true, data: null };
        }
        
        // Safe JSON parsing with fallback
        try {
          return await response.json() as ApiResponse;
        } catch {
          return { success: true, data: null };
        }
      };

      if (!response.ok) {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await safeJsonParse(response);
      if (!data.success) {
        throw new Error(data.error || 'API call failed');
      }

      return data.data;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      // Re-throw other errors (preserve existing error handling)
      throw error;
    }
  }, []);

  // Helper functions to get data by orgId
  const getMembers = useCallback((orgId: string): Member[] => {
    return members[orgId] || [];
  }, [members]);

  const getTokens = useCallback((orgId: string): ApiToken[] => {
    return tokens[orgId] || [];
  }, [tokens]);

  const getWorkspaceData = useCallback((orgId: string, resource: string): unknown[] => {
    return workspaceData[orgId]?.[resource] || [];
  }, [workspaceData]);

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingInProgress.current) {
      return;
    }
    
    try {
      fetchingInProgress.current = true;
      setLoading(true);
      setError(null);
      const rawData = await apiCall(`${getOrganizationsEndpoint()}/me`);
      const data = validateOrganizations(rawData);
      setOrganizations(data || []);
      // Set first organization as current (single org model)
      setCurrentOrganization(data?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
      fetchingInProgress.current = false;
    }
  }, [apiCall]);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingInProgress.current) {
      return;
    }
    
    try {
      fetchingInProgress.current = true;
      const rawData = await apiCall(`${getOrganizationsEndpoint()}/me/invitations`);
      const data = validateInvitations(rawData);
      setInvitations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
      setInvitations([]);
    } finally {
      fetchingInProgress.current = false;
    }
  }, [apiCall]);

  // Create organization
  const createOrganization = useCallback(async (data: CreateOrgData): Promise<Organization> => {
    const rawResult = await apiCall(getOrganizationsEndpoint(), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = validateOrganization(rawResult);
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
      const rawData = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/member`);
      const data = validateMembersResponse(rawData);
      setMembers(prev => ({ ...prev, [orgId]: data.members || [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    }
  }, [apiCall]);

  // Update member role
  const updateMemberRole = useCallback(async (orgId: string, userId: string, role: Role): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${orgId}/member`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, role }),
    });
    await fetchMembers(orgId); // Refresh members
  }, [apiCall, fetchMembers]);

  // Remove member
  const removeMember = useCallback(async (orgId: string, userId: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${orgId}/member?userId=${encodeURIComponent(userId)}`, {
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

  const declineInvitation = useCallback(async (invitationId: string): Promise<void> => {
    await apiCall(`${getOrganizationsEndpoint()}/${invitationId}/decline-invitation`, {
      method: 'POST',
    });
    await fetchInvitations(); // Refresh invitations
  }, [apiCall, fetchInvitations]);

  // Fetch API tokens
  const fetchTokens = useCallback(async (orgId: string): Promise<void> => {
    try {
      const rawData = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/tokens`);
      const data = validateTokenApiResponses(rawData);
      // Map API response to ApiToken shape
      const mappedTokens = (data || []).map((token: TokenApiResponse) => ({
        id: token.id,
        name: token.tokenName,
        permissions: token.permissions || [],
        createdAt: token.createdAt,
        lastUsed: token.lastUsedAt,
        ...token // Include any other fields
      }));
      setTokens(prev => ({ ...prev, [orgId]: mappedTokens }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    }
  }, [apiCall]);

  // Create API token
  const createToken = useCallback(async (orgId: string, name: string): Promise<{ token: string; tokenId: string }> => {
    const rawResult = await apiCall(`${getOrganizationsEndpoint()}/${orgId}/tokens`, {
      method: 'POST',
      body: JSON.stringify({ tokenName: name }),
    });
    const result = validateCreateTokenResponse(rawResult);
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
      const rawData = await apiCall(getOrganizationWorkspaceEndpoint(orgId, resource));
      const data = validateWorkspaceResource(rawData);
      setWorkspaceData(prev => ({
        ...prev,
        [orgId]: {
          ...prev[orgId],
          [resource]: data[resource] || []
        }
      }));
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

  // Initial load - only run once on mount
  useEffect(() => {
    fetchOrganizations();
    fetchInvitations();
  }, [fetchOrganizations, fetchInvitations]);

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getMembers,
    fetchMembers,
    updateMemberRole,
    removeMember,
    invitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    getTokens,
    fetchTokens,
    createToken,
    revokeToken,
    getWorkspaceData,
    fetchWorkspaceData,
    refetch,
  };
}
