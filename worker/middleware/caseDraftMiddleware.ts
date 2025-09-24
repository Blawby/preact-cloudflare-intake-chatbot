import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { ConversationContextManager } from './conversationContextManager.js';

/**
 * Case Draft Middleware - handles case building and organization requests
 * Detects when users want to build case drafts and provides structured case building
 */
export const caseDraftMiddleware: PipelineMiddleware = {
  name: 'caseDraftMiddleware',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig) => {
    // Check if user is requesting case draft building
    const caseDraftKeywords = [
      'build a case draft',
      'organize my case',
      'case summary',
      'case preparation',
      'prepare my case',
      'case file',
      'case organization',
      'structure my case',
      'case building',
      'organize case information'
    ];

    const isCaseDraftRequest = caseDraftKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!isCaseDraftRequest) {
      return { context };
    }

    // Extract case information from the message
    const caseInfo = extractCaseInformation(message);
    
    // Update context with case draft
    const updatedContext = ConversationContextManager.updateCaseDraft(context, {
      matter_type: caseInfo.matterType || 'General Consultation',
      key_facts: caseInfo.facts || [],
      timeline: caseInfo.timeline || '',
      parties: caseInfo.parties || [],
      documents: caseInfo.documents || [],
      evidence: caseInfo.evidence || [],
      jurisdiction: caseInfo.jurisdiction || '',
      urgency: caseInfo.urgency || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft'
    });

    // Generate case summary response
    const response = generateCaseSummary(caseInfo);

    return {
      context: updatedContext,
      response,
      shouldStop: true
    };
  }
};

/**
 * Extract case information from user message
 */
function extractCaseInformation(message: string): {
  matterType?: string;
  facts?: string[];
  timeline?: string;
  parties?: Array<{ role: string; name?: string }>;
  documents?: string[];
  evidence?: string[];
  jurisdiction?: string;
  urgency?: string;
} {
  const matterTypes = [
    'family law', 'employment law', 'business law', 'contract review',
    'intellectual property', 'personal injury', 'criminal law', 'civil law',
    'real estate', 'estate planning', 'immigration', 'bankruptcy'
  ];

  // Extract matter type
  const matterType = matterTypes.find(type => 
    message.toLowerCase().includes(type.toLowerCase())
  );

  // Extract basic facts (simple keyword detection)
  const facts: string[] = [];
  if (message.toLowerCase().includes('fired') || message.toLowerCase().includes('terminated')) {
    facts.push('Employment termination');
  }
  if (message.toLowerCase().includes('divorce') || message.toLowerCase().includes('separation')) {
    facts.push('Family law matter');
  }
  if (message.toLowerCase().includes('contract') || message.toLowerCase().includes('agreement')) {
    facts.push('Contract-related issue');
  }
  if (message.toLowerCase().includes('injury') || message.toLowerCase().includes('accident')) {
    facts.push('Personal injury incident');
  }

  // Extract urgency
  let urgency = 'medium';
  if (message.toLowerCase().includes('urgent') || message.toLowerCase().includes('emergency')) {
    urgency = 'high';
  } else if (message.toLowerCase().includes('not urgent') || message.toLowerCase().includes('routine')) {
    urgency = 'low';
  }

  // Extract jurisdiction (simple state detection)
  const states = [
    'north carolina', 'nc', 'california', 'ca', 'texas', 'tx', 'florida', 'fl',
    'new york', 'ny', 'illinois', 'il', 'pennsylvania', 'pa'
  ];
  const jurisdiction = states.find(state => 
    message.toLowerCase().includes(state.toLowerCase())
  );

  return {
    matterType,
    facts: facts.length > 0 ? facts : undefined,
    urgency,
    jurisdiction
  };
}

/**
 * Generate a case summary response
 */
function generateCaseSummary(caseInfo: any): string {
  let response = "I've started organizing your case information. Here's what I've gathered so far:\n\n";

  if (caseInfo.matterType) {
    response += `**Case Type:** ${caseInfo.matterType}\n`;
  }

  if (caseInfo.jurisdiction) {
    response += `**Jurisdiction:** ${caseInfo.jurisdiction}\n`;
  }

  if (caseInfo.urgency) {
    response += `**Urgency:** ${caseInfo.urgency}\n`;
  }

  if (caseInfo.facts && caseInfo.facts.length > 0) {
    response += `\n**Key Facts Identified:**\n`;
    caseInfo.facts.forEach((fact: string, index: number) => {
      response += `${index + 1}. ${fact}\n`;
    });
  }

  response += `\n**Next Steps:**\n`;
  response += `• Please provide more details about your situation\n`;
  response += `• Share any relevant documents or evidence\n`;
  response += `• Let me know about any important dates or timeline\n`;
  response += `• I can help you organize this into a comprehensive case summary\n\n`;
  response += `Would you like to continue building your case draft with more specific information?`;

  return response;
}
