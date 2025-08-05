import type { TeamConfig } from '../types';

/**
 * Validates a team configuration object
 * @param team - Team configuration to validate
 * @returns Validation result with success status and any errors
 */
export function validateTeamConfig(team: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required top-level fields
  if (!team.id || typeof team.id !== 'string') {
    errors.push('Team ID is required and must be a string');
  }

  if (!team.slug || typeof team.slug !== 'string') {
    errors.push('Team slug is required and must be a string');
  }

  if (!team.name || typeof team.name !== 'string') {
    errors.push('Team name is required and must be a string');
  }

  if (!team.config || typeof team.config !== 'object') {
    errors.push('Team config is required and must be an object');
    return { valid: false, errors };
  }

  const config = team.config;

  // Validate required config fields
  if (!config.aiModel || typeof config.aiModel !== 'string') {
    errors.push('AI model is required and must be a string');
  }

  if (typeof config.requiresPayment !== 'boolean') {
    errors.push('requiresPayment must be a boolean');
  }

  if (config.consultationFee !== undefined && typeof config.consultationFee !== 'number') {
    errors.push('consultationFee must be a number if provided');
  }

  if (config.consultationFee !== undefined && config.consultationFee < 0) {
    errors.push('consultationFee cannot be negative');
  }

  // Validate jurisdiction if present
  if (config.jurisdiction) {
    if (!config.jurisdiction.type || !['national', 'state'].includes(config.jurisdiction.type)) {
      errors.push('jurisdiction.type must be "national" or "state"');
    }

    if (!config.jurisdiction.description || typeof config.jurisdiction.description !== 'string') {
      errors.push('jurisdiction.description is required');
    }

    if (!Array.isArray(config.jurisdiction.supportedStates)) {
      errors.push('jurisdiction.supportedStates must be an array');
    }

    if (!Array.isArray(config.jurisdiction.supportedCountries)) {
      errors.push('jurisdiction.supportedCountries must be an array');
    }
  }

  // Validate webhooks if present
  if (config.webhooks) {
    if (typeof config.webhooks.enabled !== 'boolean') {
      errors.push('webhooks.enabled must be a boolean');
    }

    if (config.webhooks.enabled) {
      if (!config.webhooks.url || typeof config.webhooks.url !== 'string') {
        errors.push('webhooks.url is required when webhooks are enabled');
      }

      if (!config.webhooks.secret || typeof config.webhooks.secret !== 'string') {
        errors.push('webhooks.secret is required when webhooks are enabled');
      }

      if (config.webhooks.events) {
        const eventFields = ['matterCreation', 'matterDetails', 'contactForm', 'appointment'];
        for (const field of eventFields) {
          if (config.webhooks.events[field] !== undefined && typeof config.webhooks.events[field] !== 'boolean') {
            errors.push(`webhooks.events.${field} must be a boolean`);
          }
        }
      }
    }
  }

  // Validate blawbyApi if present
  if (config.blawbyApi) {
    if (typeof config.blawbyApi.enabled !== 'boolean') {
      errors.push('blawbyApi.enabled must be a boolean');
    }

    if (config.blawbyApi.enabled) {
      if (!config.blawbyApi.teamUlid || typeof config.blawbyApi.teamUlid !== 'string') {
        errors.push('blawbyApi.teamUlid is required when Blawby API is enabled');
      }

      // Validate ULID format
      if (config.blawbyApi.teamUlid && !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(config.blawbyApi.teamUlid)) {
        errors.push('blawbyApi.teamUlid must be a valid ULID format');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an array of team configurations
 * @param teams - Array of team configurations to validate
 * @returns Validation result with success status and any errors
 */
export function validateTeamsConfig(teams: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(teams)) {
    errors.push('Teams must be an array');
    return { valid: false, errors };
  }

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const teamValidation = validateTeamConfig(team);
    
    if (!teamValidation.valid) {
      errors.push(`Team ${i + 1} (${team.id || 'unknown'}): ${teamValidation.errors.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 