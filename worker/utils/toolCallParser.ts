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
    const parametersMatch = response.match(/PARAMETERS:\s*(\{[^]*?\}(?:\n|$))/);

    if (!toolCallMatch || !parametersMatch) {
      return { 
        success: false, 
        error: 'Incomplete tool call format - missing tool name or parameters' 
      };
    }

    const toolName = toolCallMatch[1].toLowerCase();
    
    try {
      // Clean the JSON string before parsing
      const jsonStr = parametersMatch[1].trim();
      const parameters = JSON.parse(jsonStr);
      
      Logger.debug(`Tool call parsed: ${toolName}`, parameters);
      
      return {
        success: true,
        toolCall: {
          toolName,
          parameters
        }
      };
    } catch (error) {
      Logger.error('Failed to parse tool parameters:', error);
      return {
        success: false,
        error: 'Failed to parse tool parameters',
        rawParameters: parametersMatch[1]
      };
    }
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
   */
  static sanitizeParameters(parameters: any): any {
    if (!parameters || typeof parameters !== 'object') {
      return parameters;
    }

    const sanitized = { ...parameters };
    const sensitiveFields = ['email', 'phone', 'password', 'token', 'secret', 'key'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (typeof sanitized[field] === 'string') {
          const value = sanitized[field] as string;
          if (value.includes('@')) {
            // Email-like field
            const [local, domain] = value.split('@');
            sanitized[field] = `${local.substring(0, 2)}***@${domain}`;
          } else if (value.length > 4) {
            // Long string (likely phone/token)
            sanitized[field] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
          } else {
            sanitized[field] = '***REDACTED***';
          }
        } else {
          sanitized[field] = '***REDACTED***';
        }
      }
    }

    return sanitized;
  }
}
