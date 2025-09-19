// Re-export everything from the new modular structure
export { ParalegalAgent, runParalegalAgentStream } from './paralegal/index.js';
export type { 
  MatterFormationStage, 
  ChecklistItem, 
  ParalegalState, 
  MatterFormationEvent, 
  MatterFormationResponse 
} from './paralegal/types.js';