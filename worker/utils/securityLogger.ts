export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'jailbreak_attempt' | 'non_legal_request' | 'service_not_offered' | 'jurisdiction_not_supported' | 'role_violation';
    userId?: string;
    sessionId?: string;
    teamId?: string;
    content: string;
    violations?: string[];
    timestamp: Date;
  }) {
    console.warn('SECURITY EVENT:', {
      ...event,
      timestamp: event.timestamp.toISOString()
    });

    // Store in database for monitoring
    // Send alerts for critical events
  }

  static logResponseValidation(validation: { isValid: boolean; issues: string[] }, content: string) {
    if (!validation.isValid) {
      this.logSecurityEvent({
        type: 'role_violation',
        content: content.substring(0, 200), // Truncate for logging
        violations: validation.issues,
        timestamp: new Date()
      });
    }
  }

  static logInputValidation(validation: { isValid: boolean; violations?: string[]; reason?: string }, content: string, teamId?: string) {
    if (!validation.isValid) {
      this.logSecurityEvent({
        type: this.getViolationType(validation.violations || []),
        content: content.substring(0, 200), // Truncate for logging
        violations: validation.violations,
        teamId,
        timestamp: new Date()
      });
    }
  }

  private static getViolationType(violations: string[]): 'jailbreak_attempt' | 'non_legal_request' | 'service_not_offered' | 'jurisdiction_not_supported' | 'role_violation' {
    if (violations.includes('jailbreak_attempt')) return 'jailbreak_attempt';
    if (violations.includes('non_legal_request')) return 'non_legal_request';
    if (violations.includes('service_not_offered')) return 'service_not_offered';
    if (violations.includes('jurisdiction_not_supported')) return 'jurisdiction_not_supported';
    return 'role_violation';
  }
} 