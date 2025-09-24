/**
 * Session Migration Utility
 * Handles migration from localStorage-only sessions to database-first sessions
 */

export interface LegacySessionData {
  sessionId: string;
  teamId?: string;
  createdAt?: string;
  lastAccessed?: string;
}

export interface MigrationResult {
  success: boolean;
  sessionId: string;
  migrated: boolean;
  error?: string;
}

/**
 * Detect and migrate legacy localStorage sessions to the database
 */
export async function migrateLegacySession(teamId: string): Promise<MigrationResult> {
  console.log('🔄 Checking for legacy session migration...');

  try {
    // Check for existing localStorage session
    const legacySessionId = localStorage.getItem('blawby-session-id');
    const legacyFingerprint = localStorage.getItem('blawby-user-fingerprint');

    if (!legacySessionId) {
      return {
        success: true,
        sessionId: '',
        migrated: false
      };
    }

    console.log('📦 Found legacy session:', legacySessionId);

    // Check if this session already exists in the database
    const validationResponse = await fetch(`/api/sessions/${legacySessionId}/validate`);
    
    if (validationResponse.ok) {
      const validationResult = await validationResponse.json();
      
      if (validationResult.success && validationResult.data.valid) {
        console.log('✅ Legacy session is already in database');
        return {
          success: true,
          sessionId: legacySessionId,
          migrated: false // Already exists
        };
      }
    }

    // Session doesn't exist in database, need to migrate
    console.log('🔄 Migrating legacy session to database...');

    // Check if there are any conversations for this session
    const conversationsResponse = await fetch(`/api/sessions/conversations/${teamId}`);
    let hasExistingData = false;

    if (conversationsResponse.ok) {
      const conversationsResult = await conversationsResponse.json();
      const conversations = conversationsResult.data?.conversations || [];
      
      hasExistingData = conversations.some((conv: any) => 
        conv.sessionId === legacySessionId
      );
    }

    // Create the session in the database with legacy session ID
    const migrationResponse = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        teamId,
        userFingerprint: legacyFingerprint || generateLegacyFingerprint(),
        sessionId: legacySessionId, // Use existing session ID
        deviceInfo: collectLegacyDeviceInfo(),
        migration: true
      })
    });

    if (!migrationResponse.ok) {
      throw new Error(`Migration failed: ${migrationResponse.status} ${migrationResponse.statusText}`);
    }

    const migrationResult = await migrationResponse.json();

    if (migrationResult.success) {
      console.log('✅ Legacy session migrated successfully');
      
      // Update localStorage with fingerprint if it wasn't there
      if (!legacyFingerprint) {
        localStorage.setItem('blawby-user-fingerprint', generateLegacyFingerprint());
      }

      return {
        success: true,
        sessionId: legacySessionId,
        migrated: true
      };
    } else {
      throw new Error(migrationResult.error || 'Migration failed');
    }

  } catch (error) {
    console.error('❌ Session migration failed:', error);
    
    return {
      success: false,
      sessionId: '',
      migrated: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    };
  }
}

/**
 * Generate a legacy-compatible device fingerprint
 */
function generateLegacyFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side';

  const fingerprints = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.platform,
    'legacy-migration'
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprints.length; i++) {
    const char = fingerprints.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return 'legacy-' + Math.abs(hash).toString(36);
}

/**
 * Collect legacy device information
 */
function collectLegacyDeviceInfo() {
  if (typeof window === 'undefined') {
    return { userAgent: 'server-side', legacy: true };
  }

  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    legacy: true,
    migratedAt: new Date().toISOString()
  };
}

/**
 * Clean up legacy localStorage entries after successful migration
 */
export function cleanupLegacySession(): void {
  console.log('🧹 Cleaning up legacy session data...');
  
  // Keep the session ID and fingerprint, but mark as migrated
  localStorage.setItem('blawby-session-migrated', 'true');
  localStorage.setItem('blawby-migration-date', new Date().toISOString());
  
  console.log('✅ Legacy session cleanup completed');
}

/**
 * Check if a session has already been migrated
 */
export function isSessionMigrated(): boolean {
  return localStorage.getItem('blawby-session-migrated') === 'true';
}

/**
 * Get migration information
 */
export function getMigrationInfo(): {
  isMigrated: boolean;
  migrationDate?: string;
  legacySessionId?: string;
} {
  const isMigrated = isSessionMigrated();
  const migrationDate = localStorage.getItem('blawby-migration-date') || undefined;
  const legacySessionId = localStorage.getItem('blawby-session-id') || undefined;

  return {
    isMigrated,
    migrationDate,
    legacySessionId
  };
}

/**
 * Force migration for testing or recovery purposes
 */
export async function forceMigration(teamId: string): Promise<MigrationResult> {
  console.log('🔄 Forcing session migration...');
  
  // Clear migration flag to force re-migration
  localStorage.removeItem('blawby-session-migrated');
  localStorage.removeItem('blawby-migration-date');
  
  return await migrateLegacySession(teamId);
}
