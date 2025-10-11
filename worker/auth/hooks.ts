import type { Env } from '../types.js';
import { getConfiguredDomain } from '../utils/domain.js';
import { OrganizationService } from '../services/OrganizationService.js';

/**
 * Creates a safe, collision-resistant slug from a userId
 * @param userId - The user ID to convert to a slug
 * @returns A sanitized slug that's safe for URLs and reduces collisions
 */
function createSafeSlug(userId: string): string {
  // Convert to lowercase and replace non-alphanumeric characters with hyphens
  let slug = userId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Collapse consecutive hyphens into single hyphens
  slug = slug.replace(/-+/g, '-');
  
  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Take up to 16 characters from the processed userId
  const prefix = slug.slice(0, 16);
  
  // Generate a short unique suffix (6-character base36 timestamp)
  const suffix = Date.now().toString(36).slice(-6);
  
  // Combine prefix and suffix with a hyphen
  const fullSlug = `${prefix}-${suffix}`;
  
  // Enforce final length cap (max 32 characters for slug)
  const finalSlug = fullSlug.slice(0, 32);
  
  // Validate against slug-safe regex
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(finalSlug)) {
    // Fallback to a safe default if validation fails
    return `user-${suffix}`;
  }
  
  return finalSlug;
}

/**
 * Retry mechanism with exponential backoff for addMember operation
 */
async function retryAddMember(
  env: Env,
  organizationId: string,
  userId: string,
  role: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<void> {
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting to add member (attempt ${attempt}/${maxRetries}) for org ${organizationId}, user ${userId}`);
      
      // Check if membership already exists to prevent duplicates
      const existingMember = await env.DB.prepare(`
        SELECT id FROM members 
        WHERE organization_id = ? AND user_id = ?
      `).bind(organizationId, userId).first();
      
      if (existingMember) {
        console.log(`ℹ️ Member ${userId} already exists in organization ${organizationId}, skipping insertion`);
        return;
      }
      
      // Add member directly to the database with proper Unix timestamp
      const result = await env.DB.prepare(`
        INSERT INTO members (id, organization_id, user_id, role, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), // Generate a proper UUID for the id field
        organizationId,
        userId,
        role,
        Math.floor(Date.now() / 1000) // Convert to Unix timestamp (seconds since epoch)
      ).run();
      
      if (!result.success) {
        throw new Error(`Failed to insert member into database: ${result.error}`);
      }
      
      console.log(`✅ Successfully added member ${userId} to organization ${organizationId} on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`❌ Failed to add member on attempt ${attempt}/${maxRetries}:`, error);
      
      if (attempt === maxRetries) {
        throw error; // Re-throw the last error if all retries failed
      }
      
      // Wait with exponential backoff before next attempt
      console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 5000); // Cap at 5 seconds
    }
  }
}

/**
 * Safely cleanup organization if member addition fails
 */
async function cleanupOrganization(
  organizationId: string,
  env: Env,
  _originalError: Error
): Promise<void> {
  try {
    console.log(`🧹 Attempting to cleanup orphaned organization ${organizationId}`);
    
    const organizationService = new OrganizationService(env);
    const deleted = await organizationService.deleteOrganization(organizationId);
    
    if (deleted) {
      console.log(`✅ Successfully cleaned up orphaned organization ${organizationId}`);
    } else {
      console.error(`❌ Failed to delete orphaned organization ${organizationId} - organization may not exist or deletion failed`);
    }
  } catch (cleanupError) {
    console.error(`❌ Error during organization cleanup for ${organizationId}:`, cleanupError);
    // Don't throw - we want to preserve the original error
  }
}

/**
 * Better Auth hooks for organization auto-creation with atomic approach
 */
export async function createPersonalOrganizationOnSignup(
  userId: string,
  userName: string,
  env: Env
): Promise<void> {
  try {
    const organizationService = new OrganizationService(env);
    
    // Check if user already has an organization by querying the database directly
    const existingMembership = await env.DB.prepare(`
      SELECT organization_id FROM members 
      WHERE user_id = ?
    `).bind(userId).all();
    
    // Defensive check: treat null/undefined as empty array
    const membershipList = existingMembership?.results || [];
    
    if (membershipList.length === 0) {
      console.log(`🏗️ Creating personal organization for user ${userId}`);
      
      let organizationId: string | null = null;
      
      try {
        // Create personal organization using OrganizationService
        const org = await organizationService.createOrganization({
          name: `${userName}'s Organization`,
          slug: createSafeSlug(userId),
          config: {
            // Default organization config
            aiProvider: 'workers-ai',
            aiModel: '@cf/openai/gpt-oss-20b',
            consultationFee: 0,
            requiresPayment: false,
            availableServices: ['General Consultation'],
            serviceQuestions: {
              'General Consultation': [
                'What type of legal issue are you facing?',
                'When did this issue occur?',
                'Have you consulted with other attorneys about this matter?'
              ]
            },
            domain: getConfiguredDomain(env),
            description: 'Personal legal consultation organization',
            brandColor: '#3B82F6',
            accentColor: '#1E40AF',
            introMessage: 'Hello! I\'m here to help you with your legal questions. What can I assist you with today?',
            voice: {
              enabled: false,
              provider: 'cloudflare'
            }
          }
        });
        
        organizationId = org.id;
        console.log(`✅ Created organization ${organizationId} for user ${userId}`);
        
        // Add user as owner with retry mechanism using direct database operations
        await retryAddMember(env, organizationId, userId, 'owner');
        
        console.log(`✅ Successfully created personal organization ${organizationId} with owner ${userId}`);
        
      } catch (memberError) {
        console.error(`❌ Failed to add member to organization ${organizationId} for user ${userId}:`, memberError);
        
        // Cleanup the orphaned organization
        if (organizationId) {
          await cleanupOrganization(organizationId, env, memberError);
        }
        
        // Re-throw the original error
        throw memberError;
      }
    } else {
      console.log(`ℹ️ User ${userId} already has organizations:`, membershipList.map((m: { organization_id: string }) => m.organization_id));
    }
  } catch (error) {
    console.error(`❌ Failed to create personal organization for user ${userId}:`, error);
    // Don't throw - let the signup continue even if org creation fails
  }
}

