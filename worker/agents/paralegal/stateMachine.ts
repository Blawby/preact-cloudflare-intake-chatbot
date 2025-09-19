import type { CaseBriefV1, HandoffDecision } from '../../types';
import type { 
  MatterFormationStage, 
  ChecklistItem, 
  ParalegalState, 
  MatterFormationEvent, 
  MatterFormationResponse 
} from './types.js';

// Helper function to determine if case should be handed off to human lawyer
export function shouldHandOff(risk: { level: string; notes: string[] }, brief?: CaseBriefV1): HandoffDecision {
  // Hard triggers (always hand off)
  const hardTriggers = ['criminal', 'immigration', 'trial', 'hearing', 'served', 'deadline', 'court appearance'];
  const summary = brief?.summary?.toLowerCase() || '';
  const timelineText = JSON.stringify(brief?.timeline || []).toLowerCase();
  
  const hasHardTrigger = hardTriggers.some(trigger => 
    summary.includes(trigger) || timelineText.includes(trigger)
  );
  
  if (hasHardTrigger) {
    return { 
      recommended: true, 
      reason: 'hard_trigger',
      message: 'This case involves complex legal matters that require immediate attorney attention.'
    };
  }
  
  // High risk cases
  if (risk?.level === 'high') {
    return { 
      recommended: true, 
      reason: 'high_risk',
      message: 'Based on the complexity and risk factors, this case needs attorney review.'
    };
  }
  
  // Medium risk with uncertainty or missing critical documents
  if (risk?.level === 'med') {
    const missingCriticalDocs = brief?.docs_needed?.some(doc => 
      doc.toLowerCase().includes('court') || 
      doc.toLowerCase().includes('petition') ||
      doc.toLowerCase().includes('summons')
    );
    
    if (missingCriticalDocs) {
      return { 
        recommended: true, 
        reason: 'document_gaps',
        message: 'Critical legal documents are needed to properly assess your case.'
      };
    }
  }
  
  return { recommended: false };
}

export function initializeChecklist(stage: MatterFormationStage): ChecklistItem[] {
  const checklists: Record<MatterFormationStage, ChecklistItem[]> = {
    collect_parties: [
      { id: 'client_info', title: 'Collect client information', status: 'pending', required: true },
      { id: 'opposing_party', title: 'Identify opposing party', status: 'pending', required: true },
      { id: 'matter_type', title: 'Determine matter type', status: 'pending', required: true }
    ],
    conflicts_check: [
      { id: 'run_conflicts', title: 'Run conflict check', status: 'pending', required: true },
      { id: 'review_results', title: 'Review conflict results', status: 'pending', required: true },
      { id: 'clear_conflicts', title: 'Clear any conflicts', status: 'pending', required: true }
    ],
    documents_needed: [
      { id: 'identify_docs', title: 'Identify required documents', status: 'pending', required: true },
      { id: 'request_docs', title: 'Request documents from client', status: 'pending', required: true },
      { id: 'receive_docs', title: 'Receive and review documents', status: 'pending', required: true }
    ],
    fee_scope: [
      { id: 'determine_scope', title: 'Determine scope of work', status: 'pending', required: true },
      { id: 'calculate_fees', title: 'Calculate fees and costs', status: 'pending', required: true },
      { id: 'client_approval', title: 'Get client approval', status: 'pending', required: true }
    ],
    engagement: [
      { id: 'draft_letter', title: 'Draft engagement letter', status: 'pending', required: true },
      { id: 'review_letter', title: 'Review with client', status: 'pending', required: true },
      { id: 'sign_letter', title: 'Execute engagement letter', status: 'pending', required: true }
    ],
    filing_prep: [
      { id: 'prepare_filings', title: 'Prepare necessary filings', status: 'pending', required: true },
      { id: 'review_filings', title: 'Review with attorney', status: 'pending', required: true },
      { id: 'ready_to_file', title: 'Ready for filing', status: 'pending', required: true }
    ],
    completed: [
      { id: 'matter_active', title: 'Matter successfully formed', status: 'completed', required: true }
    ]
  };

  return checklists[stage] || [];
}

export function markChecklistComplete(checklist: ChecklistItem[], completedStage: string): void {
  // Mark previous stage items as completed
  checklist.forEach(item => {
    if (item.id.includes(completedStage.split('_')[0])) {
      item.status = 'completed';
    }
  });
}

