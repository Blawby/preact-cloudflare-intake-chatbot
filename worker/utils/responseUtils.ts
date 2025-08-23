export interface ToolResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface AnalysisErrorResponse {
  summary: string;
  key_facts: string[];
  entities: { people: string[]; orgs: string[]; dates: string[] };
  action_items: string[];
  confidence: number;
}

/**
 * Creates a standardized tool response
 */
export function createToolResponse(
  success: boolean, 
  message: string, 
  data?: any
): ToolResponse {
  return { success, message, data };
}

/**
 * Creates a standardized error response for file analysis
 */
export function createAnalysisErrorResponse(
  message: string, 
  actionItems: string[] = []
): AnalysisErrorResponse {
  return {
    summary: message,
    key_facts: ["Analysis failed"],
    entities: { people: [], orgs: [], dates: [] },
    action_items: actionItems.length > 0 ? actionItems : ["Please try uploading the file again", "Contact support if the issue persists"],
    confidence: 0.0
  };
}

/**
 * Creates a validation error response
 */
export function createValidationError(message: string): ToolResponse {
  return createToolResponse(false, message);
}

/**
 * Creates a success response with data
 */
export function createSuccessResponse(message: string, data?: any): ToolResponse {
  return createToolResponse(true, message, data);
}
