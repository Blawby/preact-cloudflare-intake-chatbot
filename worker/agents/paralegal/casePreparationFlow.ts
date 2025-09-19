export enum CasePreparationStage {
  INITIAL = 'initial',
  ASSESSING_ISSUE = 'assessing_issue',
  GATHERING_FACTS = 'gathering_facts',
  COLLECTING_EVIDENCE = 'collecting_evidence',
  IDENTIFYING_LEGAL_ISSUES = 'identifying_legal_issues',
  ORGANIZING_CASE = 'organizing_case',
  GENERATING_SUMMARY = 'generating_summary',
  CASE_READY = 'case_ready'
}

export interface CaseInformation {
  legalIssueType?: string;
  keyFacts: string[];
  timeline: string[];
  evidence: string[];
  witnesses: string[];
  communications: string[];
  legalIssues: string[];
  damages: string[];
  caseSummary?: string;
}

export interface CasePreparationContext {
  stage: CasePreparationStage;
  information: CaseInformation;
  conversationHistory: string;
}

export class CasePreparationFlow {
  /**
   * Determines the current stage based on conversation context
   */
  static getCurrentStage(context: CasePreparationContext): CasePreparationStage {
    const { information, conversationHistory } = context;
    const text = conversationHistory.toLowerCase();

    // If we have a complete case summary, we're ready
    if (information.caseSummary && information.caseSummary.length > 100) {
      return CasePreparationStage.CASE_READY;
    }

    // If we have comprehensive information, generate summary
    const hasComprehensiveInfo = information.legalIssueType && 
                                 information.keyFacts.length >= 2 && 
                                 (information.legalIssues.length > 0 || information.evidence.length > 0 || information.witnesses.length > 0);
    
    if (hasComprehensiveInfo) {
      return CasePreparationStage.GENERATING_SUMMARY;
    }

    // Also generate summary if we have enough facts and any supporting information
    const hasEnoughFacts = information.legalIssueType && 
                          information.keyFacts.length >= 3;
    
    if (hasEnoughFacts) {
      return CasePreparationStage.GENERATING_SUMMARY;
    }

    // If we have facts and evidence, identify legal issues
    if (information.keyFacts.length >= 3 && (information.evidence.length > 0 || information.witnesses.length > 0)) {
      return CasePreparationStage.IDENTIFYING_LEGAL_ISSUES;
    }

    // If we have basic facts, collect evidence
    if (information.keyFacts.length >= 2) {
      return CasePreparationStage.COLLECTING_EVIDENCE;
    }

    // If we have legal issue type, gather facts
    if (information.legalIssueType) {
      return CasePreparationStage.GATHERING_FACTS;
    }

    // If we have some conversation, assess the issue
    if (conversationHistory.length > 50) {
      return CasePreparationStage.ASSESSING_ISSUE;
    }

    return CasePreparationStage.INITIAL;
  }

  /**
   * Gets the appropriate response for the current stage
   */
  static getResponseForStage(stage: CasePreparationStage, context: CasePreparationContext): string {
    const { information } = context;

    switch (stage) {
      case CasePreparationStage.INITIAL:
        return "I'm here to help you prepare your legal case so you can get the most value from your lawyer consultation. Let's start by understanding your situation. What legal issue are you facing?";

      case CasePreparationStage.ASSESSING_ISSUE:
        return "I understand you're dealing with a legal issue. To help you prepare a strong case, I need to understand the specifics. Can you tell me:\n\n1. What type of legal problem is this? (e.g., employment, family law, personal injury, etc.)\n2. When did this situation begin?\n3. Who else is involved?";

      case CasePreparationStage.GATHERING_FACTS:
        return `Great! I can see this involves ${information.legalIssueType}. Now let's gather the key facts. Please tell me:\n\n1. What exactly happened? (Give me the main events in order)\n2. When did each event occur?\n3. What was said or done by each person involved?\n4. How has this situation affected you?`;

      case CasePreparationStage.COLLECTING_EVIDENCE:
        return "Excellent! I have the basic facts. Now let's identify evidence that could support your case:\n\n1. Do you have any documents related to this? (contracts, emails, texts, photos, etc.)\n2. Are there any witnesses who saw what happened?\n3. Do you have any records of communications (emails, texts, voicemails)?\n4. Are there any other materials that could help your case?";

      case CasePreparationStage.IDENTIFYING_LEGAL_ISSUES:
        return "Perfect! Now let's identify the specific legal issues in your case:\n\n1. What laws or rights do you think were violated?\n2. What specific harm or damages have you suffered?\n3. What outcome are you seeking?\n4. Are there any deadlines or time limits you're aware of?";

      case CasePreparationStage.ORGANIZING_CASE:
        return "Great! Let me organize all this information into a clear case summary for your lawyer. This will help them understand your situation quickly and provide better advice.";

      case CasePreparationStage.GENERATING_SUMMARY:
        const summary = this.generateCaseSummary(information);
        return `I'm preparing your case summary now. This will include all the facts, evidence, and legal issues we've discussed, organized in a way that will help your lawyer understand your situation quickly.\n\n${summary}`;

      case CasePreparationStage.CASE_READY:
        return "Your case is ready! I've prepared a comprehensive summary that includes all the key information your lawyer will need. This will save you time and money during your consultation.";

      default:
        return "I'm here to help you prepare your legal case. What legal issue are you facing?";
    }
  }

