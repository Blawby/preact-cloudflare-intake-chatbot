import type { Env, CaseBriefV1, HandoffDecision } from '../types';

// Matter formation stages
export type MatterFormationStage =
  | 'collect_parties'
  | 'conflicts_check'
  | 'documents_needed'
  | 'fee_scope'
  | 'engagement'
  | 'filing_prep'
  | 'completed';

// Checklist item for tracking progress
export interface ChecklistItem {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
  required: boolean;
  assignedTo?: string;
  dueDate?: string;
}

// Durable Object state
export interface ParalegalState {
  stage: MatterFormationStage;
  checklist: ChecklistItem[];
  caseBrief?: CaseBriefV1;
  handoff?: HandoffDecision;
  metadata: {
    teamId?: string;
    matterId?: string;
    clientInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    opposingParty?: string;
    matterType?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Events that can advance the state machine
export interface MatterFormationEvent {
  type: 'user_input' | 'conflict_check_complete' | 'documents_received' | 'payment_complete' | 'letter_signed';
  data?: any;
  idempotencyKey?: string;
  teamId?: string;
  matterId?: string;
}

// Response from state machine operations
export interface MatterFormationResponse {
  stage: MatterFormationStage;
  checklist: ChecklistItem[];
  nextActions: string[];
  missing?: string[];
  completed: boolean;
  metadata?: any;
}

// Helper function to determine if case should be handed off to human lawyer
function shouldHandOff(risk: { level: string; notes: string[] }, brief?: CaseBriefV1): HandoffDecision {
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

export class ParalegalAgent {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Route to different endpoints
      if (pathname.endsWith('/advance') && request.method === 'POST') {
        return await this.handleAdvance(request);
      }
      
      if (pathname.endsWith('/status') && request.method === 'GET') {
        return await this.handleStatus(request);
      }
      
      if (pathname.endsWith('/checklist') && request.method === 'GET') {
        return await this.handleChecklist(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('ParalegalAgent error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getCurrentState(): Promise<ParalegalState> {
    const stored = await this.state.storage.get<ParalegalState>('state');
    
    if (stored) {
      return stored;
    }

    // Initialize default state
    const defaultState: ParalegalState = {
      stage: 'collect_parties',
      checklist: this.initializeChecklist('collect_parties'),
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.saveState(defaultState);
    return defaultState;
  }

  private async saveState(state: ParalegalState): Promise<void> {
    state.updatedAt = Date.now();
    await this.state.storage.put('state', state);
  }

  private async handleAdvance(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as MatterFormationEvent;
    const { idempotencyKey, teamId, matterId } = body;

    // Basic metrics tracking
    try {
      console.log('Paralegal advance operation:', { teamId, matterId, type: body.type, timestamp: Date.now() });
    } catch (e) {
      // Don't fail on metrics errors
    }

    // Handle idempotency
    if (idempotencyKey) {
      const existingResult = await this.state.storage.get(`idem:${idempotencyKey}`);
      if (existingResult) {
        console.log('Paralegal idempotent response:', { teamId, matterId, idempotencyKey });
        return this.jsonResponse({
          ...(existingResult as any),
          idempotent: true
        });
      }
    }

    // TODO: Add team/matter authorization check here
    // const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    // if (!isAuthorized) return new Response('Unauthorized', { status: 401 });

    const currentState = await this.getCurrentState();
    const nextState = await this.advanceStateMachine(currentState, body);
    
    // Log stage transitions for metrics
    if (currentState.stage !== nextState.stage) {
      console.log('Paralegal stage transition:', {
        teamId,
        matterId,
        from: currentState.stage,
        to: nextState.stage,
        timestamp: Date.now()
      });
    }
    
    await this.saveState(nextState);

    // Store idempotency result
    if (idempotencyKey) {
      const result = this.buildResponse(nextState);
      await this.state.storage.put(`idem:${idempotencyKey}`, result);
    }

    // Write to audit log in D1
    try {
      await this.writeAuditLog(teamId, matterId, 'stage_advance', {
        from: currentState.stage,
        to: nextState.stage,
        eventType: body.type,
        idempotencyKey
      });
    } catch (error) {
      console.warn('Failed to write audit log:', error);
      // Don't fail the operation for audit logging issues
    }

    return this.jsonResponse(this.buildResponse(nextState));
  }

  private async handleStatus(request: Request): Promise<Response> {
    const currentState = await this.getCurrentState();
    return this.jsonResponse(this.buildResponse(currentState));
  }

  private async handleChecklist(request: Request): Promise<Response> {
    const currentState = await this.getCurrentState();
    return this.jsonResponse({
      checklist: currentState.checklist,
      stage: currentState.stage,
      completed: currentState.stage === 'completed'
    });
  }

  private async advanceStateMachine(
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
        if (this.hasRequiredPartyInfo(event.data)) {
          nextState.stage = 'conflicts_check';
          nextState.checklist = this.initializeChecklist('conflicts_check');
          this.markChecklistComplete(nextState.checklist, 'collect_parties');
        }
        break;

      case 'conflicts_check':
        if (event.type === 'conflict_check_complete') {
          nextState.stage = 'documents_needed';
          nextState.checklist = this.initializeChecklist('documents_needed');
          this.markChecklistComplete(nextState.checklist, 'conflicts_check');
        }
        break;

      case 'documents_needed':
        if (event.type === 'documents_received' || this.allDocumentsReceived(nextState.checklist)) {
          nextState.stage = 'fee_scope';
          nextState.checklist = this.initializeChecklist('fee_scope');
          this.markChecklistComplete(nextState.checklist, 'documents_needed');
        }
        break;

      case 'fee_scope':
        if (event.type === 'payment_complete' || this.feeStructureAgreed(event.data)) {
          nextState.stage = 'engagement';
          nextState.checklist = this.initializeChecklist('engagement');
          this.markChecklistComplete(nextState.checklist, 'fee_scope');
        }
        break;

      case 'engagement':
        if (event.type === 'letter_signed' || this.engagementLetterSigned(event.data)) {
          nextState.stage = 'filing_prep';
          nextState.checklist = this.initializeChecklist('filing_prep');
          this.markChecklistComplete(nextState.checklist, 'engagement');
        }
        break;

      case 'filing_prep':
        if (this.filingPreparationComplete(nextState.checklist)) {
          nextState.stage = 'completed';
          nextState.checklist = this.initializeChecklist('completed');
          this.markChecklistComplete(nextState.checklist, 'filing_prep');
        }
        break;

      case 'completed':
        // Terminal state - no further transitions
        break;
    }

    // Update case brief with current information
    nextState.caseBrief = this.updateCaseBrief(nextState, event);
    
    // Compute handoff decision
    const riskAssessment = await this.assessRisk(nextState);
    nextState.handoff = shouldHandOff(riskAssessment, nextState.caseBrief);

    return nextState;
  }

  private initializeChecklist(stage: MatterFormationStage): ChecklistItem[] {
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

  private markChecklistComplete(checklist: ChecklistItem[], completedStage: string): void {
    // Mark previous stage items as completed
    checklist.forEach(item => {
      if (item.id.includes(completedStage.split('_')[0])) {
        item.status = 'completed';
      }
    });
  }

  private buildResponse(state: ParalegalState): MatterFormationResponse {
    const pendingItems = state.checklist.filter(item => item.status === 'pending' && item.required);
    
    const response: any = {
      stage: state.stage,
      checklist: state.checklist,
      nextActions: this.getNextActions(state.stage, pendingItems),
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

  private getNextActions(stage: MatterFormationStage, pendingItems: ChecklistItem[]): string[] {
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

  // Helper methods for state transition conditions
  private hasRequiredPartyInfo(data: any): boolean {
    // Simplified check - in production, verify all required party information is present
    return data && (data.clientInfo || data.name) && (data.opposingParty || data.matterType);
  }

  private allDocumentsReceived(checklist: ChecklistItem[]): boolean {
    const docItems = checklist.filter(item => item.id.includes('doc'));
    return docItems.length > 0 && docItems.every(item => item.status === 'completed');
  }

  private feeStructureAgreed(data: any): boolean {
    return data && (data.feeApproved || data.paymentComplete);
  }

  private engagementLetterSigned(data: any): boolean {
    return data && (data.letterSigned || data.engagementComplete);
  }

  private filingPreparationComplete(checklist: ChecklistItem[]): boolean {
    const filingItems = checklist.filter(item => item.required);
    return filingItems.every(item => item.status === 'completed');
  }

  private async writeAuditLog(
    teamId?: string,
    matterId?: string,
    action: string = 'unknown',
    metadata: any = {}
  ): Promise<void> {
    if (!teamId || !matterId) return;

    try {
      // Note: In a real DO, we'd need to access the DB through a service or API
      // For now, we'll just log the audit event - this would typically be done
      // via a queue message or service call
      console.log('Audit log entry:', {
        id: crypto.randomUUID(),
        matter_id: matterId,
        team_id: teamId,
        actor: 'paralegal.do',
        action,
        entity_type: 'matter_formation',
        entity_id: matterId,
        old_values: metadata.from ? { stage: metadata.from } : null,
        new_values: metadata.to ? { stage: metadata.to } : null,
        metadata,
        created_at: new Date().toISOString()
      });

      // TODO: In production, send this to a queue for async DB writing
      // await this.env.PARALEGAL_TASKS.send({
      //   type: 'audit_log',
      //   data: { teamId, matterId, action, metadata }
      // });

    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private updateCaseBrief(state: ParalegalState, event: MatterFormationEvent): CaseBriefV1 {
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
    existing.next_steps_ai = this.getNextStepsForStage(state.stage);

    return existing;
  }

  private async assessRisk(state: ParalegalState): Promise<{ level: 'low' | 'med' | 'high'; notes: string[] }> {
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

  private getNextStepsForStage(stage: MatterFormationStage): string[] {
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
}

// Streaming conversational paralegal agent
export async function runParalegalAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: any,
  controller?: ReadableStreamDefaultController,
  attachments: any[] = []
) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    const { AIService } = await import('../services/AIService');
    const aiService = new AIService(env.AI, env);
    teamConfig = await aiService.getTeamConfig(teamId);
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map((msg: any) => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Build paralegal-specific system prompt
  let systemPrompt = `You are an AI Paralegal who provides concise, empathetic guidance. Keep responses brief and actionable.

**Your Style:**
- Start with brief empathy (1 sentence)
- Give 2-3 immediate action steps
- Ask 1-2 specific questions to help
- Keep responses under 100 words
- Be warm but concise

**When to Suggest Legal Help:**
After 2-3 exchanges, if they need:
- Workers' comp claims
- Wrongful termination cases
- Complex divorce (high assets, custody)
- Any legal filing or court process
- Employment discrimination
- Document review

Say: "This sounds like you'd benefit from speaking with one of our attorneys. Would you like me to connect you with a lawyer who can help with [specific issue]?"

**For Divorce:**
"I'm sorry you're going through this. First steps: (1) Gather important docs (marriage cert, bank statements), (2) Secure your finances. 

Are you safe? Do you have children together?"

**For Employment:**
"That's really tough. Key steps: (1) Get termination details in writing, (2) File for unemployment, (3) Update your resume.

What industry are you in? Any severance offered?"

Keep it short, helpful, and human. Don't overwhelm them.`;

  // Check if this case needs attorney referral
  const messageCount = formattedMessages.filter(msg => msg.role === 'user').length;
  const conversationText = formattedMessages.map(msg => msg.content).join(' ').toLowerCase();
  
  const needsAttorney = messageCount >= 3 && (
    conversationText.includes('workers comp') || 
    conversationText.includes('wrongful termination') ||
    conversationText.includes('file a claim') ||
    conversationText.includes('discrimination') ||
    conversationText.includes('lawsuit') ||
    conversationText.includes('court') ||
    (conversationText.includes('divorce') && (conversationText.includes('million') || conversationText.includes('assets'))) ||
    conversationText.includes('custody')
  );

  if (needsAttorney) {
    systemPrompt += `\n\nIMPORTANT: This user has been asking about complex legal issues for ${messageCount} messages. You should now suggest connecting them with an attorney for proper legal assistance. Use the phrase suggested above.`;
  }

  try {
    console.log('🔄 Starting paralegal streaming agent...');
    console.log('📥 Messages received:', JSON.stringify(formattedMessages, null, 2));
    
    // Send initial connection event
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call to generate contextual response
    console.log('🤖 Calling AI model for paralegal response...');
    console.log('🧠 System prompt:', systemPrompt.substring(0, 200) + '...');
    
    const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      max_tokens: 200,
      temperature: 0.3
    });
    
    console.log('✅ Paralegal AI result:', JSON.stringify(aiResult, null, 2));
    
    const response = aiResult.response || 'I apologize, but I encountered an error processing your request.';
    console.log('📝 Paralegal response:', response);
    
    if (controller) {
      // Stream the response word by word
      const chunks = response.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLastChunk = i === chunks.length - 1;
        const separator = isLastChunk ? '' : ' ';
        const escapedText = JSON.stringify(`${chunk}${separator}`);
        controller.enqueue(new TextEncoder().encode(`data: {"type":"text","text":${escapedText}}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for streaming effect
      }
      
      // Send final response
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: response,
        workflow: 'PARALEGAL_AGENT'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
    }
    
    return { response, workflow: 'PARALEGAL_AGENT' };
  } catch (error) {
    console.error('❌ Paralegal streaming error:', error);
    
    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: error.message || 'An error occurred'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
    }
    
    throw error;
  }
}
