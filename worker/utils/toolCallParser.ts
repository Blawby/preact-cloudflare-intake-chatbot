import { Logger } from './logger.js';
import { safeIncludes } from './safeStringUtils.js';

export interface ToolCall {
  toolName: string;
  parameters: Record<string, unknown>; // Raw parameters for tool execution
  sanitizedParameters?: Record<string, unknown>; // Sanitized parameters for logging/telemetry
}

export interface ToolCallParseResult {
  success: boolean;
  toolCall?: ToolCall;
  error?: string;
  rawParameters?: string;
}

export class ToolCallParser {
  // Regex pattern for sensitive field names - matches whole names or common secret suffixes
  // Uses word boundaries and common separators to avoid false positives
  private static readonly sensitiveFieldPattern = /(^|[_-])(password|token|secret|key|apiToken|authorization|bearer|clientSecret|ssn|access_token|api_key|auth|credential|private_key|session_id|user_id|account_id|client_id|secret_key|auth_token|refresh_token|jwt|apikey|apisecret|clientkey|clientsecret|privatekey|publickey|signingkey|encryptionkey|decryptionkey|masterkey|rootkey|adminkey|servicekey|webhook_secret|webhook_token|webhook_key|callback_secret|callback_token|callback_key|verification_token|verification_key|reset_token|reset_key|activation_token|activation_key|invitation_token|invitation_key|invite_token|invite_key|registration_token|registration_key|signup_token|signup_key|login_token|login_key|session_token|session_key|temp_token|temp_key|temporary_token|temporary_key|temp_secret|temporary_secret|temp_password|temporary_password|temp_credential|temporary_credential|temp_auth|temporary_auth|temp_authorization|temporary_authorization|temp_bearer|temporary_bearer|temp_client_secret|temporary_client_secret|temp_api_token|temporary_api_token|temp_api_key|temporary_api_key|temp_private_key|temporary_private_key|temp_public_key|temporary_public_key|temp_signing_key|temporary_signing_key|temp_encryption_key|temporary_encryption_key|temp_decryption_key|temporary_decryption_key|temp_master_key|temporary_master_key|temp_root_key|temporary_root_key|temp_admin_key|temporary_admin_key|temp_service_key|temporary_service_key|temp_webhook_secret|temporary_webhook_secret|temp_webhook_token|temporary_webhook_token|temp_webhook_key|temporary_webhook_key|temp_callback_secret|temporary_callback_secret|temp_callback_token|temporary_callback_token|temp_callback_key|temporary_callback_key|temp_verification_token|temporary_verification_token|temp_verification_key|temporary_verification_key|temp_reset_token|temporary_reset_token|temp_reset_key|temporary_reset_key|temp_activation_token|temporary_activation_token|temp_activation_key|temporary_activation_key|temp_invitation_token|temporary_invitation_token|temp_invitation_key|temporary_invitation_key|temp_invite_token|temporary_invite_token|temp_invite_key|temporary_invite_key|temp_registration_token|temporary_registration_token|temp_registration_key|temporary_registration_key|temp_signup_token|temporary_signup_token|temp_signup_key|temporary_signup_key|temp_login_token|temporary_login_token|temp_login_key|temporary_login_key|temp_session_token|temporary_session_token|temp_session_key|temporary_session_key)$/i;

  // Basic sensitive field names for exact matches
  private static readonly basicSensitiveFields = [
    'email', 'phone', 'ssn', 'social_security', 'credit_card', 'card_number',
    'account_number', 'routing_number', 'address', 'location', 'name',
    'description', 'details', 'notes', 'comments', 'message',
    'opposing_party', 'client_info', 'personal_info'
  ];

  /**
   * Checks if a field name is sensitive using strict pattern matching
   * @private
   */
  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    
    // Check for basic sensitive fields (exact matches)
    if (this.basicSensitiveFields.includes(lowerField)) {
      return true;
    }
    
