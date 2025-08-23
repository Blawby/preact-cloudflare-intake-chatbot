import { Logger } from './logger.js';

export interface ToolCall {
  toolName: string;
  parameters: any;
}

export interface ToolCallParseResult {
  success: boolean;
  toolCall?: ToolCall;
  error?: string;
  rawParameters?: string;
}

export class ToolCallParser {
  private static readonly sensitiveFields = ['email', 'phone', 'password', 'token', 'secret', 'key'];

  /**
   * Recursively sanitizes values for logging (removes sensitive data)
   * @private
   */
  private static sanitizeValue(obj: any, depth = 0): any {
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
        
        const lowerKey = key.toLowerCase();
        const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
        
        if (isSensitive && typeof value === 'string') {
          if (value.includes('@')) {
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
    // Check for tool call indicators
    if (!response.includes('TOOL_CALL:')) {
      return { success: false, error: 'No tool call detected' };
    }

    // Parse tool call
    const toolCallMatch = response.match(/TOOL_CALL:\s*([\w_]+)/);
    if (!toolCallMatch) {
      return { 
        success: false, 
        error: 'Invalid tool call format - could not extract tool name' 
      };
    }
    
    const toolName = toolCallMatch[1];
    
    // Find the start of PARAMETERS
    const parametersIndex = response.indexOf('PARAMETERS:');
    if (parametersIndex === -1) {
      return { 
        success: false, 
        error: 'Incomplete tool call format - missing parameters' 
      };
    }
    
    // Extract everything after PARAMETERS:
    const afterParameters = response
      .substring(parametersIndex + 'PARAMETERS:'.length)
      .trim();
    
    // Find the matching closing brace by counting braces
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
    
    // Parse the JSON parameters
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
    
    // Validate parameters is an object (not null, not array, and is an object)
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      return { 
        success: false, 
        error: 'Tool parameters must be a plain object (not an array)',
        rawParameters: parametersJson
      };
    }
    
    // Create a safe copy without prototype‐pollution risk and sanitize for logging
    const sanitized = this.sanitizeValue(parameters);
    
    // Return the parsed tool call with sanitized parameters for logging
    return {
      success: true,
      toolCall: {
        toolName,
        parameters: sanitized
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
  static sanitizeParameters(parameters: any): any {
    if (!parameters || typeof parameters !== 'object') {
      return parameters;
    }

    // Use the existing recursive sanitizeValue function for consistent behavior
    return this.sanitizeValue(parameters);
  }
}