export function getNextActions(stage: MatterFormationStage, pendingItems: ChecklistItem[]): string[] {
  const actions: Record<MatterFormationStage, string[]> = {
    collect_parties: ['Collect client contact information', 'Identify opposing party', 'Determine matter type'],
    conflicts_check: ['Run conflict check against existing clients', 'Review and resolve any conflicts'],
    documents_needed: ['Request required documents from client', 'Review submitted documents'],
    fee_scope: ['Determine scope of representation', 'Calculate fees and present to client'],
    engagement: ['Draft engagement letter', 'Review and execute with client'],
    filing_prep: ['Prepare necessary court filings', 'Review with supervising attorney'],
    completed: ['Matter formation complete']
  };

  return actions[stage] || [];
}

export function getNextStepsForStage(stage: MatterFormationStage): string[] {
  const nextSteps: Record<MatterFormationStage, string[]> = {
    collect_parties: [
      'Gather detailed client contact information',
      'Identify all opposing parties',
      'Determine specific legal matter type'
    ],
    conflicts_check: [
      'Run comprehensive conflict check',
      'Review potential conflicts with existing clients',
      'Document conflict check results'
    ],
    documents_needed: [
      'Create document collection checklist',
      'Request required documents from client',
      'Review and organize received documents'
    ],
    fee_scope: [
      'Prepare fee agreement',
      'Discuss scope of representation',
      'Obtain client approval for fees'
    ],
    engagement: [
      'Draft engagement letter',
      'Review terms with client',
      'Obtain signed engagement letter'
    ],
    filing_prep: [
      'Prepare initial pleadings',
      'Review all documentation',
      'Prepare for filing'
    ],
    completed: [
      'Matter formation complete',
      'Ready for attorney assignment'
    ]
  };

  return nextSteps[stage] || [];
}

// Helper methods for state transition conditions
export function hasRequiredPartyInfo(data: any): boolean {
  // Simplified check - in production, verify all required party information is present
  return data && (data.clientInfo || data.name) && (data.opposingParty || data.matterType);
}

export function allDocumentsReceived(checklist: ChecklistItem[]): boolean {
  const docItems = checklist.filter(item => item.id.includes('doc'));
  return docItems.length > 0 && docItems.every(item => item.status === 'completed');
}

export function feeStructureAgreed(data: any): boolean {
  return data && (data.feeApproved || data.paymentComplete);
}

export function engagementLetterSigned(data: any): boolean {
  return data && (data.letterSigned || data.engagementComplete);
}

export function filingPreparationComplete(checklist: ChecklistItem[]): boolean {
  const filingItems = checklist.filter(item => item.required);
  return filingItems.every(item => item.status === 'completed');
}

export async function assessRisk(state: ParalegalState): Promise<{ level: 'low' | 'med' | 'high'; notes: string[] }> {
  const notes: string[] = [];
  let level: 'low' | 'med' | 'high' = 'low';

  // Check for high-risk indicators
  const summary = state.caseBrief?.summary?.toLowerCase() || '';
  const timeline = state.caseBrief?.timeline || [];

  // Hard triggers for high risk
  if (summary.includes('criminal') || summary.includes('immigration')) {
    level = 'high';
    notes.push('Criminal or immigration matter detected');
  }

  // Check timeline for urgent deadlines
  const urgentDeadlines = timeline.filter(item => 
    item.event.toLowerCase().includes('deadline') || 
    item.event.toLowerCase().includes('hearing') ||
    item.event.toLowerCase().includes('trial')
  );

  if (urgentDeadlines.length > 0) {
    level = 'high';
    notes.push('Urgent court deadlines detected');
  }

  // Medium risk indicators
  if (summary.includes('custody') || summary.includes('support') || summary.includes('property')) {
    level = level === 'high' ? 'high' : 'med';
    notes.push('Complex family law issues detected');
  }

  // Document complexity
  const docsNeeded = state.caseBrief?.docs_needed || [];
  if (docsNeeded.length > 5) {
    level = level === 'high' ? 'high' : 'med';
    notes.push('Extensive documentation requirements');
  }

  return { level, notes };
}