/**
 * Polls for session readiness with exponential backoff
 * @param userId - The user ID to check session for
 * @param env - Environment variables
 * @param maxAttempts - Maximum number of polling attempts (default: 10)
 * @param initialDelay - Initial delay in milliseconds (default: 100)
 * @returns Promise that resolves when session is ready or rejects on timeout
 */
async function waitForSessionReady(
  userId: string,
  env: Env,
  maxAttempts: number = 10,
  initialDelay: number = 100
): Promise<void> {
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if user exists in the database
      const user = await env.DB.prepare(`
        SELECT id FROM user WHERE id = ?
      `).bind(userId).first();
      
      if (user && user.id === userId) {
        console.log(`✅ Session ready for user ${userId} after ${attempt} attempt(s)`);
        return;
      }
    } catch (_error) {
      // Session not ready yet, continue polling
      console.log(`⏳ Session not ready for user ${userId}, attempt ${attempt}/${maxAttempts}`);
    }
    
    // If not the last attempt, wait with exponential backoff
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 2000); // Cap at 2 seconds
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`Session not ready for user ${userId} after ${maxAttempts} attempts`);
}

/**
 * Hook to run after user signup/email verification
 */
export async function handlePostSignup(
  userId: string,
  userName: string,
  env: Env
): Promise<void> {
  try {
    // Wait for session to be properly established
    await waitForSessionReady(userId, env);
    
    // Create personal organization
    await createPersonalOrganizationOnSignup(userId, userName, env);
  } catch (error) {
    console.error(`❌ Failed to handle post-signup for user ${userId}:`, error);
    // Don't throw - let the signup continue even if organization creation fails
  }
}
