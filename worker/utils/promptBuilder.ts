// Hybrid PromptBuilder - uses regex + LLM extraction with conflict detection
// No more manual pattern building for every case!

export interface CloudflareLocationInfo {
  isValid: boolean;
  // Add other properties as needed
}

export class PromptBuilder {
  /**
   * Extracts information from conversation history using hybrid regex + LLM approach
   * This prevents silent failures and provides comprehensive coverage
   */
  static async extractConversationInfo(conversationText: string, env?: any): Promise<{
    hasName: boolean;
    hasLegalIssue: boolean;
    hasContactInfo: boolean;
    hasLocation: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasOpposingParty: boolean;
    legalIssueType?: string;
    name?: string;
    description?: string;
    email?: string;
    phone?: string;
    location?: string;
    opposingParty?: string;
  }> {
    // Step 1: Run regex extraction (deterministic, cheap)
    const regexData = this.extractWithRegex(conversationText);
    
    // Step 2: Run LLM extraction (comprehensive, handles messy cases)
    const llmData = await this.extractWithLLM(conversationText, env);
    
    // Step 3: Merge with conflict detection
    return this.mergeExtractions(regexData, llmData);
  }

  /**
   * Regex extraction for structured patterns (emails, phones, etc.)
   * These are authoritative - regex is deterministic and cheap
   */
  private static extractWithRegex(conversationText: string) {
    // Extract structured data with regex (authoritative for these)
    const emailMatch = conversationText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = conversationText.match(/(\d{3}[-.]?\d{3}[-.]?\d{4}|\(\d{3}\)\s?\d{3}[-.]?\d{4})/);
    
    return {
      email: emailMatch?.[1],
      phone: phoneMatch?.[1],
    };
  }

  /**
   * LLM extraction for all fields (comprehensive coverage)
   * Handles messy cases that regex can't handle
   */
  private static async extractWithLLM(conversationText: string, env?: any) {
    if (!env?.AI) {
      // Fallback to basic extraction if no AI available
      return this.extractWithBasicPatterns(conversationText);
    }

    try {
      const prompt = `Extract the following information from this legal intake conversation. Return ONLY a JSON object with these exact fields:

{
  "name": "Full name if mentioned",
  "legalIssueType": "Family Law|Personal Injury|Employment Law|Landlord/Tenant|Business Law|Criminal Law|General Consultation",
  "description": "Brief description of the legal issue",
  "email": "Email address if mentioned",
  "phone": "Phone number if mentioned", 
  "location": "City, State or location if mentioned",
  "opposingParty": "Opposing party name if mentioned"
}

Conversation:
${conversationText}

JSON:`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1
      });

      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('LLM extraction failed, falling back to basic patterns:', error);
    }

    return this.extractWithBasicPatterns(conversationText);
  }

  /**
   * Basic pattern extraction as fallback
   * Used when LLM is not available or fails
   */
  private static extractWithBasicPatterns(conversationText: string) {
    const text = conversationText.toLowerCase();
    
    // Basic name extraction
    let name: string | undefined;
    const nameMatches = [...text.matchAll(/my name is ([^,.]+)|i am ([^,.]+)|name is ([^,.]+)|i'm ([^,.]+)/g)];
    if (nameMatches.length > 0) {
      const lastMatch = nameMatches[nameMatches.length - 1];
      name = (lastMatch[1] || lastMatch[2] || lastMatch[3] || lastMatch[4]).trim();
    }
    
    // Basic legal issue detection
    let legalIssueType: string | undefined;
    if (text.includes('divorce') || text.includes('family law')) legalIssueType = 'Family Law';
    else if (text.includes('car accident') || text.includes('personal injury') || text.includes('ran over') || text.includes('hit someone') || text.includes('pedestrian')) legalIssueType = 'Personal Injury';
    else if (text.includes('employment') || text.includes('job') || text.includes('terminated') || text.includes('fired')) legalIssueType = 'Employment Law';
    else if (text.includes('landlord') || text.includes('tenant')) legalIssueType = 'Landlord/Tenant';
    else if (text.includes('business')) legalIssueType = 'Business Law';
    else if (text.includes('criminal') || text.includes('arrest') || text.includes('charges') || text.includes('violation')) legalIssueType = 'Criminal Law';
    
    // Basic location extraction
    let location: string | undefined;
    const locationMatches = [...text.matchAll(/live in ([^,.]+(?:,\s*[^,.]+)*)|located in ([^,.]+(?:,\s*[^,.]+)*)|from ([^,.]+(?:,\s*[^,.]+)*)/g)];
    if (locationMatches.length > 0) {
      const lastMatch = locationMatches[locationMatches.length - 1];
      location = (lastMatch[1] || lastMatch[2] || lastMatch[3]).trim();
    }
    
    return {
      name,
      legalIssueType,
      description: legalIssueType ? `Client seeking ${legalIssueType.toLowerCase()} assistance` : undefined,
      email: undefined,
      phone: undefined,
      location,
      opposingParty: undefined
    };
  }

  /**
   * Merge regex and LLM results with conflict detection
   * This is the key - no silent failures, conflicts are logged
   */
  private static mergeExtractions(regexData: any, llmData: any) {
    const result = {
      // LLM has authority for these fields (names, locations, legal issues are messy)
      name: llmData.name || undefined,
      legalIssueType: llmData.legalIssueType || undefined,
      description: llmData.description || undefined,
      location: llmData.location || undefined,
      opposingParty: llmData.opposingParty || undefined,
      
      // Regex has authority for structured data, but LLM can fill gaps
      email: regexData.email || llmData.email || undefined,
      phone: regexData.phone || llmData.phone || undefined,
    };

    // Detect conflicts for logging - this prevents silent failures
    const conflicts = {
      email: regexData.email && llmData.email && regexData.email !== llmData.email,
      phone: regexData.phone && llmData.phone && regexData.phone !== llmData.phone
    };

    if (conflicts.email || conflicts.phone) {
      console.warn('🔍 Extraction conflicts detected:', {
        conflicts,
        regex: regexData,
        llm: llmData
      });
    }

    return {
      hasName: !!result.name,
      hasLegalIssue: !!result.legalIssueType,
      hasContactInfo: !!result.email || !!result.phone,
      hasLocation: !!result.location,
      hasEmail: !!result.email,
      hasPhone: !!result.phone,
      hasOpposingParty: !!result.opposingParty,
      ...result
    };
  }
}