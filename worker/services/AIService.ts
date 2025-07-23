export interface TeamConfig {
  requiresPayment?: boolean;
  consultationFee?: number;
  ownerEmail?: string;
  serviceQuestions?: Record<string, string[]>;
  availableServices?: string[];
  webhooks?: {
    enabled?: boolean;
    url?: string;
    secret?: string;
    events?: {
      matterCreation?: boolean;
      matterDetails?: boolean;
      contactForm?: boolean;
      appointment?: boolean;
    };
    retryConfig?: {
      maxRetries?: number;
      retryDelay?: number; // in seconds
    };
  };
  promptOnly?: {
    enabled?: boolean;
    requiredFields?: string[];
    empathyPrompts?: Record<string, string>;
  };
}

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
}

// Optimized AI Service with caching and timeouts
export class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ai: any, private env: Env) {}
  
  async runLLM(messages: any[], model: string = '@cf/meta/llama-3.1-8b-instruct') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const result = await this.ai.run(model, {
        messages,
        max_tokens: 500,
        temperature: 0.1, // Reduced from 0.4 to 0.1 for more factual responses
      });
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
  
  async getTeamConfig(teamId: string): Promise<TeamConfig> {
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.config;
    }

    try {
      // Try to find team by ID (ULID) first, then by slug
      let teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(teamId).first();
      if (!teamRow) {
        teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE slug = ?').bind(teamId).first();
      }
      
      if (teamRow) {
        const config = JSON.parse(teamRow.config as string);
        this.teamConfigCache.set(teamId, { config, timestamp: Date.now() });
        return config;
      }
    } catch (error) {
      console.warn('Failed to fetch team config:', error);
    }
    
    return {};
  }

  // Clear cache for a specific team or all teams
  clearCache(teamId?: string): void {
    if (teamId) {
      this.teamConfigCache.delete(teamId);
    } else {
      this.teamConfigCache.clear();
    }
  }

  // NEW: Enhanced prompt system for required field collection
  async generateIntakePrompt(teamConfig: TeamConfig, service: string, step: 'initial' | 'required_fields' | 'matter_details'): Promise<string> {
    const empathyPrompt = teamConfig.promptOnly?.empathyPrompts?.[service] || 
      `I'm here to help you with your ${service} matter. Let me gather some information to better assist you.`;
    
    const requiredFields = teamConfig.promptOnly?.requiredFields || ['full_name', 'email', 'phone'];
    
    switch (step) {
      case 'initial':
        return `${empathyPrompt}\n\nTo get started, I need to collect some basic information. What's your full legal name?`;
      
      case 'required_fields':
        return `Perfect! Now I need your contact information so we can keep you updated on your ${service} matter. What's your email address?`;
      
      case 'matter_details':
        return `Great! Now let's talk about your ${service} situation. Can you tell me what specific issue you're dealing with?`;
      
      default:
        return empathyPrompt;
    }
  }

  // NEW: Validate collected data against required fields
  validateCollectedData(answers: Record<string, any>, requiredFields: string[]): {
    isValid: boolean;
    missingFields: string[];
    extractedData: Record<string, string>;
  } {
    const extractedData: Record<string, string> = {};
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      const fieldValue = this.extractFieldValue(answers, field);
      if (fieldValue) {
        extractedData[field] = fieldValue;
      } else {
        missingFields.push(field);
      }
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields,
      extractedData
    };
  }
  
  private extractFieldValue(answers: Record<string, any>, field: string): string | null {
    for (const [key, value] of Object.entries(answers)) {
      if (key.toLowerCase().includes(field.replace('_', ''))) {
        return typeof value === 'string' ? value : (value as any)?.answer || null;
      }
    }
    return null;
  }
} 