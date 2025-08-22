import type { Env } from '../types';
import { createSuccessResponse } from '../errorHandler';

export async function handleJudge(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Only POST method is allowed',
      errorCode: 'METHOD_NOT_ALLOWED'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { testCase, userMessage, agentResponse, toolCalls, prompt } = body;

    if (!testCase || !agentResponse) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: testCase, agentResponse',
        errorCode: 'MISSING_FIELDS'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🧑‍⚖️ Judge evaluation request:', {
      testCaseId: testCase.testCaseId,
      responseLength: agentResponse.length,
      toolCallsCount: toolCalls?.length || 0
    });

    // Use the actual Cloudflare AI API to evaluate the response
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);

    // Create the evaluation prompt
    const evaluationPrompt = prompt || `You are an expert legal AI evaluator. Your job is to evaluate an AI legal assistant's response to a client inquiry.

EVALUATION SCENARIO:
Test Case: ${testCase.testCaseId}
Scenario: ${testCase.scenario}
Expected Behavior: ${testCase.expectedBehavior.join(', ')}
Critical Requirements: ${testCase.criticalRequirements.join(', ')}
Minimum Score Required: ${testCase.minScore}/10

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
16. Urgency Assessment: Appropriately evaluates and handles urgent situations
17. Information Collection: Efficiently gathers required information
18. Error Handling: Gracefully handles validation errors and edge cases

HALLUCINATION PENALTIES (CRITICAL):
- If AI mentions costs/pricing when user didn't ask: -4 points on Accuracy and Legal Accuracy
- If AI assumes legal issue type without user confirmation: -5 points on Accuracy and Legal Accuracy
- If AI adds details not provided by user: -3 points on Accuracy
- If AI makes up opposing party information: -4 points on Legal Accuracy
- If AI assumes matter urgency without basis: -3 points on Urgency Assessment

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
  "urgencyAssessment": <score 1-10>,
  "informationCollection": <score 1-10>,
  "errorHandling": <score 1-10>,
  "feedback": "<brief feedback on performance>",
  "criticalIssues": ["<list any critical issues including hallucinations>"],
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
    const scores = {
      // Core competencies
      empathy: evaluation.empathy || 7,
      accuracy: evaluation.accuracy || 7,
      completeness: evaluation.completeness || 7,
      relevance: evaluation.relevance || 7,
      professionalism: evaluation.professionalism || 7,
      
      // Conversation quality
      actionability: evaluation.actionability || 7,
      legalAccuracy: evaluation.legalAccuracy || 7,
      conversationFlow: evaluation.conversationFlow || 7,
      toolUsage: evaluation.toolUsage || 7,
      contextAwareness: evaluation.contextAwareness || 7,
      
      // User experience
      clarity: evaluation.clarity || 7,
      efficiency: evaluation.efficiency || 7,
      helpfulness: evaluation.helpfulness || 7,
      responsiveness: evaluation.responsiveness || 7,
      
      // Technical performance
      matterClassification: evaluation.matterClassification || 7,
      urgencyAssessment: evaluation.urgencyAssessment || 7,
      informationCollection: evaluation.informationCollection || 7,
      errorHandling: evaluation.errorHandling || 7
    };

    // Calculate weighted average score (emphasizing critical criteria)
    const criticalScores = [scores.accuracy, scores.legalAccuracy, scores.conversationFlow];
    const coreScores = [scores.empathy, scores.completeness, scores.relevance, scores.professionalism];
    const qualityScores = [scores.actionability, scores.toolUsage, scores.contextAwareness];
    const experienceScores = [scores.clarity, scores.efficiency, scores.helpfulness, scores.responsiveness];
    const technicalScores = [scores.matterClassification, scores.urgencyAssessment, scores.informationCollection, scores.errorHandling];

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

    const passed = averageScore >= testCase.minScore;

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

    return createSuccessResponse(result, corsHeaders);

  } catch (error) {
    console.error('Judge evaluation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Judge evaluation failed',
      errorCode: 'JUDGE_EVALUATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
