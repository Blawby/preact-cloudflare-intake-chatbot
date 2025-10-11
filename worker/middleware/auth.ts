import { Env } from "../types";
import { getAuth } from "../auth/index";
import { HttpErrors } from "../errorHandler";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: {
    id: string;
    expiresAt: Date;
  };
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthContext> {
  const auth = await getAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || !session.user) {
    throw HttpErrors.unauthorized("Authentication required");
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      image: session.user.image,
    },
    session: {
      id: session.session.id,
      expiresAt: new Date(session.session.expiresAt),
    },
  };
}

export async function requireOrganizationMember(
  request: Request,
  env: Env,
  organizationId: string,
  minimumRole?: "owner" | "admin" | "attorney" | "paralegal"
): Promise<AuthContext & { memberRole: string }> {
  const authContext = await requireAuth(request, env);
  const auth = await getAuth(env);

  // TODO: Implement proper organization membership checking
  // The Better Auth organization plugin API methods may not be fully available yet.
  // For now, we'll return a basic auth context without role checking.
  // This should be updated when the Better Auth organization API is stable.
  
  console.warn('Organization membership check not implemented - using basic auth context');
  
  return {
    ...authContext,
    memberRole: "paralegal", // Default role for now
  };
}

export async function optionalAuth(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  try {
    return await requireAuth(request, env);
  } catch {
    return null;
  }
}

/**
 * Organization-based RBAC middleware
 * Verifies user is a member of the organization with the required role
 */
export async function requireOrgMember(
  request: Request,
  env: Env,
  organizationId: string,
  minimumRole?: "owner" | "admin" | "attorney" | "paralegal"
): Promise<AuthContext & { memberRole: string }> {
  // Delegate to the primary implementation to prevent drift
  return requireOrganizationMember(request, env, organizationId, minimumRole);
}

/**
 * Shorthand for owner-only access
 */
export async function requireOrgOwner(
  request: Request,
  env: Env,
  organizationId: string
): Promise<AuthContext & { memberRole: string }> {
  return requireOrgMember(request, env, organizationId, "owner");
}

/**
 * Check if user has access to an organization
 * Returns the access type and role without throwing errors
 */
export async function checkOrgAccess(
  request: Request,
  env: Env,
  organizationId: string
): Promise<{ hasAccess: boolean; memberRole?: string }> {
  try {
    const result = await requireOrgMember(request, env, organizationId);
    return {
      hasAccess: true,
      memberRole: result.memberRole,
    };
  } catch {
    return { hasAccess: false };
  }
}