    // Check for sensitive patterns using regex
    return this.sensitiveFieldPattern.test(fieldName);
  }

  /**
   * Recursively sanitizes values for logging (removes sensitive data)
   * @private
   */
  private static sanitizeValue(obj: unknown, depth = 0): unknown {
    if (depth > 10) return '***DEPTH_LIMIT***'; // Prevent infinite recursion
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeValue(item, depth + 1));
    }
    
    if (obj && typeof obj === 'object') {
      const result = Object.create(null);
      for (const [key, value] of Object.entries(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        
        const isSensitive = this.isSensitiveField(key);
        
        if (isSensitive && typeof value === 'string' && value) {
          if (safeIncludes(value, '@')) {
            const [local, domain] = value.split('@');
            result[key] = `${local.substring(0, 2)}***@${domain}`;
          } else if (value.length > 4) {
            result[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
          } else {
            result[key] = '***REDACTED***';
          }
        } else if (isSensitive) {
          result[key] = '***REDACTED***';
        } else {
          result[key] = this.sanitizeValue(value, depth + 1);
        }
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Parses tool call information from AI response
   */
  static parseToolCall(response: string): ToolCallParseResult {
    const trimmedResponse = response.trim();

    // Fast path: the model replied with JSON like {"name":"foo","arguments":{...}}
    if (trimmedResponse.startsWith('{')) {
      const jsonResult = this.parseJsonToolCall(trimmedResponse);
      if (jsonResult) {
        return jsonResult;
      }
      // If JSON parsing failed, fall through to legacy TOOL_CALL handling so we surface
      // meaningful validation errors instead of silently ignoring the payload.
    }

    // Legacy format: "TOOL_CALL: <name>" followed by PARAMETERS block.
    if (!safeIncludes(response, 'TOOL_CALL:')) {
      return { success: false, error: 'No tool call detected' };
    }

    const toolCallMatch = response.match(/TOOL_CALL:\s*([\w_]+)/);
    if (!toolCallMatch) {
      return {
        success: false,
        error: 'Invalid tool call format - could not extract tool name'
      };
    }

    const toolName = toolCallMatch[1];

    const parametersIndex = response.indexOf('PARAMETERS:');
    if (parametersIndex === -1) {
      return {
        success: false,
        error: 'Incomplete tool call format - missing parameters'
      };
    }

    const afterParameters = response
      .substring(parametersIndex + 'PARAMETERS:'.length)
      .trim();

    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < afterParameters.length; i++) {
      const char = afterParameters[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
    }

    if (endIndex === -1) {
      return {
        success: false,
        error: 'Incomplete tool call format - invalid JSON structure'
      };
    }

    const parametersJson = afterParameters.substring(0, endIndex);

    let parameters;
    try {
      parameters = JSON.parse(parametersJson);
    } catch (parseError) {
      Logger.error('Failed to parse tool parameters JSON:', parseError);
      return {
        success: false,
        error: 'Invalid JSON in tool parameters',
        rawParameters: parametersJson
      };
    }

    if (!this.isPlainObject(parameters)) {
      return {
        success: false,
        error: 'Tool parameters must be a plain object (not an array)',
        rawParameters: parametersJson
      };
    }

    const sanitized = this.sanitizeValue(parameters) as Record<string, unknown>;

    return {
      success: true,
      toolCall: {
        toolName,
        parameters,
        sanitizedParameters: sanitized
      },
      rawParameters: parametersJson
    };
  }

  /**
   * Validates that a tool call has all required parameters
   */
  static validateToolCall(toolCall: ToolCall, requiredParams: string[]): boolean {
    const missingParams = requiredParams.filter(param => 
      !toolCall.parameters || !(param in toolCall.parameters)
    );
    
    if (missingParams.length > 0) {
      Logger.warn(`Missing required parameters for tool ${toolCall.toolName}:`, missingParams);
      return false;
    }
    
    return true;
  }

  /**
   * Sanitizes tool parameters for logging (removes sensitive data)
   * Returns a deep-copied sanitized structure without mutating the original
   */
  static sanitizeParameters(parameters: unknown): unknown {
    if (!parameters || typeof parameters !== 'object') {
      return parameters;
    }

    // Use the existing recursive sanitizeValue function for consistent behavior
    return this.sanitizeValue(parameters);
  }

  /**
   * Parse a JSON tool call payload if present. Returns null when not applicable.
   */
  private static parseJsonToolCall(responseJson: string): ToolCallParseResult | null {
    try {
      const parsed = JSON.parse(responseJson);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }

      const toolName = typeof (parsed as Record<string, unknown>).name === 'string' ? (parsed as Record<string, unknown>).name as string : undefined;
      if (!toolName) {
        return null;
      }

      const parsedObj = parsed as Record<string, unknown>;
      const rawArguments = parsedObj.arguments ?? parsedObj.params ?? parsedObj.parameters ?? {};
      const normalizedArguments = this.normalizeArguments(rawArguments);

      if (!this.isPlainObject(normalizedArguments)) {
        return {
          success: false,
          error: 'Tool arguments must be a JSON object',
          rawParameters: typeof rawArguments === 'string' ? rawArguments : undefined
        };
      }

      const sanitized = this.sanitizeValue(normalizedArguments) as Record<string, unknown>;

      return {
        success: true,
        toolCall: {
          toolName,
          parameters: normalizedArguments,
          sanitizedParameters: sanitized
        },
        rawParameters: typeof rawArguments === 'string' ? rawArguments : undefined
      };
    } catch (error) {
      Logger.warn('Failed to parse JSON tool call payload', error);
      return {
        success: false,
        error: 'Invalid JSON tool call payload'
      };
    }
  }

  private static normalizeArguments(rawArguments: unknown): Record<string, unknown> | null {
    if (typeof rawArguments === 'string') {
      try {
        const parsed = JSON.parse(rawArguments);
        return this.isPlainObject(parsed) ? parsed : null;
      } catch (error) {
        Logger.warn('Failed to parse tool arguments JSON string', error);
        return null;
      }
    }

    if (this.isPlainObject(rawArguments)) {
      return rawArguments as Record<string, unknown>;
    }

    if (rawArguments === undefined || rawArguments === null) {
      return {};
    }

    return null;
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }
}
