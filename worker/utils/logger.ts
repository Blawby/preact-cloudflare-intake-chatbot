export class Logger {
  private static env?: { DEBUG?: string; NODE_ENV?: string };

  /**
   * Initialize Logger with environment variables (required for Cloudflare Workers)
   */
  static initialize(env: { DEBUG?: string; NODE_ENV?: string }): void {
    this.env = env;
  }

  private static isDebugEnabled(): boolean {
    // Use injected environment variables if available, otherwise fallback to process.env (for Node.js environments)
    const debug = this.env?.DEBUG || (typeof process !== 'undefined' && process.env?.DEBUG);
    const nodeEnv = this.env?.NODE_ENV || (typeof process !== 'undefined' && process.env?.NODE_ENV);
    
    return debug === 'true' || nodeEnv === 'development';
  }

  static debug(message: string, data?: any): void {
    if (this.isDebugEnabled()) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  static info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data);
  }

  static warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }

  /**
   * Safely logs team configuration data by redacting sensitive information
   */
  static logTeamConfig(team: any, includeConfig: boolean = false): void {
    if (!team) {
      this.warn('logTeamConfig called with null/undefined team');
      return;
    }

    const safeTeamData = {
      id: team.id,
      slug: team.slug,
      name: team.name,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };

    if (includeConfig && this.isDebugEnabled()) {
      // Create a sanitized version of the config
      const sanitizedConfig = this.sanitizeConfig(team.config);
      (safeTeamData as any).config = sanitizedConfig;
    }

    this.info('Team data:', safeTeamData);
  }

  /**
   * Sanitizes configuration data to remove sensitive information
   */
  private static sanitizeConfig(config: any): any {
    if (!config) return config;

    const sanitized = { ...config };

    // Mask sensitive fields
    const sensitiveFields = [
      'apiToken', 'token', 'secret', 'password', 'key', 'credential',
      'email', 'ownerEmail', 'contactEmail',
      'apiUrl', 'url', 'endpoint', 'webhook',
      'privateKey', 'publicKey', 'certificate'
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (typeof sanitized[field] === 'string') {
          const value = sanitized[field] as string;
          if (value.includes('@')) {
            // Email-like field
            const [local, domain] = value.split('@');
            sanitized[field] = `${local.substring(0, 2)}***@${domain}`;
          } else if (value.startsWith('http')) {
            // URL-like field
            sanitized[field] = '***REDACTED_URL***';
          } else if (value.length > 8) {
            // Long string (likely token/secret)
            sanitized[field] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
          } else {
            sanitized[field] = '***REDACTED***';
          }
        } else {
          sanitized[field] = '***REDACTED***';
        }
      }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeConfig(value);
      }
    }

    return sanitized;
  }
}
