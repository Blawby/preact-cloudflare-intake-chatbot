import { OrganizationService, OrganizationConfig } from '../services/OrganizationService.js';
import { Env } from '../types.js';
import { ValidationError } from '../utils/validationErrors.js';

/**
 * Helper function to create standardized error responses
 */
function createErrorResponse(
  error: unknown, 
  operation: string,
  defaultMessage: string = 'An error occurred'
): Response {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Handle validation errors specifically
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), 
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // Log full error details for debugging while returning generic message to client
  console.error(`${operation} error:`, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    operation,
    timestamp: new Date().toISOString()
  });
  
  // Handle other errors with generic client message
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: defaultMessage 
    }), 
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

export async function handleOrganizations(request: Request, env: Env): Promise<Response> {

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/organizations', '');
  


  try {
    const organizationService = new OrganizationService(env);

    // Handle API token management routes
    if (path.includes('/tokens')) {
      const pathParts = path.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[1] === 'tokens') {
        const organizationId = pathParts[0];
        
        // Validate that the organization exists
        const organization = await organizationService.getOrganization(organizationId);
        if (!organization) {
                      return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Organization not found' 
              }), 
              { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' } 
              }
            );
        }
        
        if (pathParts.length === 2) {
          // /{organizationId}/tokens
          switch (request.method) {
            case 'GET':
              return await listOrganizationTokens(organizationService, organizationId);
            case 'POST':
              return await createOrganizationToken(organizationService, organizationId, request);
          }
        } else if (pathParts.length === 3) {
          // /{organizationId}/tokens/{tokenId}
          const tokenId = pathParts[2];
          switch (request.method) {
            case 'DELETE':
              return await revokeOrganizationToken(organizationService, organizationId, tokenId);
          }
        }
      }
    }

    // Helper function to extract organizationId from path and validate method
    const extractOrganizationIdForRoute = (path: string, suffix: string, method: string): string | null => {
      const pathParts = path.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[1] === suffix && method === 'POST') {
        return pathParts[0];
      }
      return null;
    };

    // Handle API key validation routes
    const validateTokenOrganizationId = extractOrganizationIdForRoute(path, 'validate-token', request.method);
    if (validateTokenOrganizationId) {
      return await validateOrganizationToken(organizationService, validateTokenOrganizationId, request);
    }

    // Handle API key validation routes
    const validateApiKeyOrganizationId = extractOrganizationIdForRoute(path, 'validate-api-key', request.method);
    if (validateApiKeyOrganizationId) {
      return await validateApiKey(organizationService, validateApiKeyOrganizationId, request);
    }

    // Handle API key hash generation routes
    const generateHashOrganizationId = extractOrganizationIdForRoute(path, 'generate-hash', request.method);
    if (generateHashOrganizationId) {
      return await generateApiKeyHash(organizationService, generateHashOrganizationId);
    }

    switch (request.method) {
      case 'GET':
        if (path === '' || path === '/') {
          return await listOrganizations(organizationService);
        } else {
          const organizationId = path.substring(1);
          return await getOrganization(organizationService, organizationId);
        }
      
      case 'POST':
        if (path === '' || path === '/') {
          return await createOrganization(organizationService, request);
        }
        break;
      
      case 'PUT':
        if (path.startsWith('/')) {
          const organizationId = path.substring(1);
          return await updateOrganization(organizationService, organizationId, request);
        }
        break;
      
      case 'DELETE':
        console.log('DELETE case matched, path:', path);
        if (path.startsWith('/')) {
          const organizationId = path.substring(1);
          console.log('DELETE organizationId:', organizationId);
          return await deleteOrganization(organizationService, organizationId);
        }
        console.log('DELETE path does not start with /');
        break;
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: {} 
    });

  } catch (error) {
    console.error('Organization API error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function listOrganizations(organizationService: OrganizationService): Promise<Response> {
  const organizations = await organizationService.listOrganizations();
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: organizations 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function getOrganization(organizationService: OrganizationService, organizationId: string): Promise<Response> {
  const organization = await organizationService.getOrganization(organizationId);
  
  if (!organization) {
          return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Organization not found' 
        }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
  }

  // Redact sensitive data from the response
  const sanitizedOrganization = {
    ...organization,
    config: {
      ...organization.config,
      blawbyApi: organization.config?.blawbyApi ? {
        enabled: organization.config.blawbyApi.enabled,
        apiUrl: organization.config.blawbyApi.apiUrl
        // Note: apiKey, apiKeyHash, and organizationUlid are intentionally excluded for security
      } : undefined
    }
  };

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: sanitizedOrganization 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function createOrganization(organizationService: OrganizationService, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      slug: string;
      name: string;
      config: OrganizationConfig;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Validate required fields
  if (!body.slug || !body.name || !body.config) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: slug, name, config' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // Check if organization with slug already exists
  const existingOrganization = await organizationService.getOrganization(body.slug);
  if (existingOrganization) {
    return new Response(
      JSON.stringify({ 
        success: false, 
          error: 'Organization with this slug already exists'
      }), 
      { 
        status: 409, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const organization = await organizationService.createOrganization({
      slug: body.slug,
      name: body.name,
      config: body.config
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: organization 
      }), 
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return createErrorResponse(error, 'createOrganization', 'Failed to create organization');
  }
}

async function updateOrganization(organizationService: OrganizationService, organizationId: string, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const updatedOrganization = await organizationService.updateOrganization(organizationId, body);
    
    if (!updatedOrganization) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Organization not found' 
        }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedOrganization 
      }), 
      { 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return createErrorResponse(error, 'updateOrganization', 'Failed to update organization');
  }
}

async function deleteOrganization(organizationService: OrganizationService, organizationId: string): Promise<Response> {
  const deleted = await organizationService.deleteOrganization(organizationId);
  
  if (!deleted) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Organization not found' 
      }), 
      { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Organization deleted successfully' 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function listOrganizationTokens(organizationService: OrganizationService, organizationId: string): Promise<Response> {
  const tokens = await organizationService.listApiTokens(organizationId);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: tokens 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function createOrganizationToken(organizationService: OrganizationService, organizationId: string, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      tokenName: string;
      permissions?: string[];
      createdBy?: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Validate required fields
  if (!body.tokenName || typeof body.tokenName !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: tokenName' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // Validate permissions array if provided
  if (body.permissions !== undefined && (!Array.isArray(body.permissions) || !body.permissions.every(p => typeof p === 'string'))) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid permissions: must be an array of strings' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // Validate createdBy if provided
  if (body.createdBy !== undefined && typeof body.createdBy !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid createdBy: must be a string' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  const permissions = body.permissions || [];
  const createdBy = body.createdBy || 'api';

  const result = await organizationService.createApiToken(organizationId, body.tokenName, permissions, createdBy);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        tokenId: result.tokenId,
        token: result.token, // Only returned once - should be stored securely by client
        tokenName: body.tokenName,
        permissions: permissions,
        message: 'Store this token securely - it will not be shown again'
      }
    }), 
    { 
      status: 201,
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function revokeOrganizationToken(
  organizationService: OrganizationService,
  organizationId: string,
  tokenId: string
): Promise<Response> {
  // First verify the token belongs to this organization
  const tokens = await organizationService.listApiTokens(organizationId);
  const tokenBelongsToOrganization = tokens.some(token => token.id === tokenId);

  if (!tokenBelongsToOrganization) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Token not found'
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const result = await organizationService.revokeApiToken(tokenId);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Token not found'
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const message = result.alreadyRevoked
    ? 'Token was already revoked'
    : 'Token revoked successfully';

  return new Response(
    JSON.stringify({
      success: true,
      data: { success: true, message }
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function validateOrganizationToken(
  organizationService: OrganizationService,
  organizationId: string,
  request: Request
): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      token: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!body.token || typeof body.token !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: token' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  const isValid = await organizationService.validateOrganizationAccess(organizationId, body.token);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { valid: isValid } 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function validateApiKey(
  organizationService: OrganizationService,
  organizationId: string,
  request: Request
): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      apiKey: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!body.apiKey || typeof body.apiKey !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: apiKey' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  const isValid = await organizationService.validateApiKey(organizationId, body.apiKey);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { valid: isValid } 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

async function generateApiKeyHash(
  organizationService: OrganizationService,
  organizationId: string
): Promise<Response> {
  const success = await organizationService.generateApiKeyHash(organizationId);

  if (!success) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to generate API key hash' 
      }), 
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { success: true } 
    }), 
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}