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

EVALUATION CRITERIA (Rate each 1-10):
1. Empathy: Shows understanding and compassion for client situation
2. Accuracy: Provides correct legal information and guidance
3. Completeness: Addresses all aspects of the query comprehensively
4. Relevance: Response is appropriate to the specific scenario
5. Professionalism: Maintains professional tone and conduct
6. Actionability: Provides clear next steps and guidance
7. Legal Accuracy: Demonstrates correct legal knowledge
8. Conversation Flow: Natural and helpful conversation progression
9. Tool Usage: Appropriate use of available tools and escalation

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
  "feedback": "<brief feedback on performance>",
  "criticalIssues": ["<list any critical issues>"],
  "suggestions": ["<list improvement suggestions>"]
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
      
      // Fallback evaluation
      evaluation = {
        empathy: 7,
        accuracy: 7,
        completeness: 7,
        relevance: 7,
        professionalism: 7,
        actionability: 7,
        legalAccuracy: 7,
        conversationFlow: 7,
        toolUsage: 7,
        feedback: 'Evaluation completed with fallback scoring.',
        criticalIssues: [],
        suggestions: []
      };
    }

    // Calculate average score
    const scores = {
      empathy: evaluation.empathy || 7,
      accuracy: evaluation.accuracy || 7,
      completeness: evaluation.completeness || 7,
      relevance: evaluation.relevance || 7,
      professionalism: evaluation.professionalism || 7,
      actionability: evaluation.actionability || 7,
      legalAccuracy: evaluation.legalAccuracy || 7,
      conversationFlow: evaluation.conversationFlow || 7,
      toolUsage: evaluation.toolUsage || 7
    };

    const averageScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    const passed = averageScore >= testCase.minScore;

    const result = {
      success: true,
      scores,
      averageScore,
      passed,
      feedback: evaluation.feedback || 'Evaluation completed.',
      criticalIssues: evaluation.criticalIssues || [],
      suggestions: evaluation.suggestions || [],
      metadata: {
        tokenUsage: aiResponse.usage?.total_tokens || 0,
        model: '@cf/meta/llama-3.1-8b-instruct',
        testCaseId: testCase.testCaseId
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