export function updateCaseBrief(state: ParalegalState, event: MatterFormationEvent): CaseBriefV1 {
  const existing = state.caseBrief || {
    teamId: state.metadata.teamId || '',
    matterId: state.metadata.matterId || '',
    matter_type: 'Unknown',
    summary: '',
    timeline: [],
    parties: { client: '', opposing: [], orgs: [] },
    issues: [],
    jurisdiction: '',
    docs_needed: [],
    docs_received: [],
    risk: { level: 'low' as const, notes: [] },
    next_steps_ai: []
  };

  // Update with new information from event
  if (event.data?.clientInfo) {
    existing.parties.client = event.data.clientInfo.name || existing.parties.client;
    existing.jurisdiction = event.data.clientInfo.location || existing.jurisdiction;
  }

  if (event.data?.opposingParty) {
    const opposing = Array.isArray(event.data.opposingParty) 
      ? event.data.opposingParty 
      : [event.data.opposingParty];
    existing.parties.opposing = [...new Set([...existing.parties.opposing, ...opposing])];
  }

  if (event.data?.matterType) {
    existing.matter_type = event.data.matterType;
  }

  // Generate summary based on current information
  if (existing.parties.client && existing.matter_type !== 'Unknown') {
    existing.summary = `${existing.parties.client} seeking assistance with ${existing.matter_type.toLowerCase()}${
      existing.parties.opposing.length > 0 ? ` involving ${existing.parties.opposing.join(', ')}` : ''
    }.`;
  }

  // Update timeline with stage transitions
  // Add timeline entry for any event
  existing.timeline.push({
    date: new Date().toISOString(),
    event: `${event.type}: Advanced to ${state.stage} stage`
  });

  // Update next steps based on current stage
  existing.next_steps_ai = getNextStepsForStage(state.stage);

  return existing;
}

export async function advanceStateMachine(
  currentState: ParalegalState, 
  event: MatterFormationEvent
): Promise<ParalegalState> {
  const nextState = { ...currentState };

  // Update metadata if provided
  if (event.teamId) nextState.metadata.teamId = event.teamId;
  if (event.matterId) nextState.metadata.matterId = event.matterId;

  // State transitions based on current stage
  switch (currentState.stage) {
    case 'collect_parties':
      if (hasRequiredPartyInfo(event.data)) {
        nextState.stage = 'conflicts_check';
        nextState.checklist = initializeChecklist('conflicts_check');
        markChecklistComplete(nextState.checklist, 'collect_parties');
      }
      break;

    case 'conflicts_check':
      if (event.type === 'conflict_check_complete') {
        nextState.stage = 'documents_needed';
        nextState.checklist = initializeChecklist('documents_needed');
        markChecklistComplete(nextState.checklist, 'conflicts_check');
      }
      break;

    case 'documents_needed':
      if (event.type === 'documents_received' || allDocumentsReceived(nextState.checklist)) {
        nextState.stage = 'fee_scope';
        nextState.checklist = initializeChecklist('fee_scope');
        markChecklistComplete(nextState.checklist, 'documents_needed');
      }
      break;

    case 'fee_scope':
      if (event.type === 'payment_complete' || feeStructureAgreed(event.data)) {
        nextState.stage = 'engagement';
        nextState.checklist = initializeChecklist('engagement');
        markChecklistComplete(nextState.checklist, 'fee_scope');
      }
      break;

    case 'engagement':
      if (event.type === 'letter_signed' || engagementLetterSigned(event.data)) {
        nextState.stage = 'filing_prep';
        nextState.checklist = initializeChecklist('filing_prep');
        markChecklistComplete(nextState.checklist, 'engagement');
      }
      break;

    case 'filing_prep':
      if (filingPreparationComplete(nextState.checklist)) {
        nextState.stage = 'completed';
        nextState.checklist = initializeChecklist('completed');
        markChecklistComplete(nextState.checklist, 'filing_prep');
      }
      break;

    case 'completed':
      // Terminal state - no further transitions
      break;
  }

  // Update case brief with current information
  nextState.caseBrief = updateCaseBrief(nextState, event);
  
  // Compute handoff decision
  const riskAssessment = await assessRisk(nextState);
  nextState.handoff = shouldHandOff(riskAssessment, nextState.caseBrief);

  return nextState;
}

export function buildResponse(state: ParalegalState): MatterFormationResponse {
  const pendingItems = state.checklist.filter(item => item.status === 'pending' && item.required);
  
  const response: any = {
    stage: state.stage,
    checklist: state.checklist,
    nextActions: getNextActions(state.stage, pendingItems),
    missing: pendingItems.map(item => item.title),
    completed: state.stage === 'completed',
    metadata: state.metadata
  };

  // Include case brief if available
  if (state.caseBrief) {
    response.caseBrief = state.caseBrief;
  }

  // Include handoff directive if recommended
  if (state.handoff?.recommended) {
    response.directive = 'handoff_to_intake';
    response.handoffReason = state.handoff.reason;
    response.handoffMessage = state.handoff.message;
  }

  return response;
}