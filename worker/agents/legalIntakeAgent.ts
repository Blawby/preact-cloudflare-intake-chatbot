// Re-export everything from the new modular structure
export { runLegalIntakeAgentStream, TOOL_HANDLERS } from './legal-intake/index.js';
export { collectContactInfo, createMatter, requestLawyerReview, analyzeDocument } from './legal-intake/toolDefinitions.js';