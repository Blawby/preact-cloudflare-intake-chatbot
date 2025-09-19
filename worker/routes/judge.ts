import type { Env } from '../types';
import { createSuccessResponse, CORS_HEADERS } from '../errorHandler';

// Tool call interface for type safety
export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

// TypeScript interfaces for the validated request shape
interface JudgeTestCase {
  testCaseId: string;
  scenario: string;
  expectedBehavior?: string[];
  criticalRequirements?: string[];
  minScore?: number;
}

interface JudgeRequest {
  testCase: JudgeTestCase;
  userMessage: string;
  agentResponse: string;
  toolCalls?: ToolCall[];
  prompt?: string;
}

// Validation function to check if a value is a valid ToolCall
function isValidToolCall(value: any): value is ToolCall {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.name === 'string' &&
    typeof value.parameters === 'object' &&
    value.parameters !== null &&
    (value.error === undefined || typeof value.error === 'string') &&
    (value.timestamp === undefined || typeof value.timestamp === 'number') &&
    (value.metadata === undefined || (typeof value.metadata === 'object' && value.metadata !== null))
  );
}

// Validation function to check if a value is a valid JudgeTestCase
function isValidTestCase(value: any): value is JudgeTestCase {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.testCaseId === 'string' &&
    typeof value.scenario === 'string' &&
    (value.expectedBehavior === undefined || (Array.isArray(value.expectedBehavior) && value.expectedBehavior.every(el => typeof el === 'string'))) &&
    (value.criticalRequirements === undefined || (Array.isArray(value.criticalRequirements) && value.criticalRequirements.every(el => typeof el === 'string'))) &&
    (value.minScore === undefined || typeof value.minScore === 'number')
  );
}

// Validation function to check if a value is a valid JudgeRequest
function isValidJudgeRequest(value: any): value is JudgeRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    isValidTestCase(value.testCase) &&
    typeof value.userMessage === 'string' &&
    typeof value.agentResponse === 'string' &&
    (value.toolCalls === undefined || (Array.isArray(value.toolCalls) && value.toolCalls.every(tc => isValidToolCall(tc)))) &&
    (value.prompt === undefined || typeof value.prompt === 'string')
  );
}