  /**
   * Extracts information from conversation text using enhanced basic patterns
   */
  static extractCaseInformation(conversationText: string, env?: any): Partial<CaseInformation> {
    // Use enhanced basic patterns for reliable extraction
    const basicData = this.extractWithBasicPatterns(conversationText);
    const regexData = this.extractWithRegex(conversationText);
    
    // Merge basic and regex data
    return this.mergeExtractions(regexData, basicData);
  }

  /**
   * Regex extraction for structured patterns (evidence, witnesses, etc.)
   */
  private static extractWithRegex(conversationText: string): Partial<CaseInformation> {
    const text = conversationText.toLowerCase();
    
    // Extract evidence mentions with regex
    const evidence: string[] = [];
    const evidenceKeywords = ['document', 'email', 'text', 'photo', 'record', 'contract', 'receipt', 'invoice'];
    evidenceKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        evidence.push(`Mentioned ${keyword}s`);
      }
    });

    // Extract witness mentions with regex
    const witnesses: string[] = [];
    const witnessPatterns = [
      /(?:witness|saw|observed|heard)[^.]*\./gi,
      /(?:coworker|colleague|friend|neighbor|family)[^.]*\./gi
    ];
    
    witnessPatterns.forEach(pattern => {
      const matches = conversationText.match(pattern);
      if (matches) {
        witnesses.push(...matches.slice(0, 2));
      }
    });

    return {
      evidence,
      witnesses: witnesses.slice(0, 3)
    };
  }

  /**
   * LLM extraction for all case information (comprehensive coverage)
   */
  private static async extractWithLLM(conversationText: string, env?: any): Promise<Partial<CaseInformation>> {
    if (!env?.AI) {
      // Fallback to basic extraction if no AI available
      return this.extractWithBasicPatterns(conversationText);
    }

    try {
      // Shorter timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM extraction timeout')), 5000)
      );

      // Simplified prompt for faster processing
      const prompt = `Extract legal case info. Return JSON only:

{
  "legalIssueType": "Employment Law|Family Law|Personal Injury|Business Law|Landlord/Tenant|Criminal Law|General Consultation",
  "keyFacts": ["fact 1", "fact 2"],
  "evidence": ["evidence 1"],
  "witnesses": ["witness 1"],
  "legalIssues": ["legal issue 1"]
}

Text: ${conversationText.substring(0, 1000)}

JSON:`;

      const llmPromise = env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1
      });

      const response = await Promise.race([llmPromise, timeoutPromise]) as any;

      if (response?.response) {
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ LLM extraction successful:', parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('LLM case extraction failed:', error.message);
    }

    // Always fallback to basic patterns
    return this.extractWithBasicPatterns(conversationText);
  }

  /**
   * Basic pattern extraction as fallback
   */
  private static extractWithBasicPatterns(conversationText: string): Partial<CaseInformation> {
    const text = conversationText.toLowerCase();
    
    // Extract legal issue type
    let legalIssueType: string | undefined;
    if (text.includes('employment') || text.includes('work') || text.includes('job')) {
      legalIssueType = 'Employment Law';
    } else if (text.includes('divorce') || text.includes('family') || text.includes('custody')) {
      legalIssueType = 'Family Law';
    } else if (text.includes('injury') || text.includes('accident') || text.includes('medical')) {
      legalIssueType = 'Personal Injury';
    } else if (text.includes('business') || text.includes('contract') || text.includes('partnership')) {
      legalIssueType = 'Business Law';
    } else if (text.includes('landlord') || text.includes('tenant') || text.includes('rent')) {
      legalIssueType = 'Landlord-Tenant';
    }

    // Extract key facts from user messages only
    const facts: string[] = [];
    const userMessages = conversationText.split(/(?=user:)/i).filter(msg => msg.toLowerCase().includes('user:'));
    
    userMessages.forEach(message => {
      // Remove "user:" prefix and clean up
      const cleanMessage = message.replace(/^user:\s*/i, '').trim();
      
      // Look for factual statements (avoid questions and responses to questions)
      if (cleanMessage.length > 20 && !cleanMessage.includes('?') && !cleanMessage.includes('tell me')) {
        // Split into sentences and extract factual ones
        const sentences = cleanMessage.split(/[.!?]+/).filter(s => s.trim().length > 10);
        sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          // Avoid question-like sentences and responses to questions
          if (!trimmed.includes('what') && !trimmed.includes('when') && !trimmed.includes('how') && 
              !trimmed.includes('tell me') && !trimmed.includes('please') && trimmed.length > 15) {
            facts.push(trimmed);
          }
        });
      }
    });

    // Also extract facts from the conversation text directly
    const directFacts = conversationText.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 20 && 
             !trimmed.includes('?') && 
             !trimmed.includes('tell me') &&
             !trimmed.includes('what') &&
             !trimmed.includes('when') &&
             !trimmed.includes('how') &&
             (trimmed.includes('manager') || trimmed.includes('discrimination') || trimmed.includes('promotion') || trimmed.includes('email'));
    });
    
    facts.push(...directFacts.slice(0, 3));

    // Extract legal issues
    const legalIssues: string[] = [];
    const legalKeywords = ['violated', 'discrimination', 'harassment', 'wrongful', 'breach', 'negligence', 'damages'];
    legalKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        legalIssues.push(`Potential ${keyword} issue`);
      }
    });

    // Extract timeline information
    const timeline: string[] = [];
    const timelineKeywords = ['started', 'began', 'happened', 'occurred', 'months ago', 'weeks ago', 'days ago'];
    timelineKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        const sentences = conversationText.split(/[.!?]+/).filter(s => s.includes(keyword));
        timeline.push(...sentences.slice(0, 2));
      }
    });

    // Extract communications
    const communications: string[] = [];
    const commKeywords = ['email', 'text', 'message', 'call', 'voicemail', 'letter'];
    commKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        communications.push(`Mentioned ${keyword}s`);
      }
    });

    // Extract damages
    const damages: string[] = [];
    const damageKeywords = ['harm', 'damage', 'loss', 'distress', 'suffering', 'financial', 'emotional'];
    damageKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        damages.push(`Mentioned ${keyword}`);
      }
    });

    return {
      legalIssueType,
      keyFacts: facts.slice(0, 5),
      legalIssues,
      timeline: timeline.slice(0, 3),
      communications: communications.slice(0, 3),
      damages: damages.slice(0, 3)
    };
  }

  /**
   * Merge regex and LLM results with conflict detection
   */
  private static mergeExtractions(regexData: Partial<CaseInformation>, llmData: Partial<CaseInformation>): Partial<CaseInformation> {
    const result = {
      // LLM has authority for these fields (facts, legal issues, timeline are messy)
      legalIssueType: llmData.legalIssueType || undefined,
      keyFacts: llmData.keyFacts || [],
      timeline: llmData.timeline || [],
      legalIssues: llmData.legalIssues || [],
      communications: llmData.communications || [],
      damages: llmData.damages || [],
      
      // Merge evidence and witnesses (both regex and LLM can contribute)
      evidence: [...(regexData.evidence || []), ...(llmData.evidence || [])].filter((item, index, arr) => arr.indexOf(item) === index),
      witnesses: [...(regexData.witnesses || []), ...(llmData.witnesses || [])].filter((item, index, arr) => arr.indexOf(item) === index)
    };

    // Detect conflicts for logging
    const conflicts = {
      evidence: regexData.evidence && llmData.evidence && 
                regexData.evidence.some(r => !llmData.evidence?.includes(r)),
      witnesses: regexData.witnesses && llmData.witnesses && 
                 regexData.witnesses.some(r => !llmData.witnesses?.includes(r))
    };

    if (conflicts.evidence || conflicts.witnesses) {
      console.warn('🔍 Paralegal extraction conflicts detected:', {
        conflicts,
        regex: regexData,
        llm: llmData
      });
    }

    return result;
  }

  /**
   * Generates a comprehensive case summary from collected information
   */
  static generateCaseSummary(information: CaseInformation): string {
    const { legalIssueType, keyFacts, timeline, evidence, witnesses, communications, legalIssues, damages } = information;

    let summary = `# Legal Case Summary\n\n`;
    summary += `**Prepared by:** Paralegal Case Preparation Assistant\n`;
    summary += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    
    if (legalIssueType) {
      summary += `## Legal Issue Type\n${legalIssueType}\n\n`;
    }

    if (keyFacts.length > 0) {
      summary += `## Key Facts\n`;
      keyFacts.forEach((fact, index) => {
        summary += `${index + 1}. ${fact}\n`;
      });
      summary += `\n`;
    }

    if (timeline.length > 0) {
      summary += `## Timeline of Events\n`;
      timeline.forEach((event, index) => {
        summary += `${index + 1}. ${event}\n`;
      });
      summary += `\n`;
    }

    if (evidence.length > 0) {
      summary += `## Available Evidence\n`;
      evidence.forEach((item, index) => {
        summary += `${index + 1}. ${item}\n`;
      });
      summary += `\n`;
    }

    if (witnesses.length > 0) {
      summary += `## Potential Witnesses\n`;
      witnesses.forEach((witness, index) => {
        summary += `${index + 1}. ${witness}\n`;
      });
      summary += `\n`;
    }

    if (communications.length > 0) {
      summary += `## Communications\n`;
      communications.forEach((comm, index) => {
        summary += `${index + 1}. ${comm}\n`;
      });
      summary += `\n`;
    }

    if (legalIssues.length > 0) {
      summary += `## Identified Legal Issues\n`;
      legalIssues.forEach((issue, index) => {
        summary += `${index + 1}. ${issue}\n`;
      });
      summary += `\n`;
    }

    if (damages.length > 0) {
      summary += `## Damages and Harm\n`;
      damages.forEach((damage, index) => {
        summary += `${index + 1}. ${damage}\n`;
      });
      summary += `\n`;
    }

    summary += `## Case Strengths\n`;
    if (evidence.length > 0) {
      summary += `- Strong documentary evidence available\n`;
    }
    if (witnesses.length > 0) {
      summary += `- Witness testimony available\n`;
    }
    if (legalIssues.length > 0) {
      summary += `- Clear legal issues identified\n`;
    }
    if (timeline.length > 0) {
      summary += `- Well-documented timeline of events\n`;
    }
    summary += `\n`;

    summary += `## Recommended Next Steps\n`;
    summary += `1. **Review this summary** for accuracy and completeness\n`;
    summary += `2. **Gather all evidence** mentioned above (documents, photos, records)\n`;
    summary += `3. **Contact witnesses** to confirm their availability to testify\n`;
    summary += `4. **Schedule consultation** with an attorney specializing in ${legalIssueType || 'your legal issue'}\n`;
    summary += `5. **Bring this summary and all evidence** to your consultation\n`;
    summary += `6. **Prepare questions** for your attorney about legal strategy and potential outcomes\n\n`;

    summary += `## How This Helps You\n`;
    summary += `This comprehensive case summary will:\n`;
    summary += `- **Save you time** during your attorney consultation\n`;
    summary += `- **Save you money** by reducing the time your attorney needs to understand your case\n`;
    summary += `- **Improve the quality** of legal advice you receive\n`;
    summary += `- **Help your attorney** develop a stronger legal strategy\n`;
    summary += `- **Ensure nothing important** is overlooked\n\n`;

    summary += `**Note:** This summary is prepared by an AI assistant and should be reviewed for accuracy. It is not a substitute for professional legal advice.`;

    return summary;
  }
}
