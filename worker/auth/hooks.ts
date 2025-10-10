import { getAuth } from './index.js';
import type { Env } from '../types.js';

/**
 * Better Auth hooks for organization auto-creation
 */
export async function createPersonalOrganizationOnSignup(
  userId: string,
  userName: string,
  env: Env
): Promise<void> {
  try {
    const auth = await getAuth(env);
    
    // Check if user already has an organization
    const existingMembership = await auth.api.listOrganizations({
      userId
    });
    
    if (existingMembership.length === 0) {
      console.log(`Creating personal organization for user ${userId}`);
      
      // Create personal organization
      const org = await auth.api.createOrganization({
        name: `${userName}'s Organization`,
        slug: `user-${userId.toLowerCase().slice(0, 8)}`,
        metadata: JSON.stringify({
          type: 'personal',
          createdFrom: 'signup',
          createdAt: Date.now(),
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
          domain: 'localhost',
          description: 'Personal legal consultation organization',
          brandColor: '#3B82F6',
          accentColor: '#1E40AF',
          introMessage: 'Hello! I\'m here to help you with your legal questions. What can I assist you with today?',
          voice: {
            enabled: false,
            provider: 'cloudflare'
          }
        })
      });
      
      // Add user as owner
      await auth.api.addMember({
        organizationId: org.id,
        userId: userId,
        role: 'owner'
      });
      
      console.log(`✅ Created personal organization ${org.id} for user ${userId}`);
    } else {
      console.log(`User ${userId} already has organizations:`, existingMembership.map(o => o.id));
    }
  } catch (error) {
    console.error(`❌ Failed to create personal organization for user ${userId}:`, error);
    // Don't throw - let the signup continue even if org creation fails
  }
}

/**
 * Hook to run after user signup/email verification
 */
export async function handlePostSignup(
  userId: string,
  userName: string,
  env: Env
): Promise<void> {
  // Wait a moment for the session to be fully established
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create personal organization
  await createPersonalOrganizationOnSignup(userId, userName, env);
}