export async function handleJudge(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Only POST method is allowed',
      errorCode: 'METHOD_NOT_ALLOWED'
          }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
  }

  try {
    // Parse JSON with error handling
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        errorCode: 'INVALID_JSON',
        details: parseError instanceof Error ? parseError.message : 'JSON parse error'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // Validate the request structure and types
    if (!isValidJudgeRequest(body)) {
      const missingFields: string[] = [];
      const typeErrors: string[] = [];

      // Check required fields
      if (body.testCase == null) missingFields.push('testCase');
      if (body.userMessage == null) missingFields.push('userMessage');
      if (body.agentResponse == null) missingFields.push('agentResponse');

      // Check field types
      if (body.testCase && !isValidTestCase(body.testCase)) {
        typeErrors.push('testCase must be an object with testCaseId (string) and scenario (string)');
      }
      if (body.userMessage && typeof body.userMessage !== 'string') {
        typeErrors.push('userMessage must be a string');
      }
      if (body.agentResponse && typeof body.agentResponse !== 'string') {
        typeErrors.push('agentResponse must be a string');
      }
      if (body.toolCalls && !Array.isArray(body.toolCalls)) {
        typeErrors.push('toolCalls must be an array');
      } else if (body.toolCalls && Array.isArray(body.toolCalls)) {
        const invalidIndices: number[] = [];
        body.toolCalls.forEach((tc: any, index: number) => {
          if (!isValidToolCall(tc)) {
            invalidIndices.push(index);
          }
        });
        if (invalidIndices.length > 0) {
          typeErrors.push(`toolCalls array contains invalid tool call objects at indices: ${invalidIndices.join(', ')}`);
        }
      }
      if (body.prompt && typeof body.prompt !== 'string') {
        typeErrors.push('prompt must be a string');
      }

      const errorMessage = missingFields.length > 0 
        ? `Missing required fields: ${missingFields.join(', ')}`
        : `Invalid field types: ${typeErrors.join('; ')}`;

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: 'VALIDATION_ERROR',
        details: {
          missingFields: missingFields.length > 0 ? missingFields : undefined,
          typeErrors: typeErrors.length > 0 ? typeErrors : undefined
        }
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // At this point, body is validated and typed as JudgeRequest
    const { testCase, userMessage, agentResponse, toolCalls, prompt }: JudgeRequest = body;

    console.log('🧑‍⚖️ Judge evaluation request:', {
      testCaseId: testCase.testCaseId,
      responseLength: agentResponse.length,
      toolCallsCount: toolCalls?.length || 0
    });

    // Use the actual Cloudflare AI API to evaluate the response
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);

    // Create the evaluation prompt
    const minScore = Number.isFinite(Number(testCase.minScore)) ? Number(testCase.minScore) : 7;
    const evaluationPrompt = prompt || `You are an expert legal AI evaluator. Your job is to evaluate an AI legal assistant's response to a client inquiry.

EVALUATION SCENARIO:
Test Case: ${testCase.testCaseId}
Scenario: ${testCase.scenario}
Expected Behavior: ${testCase.expectedBehavior?.join(', ') || 'Standard behavior expected'}
Critical Requirements: ${testCase.criticalRequirements?.join(', ') || 'Standard requirements'}
Minimum Score Required: ${minScore}/10

CONVERSATION:
User: "${userMessage}"
Assistant: "${agentResponse}"
Tool Calls: ${JSON.stringify(toolCalls || [])}

CRITICAL EVALUATION RULES:
1. HALLUCINATION DETECTION: The AI must NOT make up information not provided by the user
2. ACCURACY CHECK: All legal classifications must be based on actual user statements
3. NO ASSUMPTIONS: The AI should not assume legal issues unless explicitly stated by the user
4. FACTUAL BASIS: Every claim in the response must have a factual basis in the conversation
5. CONTEXT AWARENESS: The AI should reference and build upon previous conversation elements
6. CONVERSATION EFFICIENCY: Avoid repetitive responses and circular conversations
7. CRITICAL ISSUES: Only list actual problems or violations. If no critical issues are found, return an empty array for criticalIssues.

COMPREHENSIVE EVALUATION CRITERIA (Rate each 1-10):

CORE COMPETENCIES:
1. Empathy: Shows understanding and compassion for client situation
2. Accuracy: Provides correct legal information and guidance (CRITICAL: No hallucinations)
3. Completeness: Addresses all aspects of the query comprehensively
4. Relevance: Response is appropriate to the specific scenario
5. Professionalism: Maintains professional tone and conduct

CONVERSATION QUALITY:
6. Actionability: Provides clear next steps and guidance
7. Legal Accuracy: Demonstrates correct legal knowledge (CRITICAL: Based on facts only)
8. Conversation Flow: Natural and helpful conversation progression
9. Tool Usage: Appropriate use of available tools and escalation
10. Context Awareness: References and builds upon previous conversation elements

USER EXPERIENCE:
11. Clarity: Response is clear, understandable, and well-structured
12. Efficiency: Conversation progresses efficiently without unnecessary repetition
13. Helpfulness: Provides genuinely useful information and guidance
14. Responsiveness: Addresses the user's specific concerns and questions

TECHNICAL PERFORMANCE:
15. Matter Classification: Correctly identifies and classifies legal matter type
16. Information Collection: Efficiently gathers required information
17. Error Handling: Gracefully handles validation errors and edge cases

HALLUCINATION PENALTIES (CRITICAL):
- If AI mentions costs/pricing when user didn't ask: -4 points on Accuracy and Legal Accuracy + CRITICAL ISSUE
- If AI assumes legal issue type without user confirmation: -5 points on Accuracy and Legal Accuracy + CRITICAL ISSUE
- If AI adds details not provided by user: -3 points on Accuracy + CRITICAL ISSUE
- If AI makes up opposing party information: -4 points on Legal Accuracy + CRITICAL ISSUE
- If AI creates placeholder/fake contact information: -5 points on Accuracy + CRITICAL ISSUE

CONVERSATION FLOW PENALTIES:
- If AI repeats the same response multiple times: -3 points on Conversation Flow and Efficiency
- If AI doesn't progress the conversation: -2 points on Conversation Flow
- If AI ignores previously provided information: -2 points on Context Awareness

RESPONSE FORMAT (JSON):
{
  "empathy": <score 1-10>,
  "accuracy": <score 1-10>,
  "completeness": <score 1-10>,
  "relevance": <score 1-10>,
  "professionalism": <score 1-10>,
  "actionability": <score 1-10>,
  "legalAccuracy": <score 1-10>,
  "conversationFlow": <score 1-10>,
  "toolUsage": <score 1-10>,
  "contextAwareness": <score 1-10>,
  "clarity": <score 1-10>,
  "efficiency": <score 1-10>,
  "helpfulness": <score 1-10>,
  "responsiveness": <score 1-10>,
  "matterClassification": <score 1-10>,
  "informationCollection": <score 1-10>,
  "errorHandling": <score 1-10>,
  "feedback": "<brief feedback on performance>",
  "criticalIssues": ["<list any critical issues including hallucinations. If no critical issues found, return empty array []>"],
  "suggestions": ["<list improvement suggestions>"],
  "hallucinationDetected": <boolean>,
  "repetitiveResponses": <boolean>,
  "contextIgnored": <boolean>
}

Provide only the JSON response, no additional text.`;

    // Call the Cloudflare AI API
    const aiResponse = await aiService.runLLM([
      {
        role: 'system',
        content: 'You are an expert legal AI evaluator. Your job is to evaluate AI legal assistant responses.'
      },
      {
        role: 'user',
        content: evaluationPrompt
      }
    ], '@cf/meta/llama-3.1-8b-instruct');

    // Parse the AI response
    let evaluation;
    try {
      evaluation = JSON.parse(aiResponse.response);
    } catch (parseError) {
      console.error('Failed to parse AI judge response:', parseError);
      console.log('Raw AI response:', aiResponse.response);
      
      // NO FALLBACKS - If the judge can't parse the response, the test fails
      throw new Error(`Judge evaluation failed - could not parse AI response: ${parseError.message}`);
    }

    // Calculate scores with comprehensive criteria
    const toScore = (v: unknown, fallback = 7) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : fallback;
    };
    const scores = {
      // Core competencies
      empathy: toScore(evaluation.empathy),
      accuracy: toScore(evaluation.accuracy),
      completeness: toScore(evaluation.completeness),
      relevance: toScore(evaluation.relevance),
      professionalism: toScore(evaluation.professionalism),
      
      // Conversation quality
      actionability: toScore(evaluation.actionability),
      legalAccuracy: toScore(evaluation.legalAccuracy),
      conversationFlow: toScore(evaluation.conversationFlow),
      toolUsage: toScore(evaluation.toolUsage),
      contextAwareness: toScore(evaluation.contextAwareness),
      
      // User experience
      clarity: toScore(evaluation.clarity),
      efficiency: toScore(evaluation.efficiency),
      helpfulness: toScore(evaluation.helpfulness),
      responsiveness: toScore(evaluation.responsiveness),
      
      // Technical performance
      matterClassification: toScore(evaluation.matterClassification),
      informationCollection: toScore(evaluation.informationCollection),
      errorHandling: toScore(evaluation.errorHandling)
    };

    // Calculate weighted average score (emphasizing critical criteria)
    const criticalScores = [scores.accuracy, scores.legalAccuracy, scores.conversationFlow];
    const coreScores = [scores.empathy, scores.completeness, scores.relevance, scores.professionalism];
    const qualityScores = [scores.actionability, scores.toolUsage, scores.contextAwareness];
    const experienceScores = [scores.clarity, scores.efficiency, scores.helpfulness, scores.responsiveness];
    const technicalScores = [scores.matterClassification, scores.informationCollection, scores.errorHandling];

    const criticalWeight = 0.3;
    const coreWeight = 0.2;
    const qualityWeight = 0.2;
    const experienceWeight = 0.15;
    const technicalWeight = 0.15;

    const averageScore = (
      (criticalScores.reduce((sum, score) => sum + score, 0) / criticalScores.length) * criticalWeight +
      (coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length) * coreWeight +
      (qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * qualityWeight +
      (experienceScores.reduce((sum, score) => sum + score, 0) / experienceScores.length) * experienceWeight +
      (technicalScores.reduce((sum, score) => sum + score, 0) / technicalScores.length) * technicalWeight
    );

    // Test fails if there are critical issues OR score is too low
    const hasCriticalIssues = (evaluation.criticalIssues || []).length > 0;
    const passed = !hasCriticalIssues && averageScore >= minScore;

    const result = {
      success: true,
      scores,
      averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      passed,
      feedback: evaluation.feedback || 'Evaluation completed.',
      criticalIssues: evaluation.criticalIssues || [],
      suggestions: evaluation.suggestions || [],
      flags: {
        hallucinationDetected: evaluation.hallucinationDetected || false,
        repetitiveResponses: evaluation.repetitiveResponses || false,
        contextIgnored: evaluation.contextIgnored || false
      },
      metadata: {
        tokenUsage: aiResponse.usage?.total_tokens || 0,
        model: '@cf/meta/llama-3.1-8b-instruct',
        testCaseId: testCase.testCaseId,
        evaluationVersion: '2.0'
      }
    };

    console.log('✅ Judge evaluation completed:', {
      testCaseId: testCase.testCaseId,
      averageScore,
      passed,
      tokenUsage: result.metadata.tokenUsage
    });

    return createSuccessResponse(result);

  } catch (error) {
    console.error('Judge evaluation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Judge evaluation failed',
      errorCode: 'JUDGE_EVALUATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
          }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
  }
}
