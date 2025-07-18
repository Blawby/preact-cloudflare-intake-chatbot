import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody, createMatterRecord, storeMatterQuestion, storeAISummary } from '../utils';

interface MatterCreationRequest {
  teamId: string;
  service?: string;
  step: 'service-selection' | 'questions' | 'matter-review' | 'matter-details' | 'complete';
  currentQuestionIndex?: number;
  answers?: Record<string, string | { question: string; answer: string }>;
  description?: string;
  urgency?: string;
  sessionId?: string;
}

export async function handleMatterCreation(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as MatterCreationRequest;
    
    if (!body.teamId || !body.step) {
      return new Response(JSON.stringify({ error: 'Missing teamId or step' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team config using cached service
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(body.teamId);
    
    if (!teamConfig || Object.keys(teamConfig).length === 0) {
      return new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { assessMatterQuality } = await import('../utils/qualityAssessment.js');
    const quality = assessMatterQuality(body);

    switch (body.step) {
      case 'service-selection':
        // If no service selected yet, show service options
        if (!body.service) {
          const services = teamConfig.availableServices || [
            'Family Law', 
            'Small Business and Nonprofits', 
            'Employment Law', 
            'Tenant Rights Law', 
            'Probate and Estate Planning', 
            'Special Education and IEP Advocacy'
          ];
          
          const response = {
            step: 'service-selection',
            message: 'What type of legal matter do you need help with?',
            services,
            qualityScore: quality
          };

          // Save matter creation state to session
          if (body.sessionId) {
            try {
              const sessionData = {
                teamId: body.teamId,
                matterCreationState: {
                  step: 'service-selection',
                  data: body,
                  timestamp: new Date().toISOString()
                },
                lastActivity: new Date().toISOString()
              };

              await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(sessionData), {
                expirationTtl: 24 * 60 * 60 // 24 hours
              });
            } catch (error) {
              console.warn('Failed to save matter creation session:', error);
            }
          }

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Service was selected, move to questions
          const questions = teamConfig.serviceQuestions?.[body.service] || [
            `Tell me more about your ${body.service} situation.`,
            'When did this issue begin?',
            'What outcome are you hoping for?'
          ];

          // Send matter creation webhook (when service is first selected)
          const { WebhookService } = await import('../services/WebhookService.js');
          const webhookService = new WebhookService(env);
          const matterCreationPayload = {
            event: 'matter_creation',
            timestamp: new Date().toISOString(),
            teamId: body.teamId,
            sessionId: body.sessionId,
            matter: {
              service: body.service,
              qualityScore: quality,
              step: 'service-selected',
              totalQuestions: questions.length,
              hasQuestions: questions.length > 0
            }
          };

          // Fire and forget webhook - don't wait for completion
          webhookService.sendWebhook(body.teamId, 'matter_creation', matterCreationPayload, teamConfig)
            .catch(error => console.warn('Matter creation webhook failed:', error));
          
          if (questions.length > 0) {
            return new Response(JSON.stringify({
              step: 'questions',
              message: questions[0],
              currentQuestion: 1,
              totalQuestions: questions.length,
              selectedService: body.service,
              qualityScore: quality
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // No questions, go straight to matter details
            return new Response(JSON.stringify({
              step: 'matter-details',
              message: `Thank you for selecting ${body.service}. Please provide a detailed description of your situation.`,
              selectedService: body.service,
              qualityScore: quality
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

      case 'questions':
        const questions = teamConfig.serviceQuestions?.[body.service!] || [
          `Tell me more about your ${body.service} situation.`,
          'When did this issue begin?',
          'What outcome are you hoping for?'
        ];
        const currentIndex = body.currentQuestionIndex || 0;
        
        if (currentIndex < questions.length) {
          return new Response(JSON.stringify({
            step: 'questions',
            message: questions[currentIndex],
            currentQuestion: currentIndex + 1,
            totalQuestions: questions.length,
            selectedService: body.service,
            qualityScore: quality,
            questionText: questions[currentIndex] // Include the actual question text
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // All questions answered, move to matter review step
          const answers = body.answers || {};
          const answerValues = Object.values(answers).filter(Boolean);
          
          // Auto-generate matter description from Q&A answers
          const autoDescription = `${body.service} matter: ${answerValues.join('. ')}.`;
          
          // Create enhanced body for quality assessment
          const enhancedBody = {
            ...body,
            description: autoDescription,
            answers: answers
          };
          
          // Get quality assessment with the auto-generated description
          const initialQuality = assessMatterQuality(enhancedBody);
          
          return new Response(JSON.stringify({
            step: 'matter-review',
            message: `Thank you for answering those questions. Let me review your matter and provide a summary.`,
            selectedService: body.service,
            qualityScore: initialQuality,
            autoGeneratedDescription: autoDescription,
            answers: answers
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'matter-review':
        // Generate comprehensive matter summary and determine next steps
        const matterAnswers = body.answers || {};
        const matterDescription = body.description || `${body.service} matter with provided details`;
        
        // Extract question-answer pairs from the new data structure
        const questionAnswerPairs = Object.entries(matterAnswers).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
            return `**${value.question}**: ${value.answer}`;
          }
          // Fallback for old format
          return `**${key}**: ${value}`;
        }).filter(pair => pair.includes(': ') && !pair.includes(': undefined'));
        
        // Create enhanced matter data for assessment
        const matterData = {
          service: body.service,
          description: matterDescription,
          answers: matterAnswers,
          urgency: body.urgency
        };
        
        // Get detailed quality assessment
        const reviewQuality = assessMatterQuality(matterData);
        
        // Generate structured markdown matter summary for canvas
        let matterSummary = '';
        let matterId: string | undefined;
        
        // Create actual matter record in database first
        try {
          matterId = await createMatterRecord(
            env,
            body.teamId,
            body.sessionId || '',
            body.service,
            matterDescription,
            body.urgency
          );
        } catch (error) {
          console.warn('Failed to create matter record:', error);
          // Continue without matter record if creation fails
        }
        
        // Try to generate AI summary, but fallback gracefully if it fails
        if (aiService) {
          try {
            const summaryPrompt = `Create a matter summary for this ${body.service} matter using ONLY the information provided below. DO NOT add any details that were not explicitly mentioned by the client.

CLIENT PROVIDED INFORMATION:
${questionAnswerPairs.join('\n')}

INSTRUCTIONS:
- Use ONLY the information provided above
- If information is missing for a section, write "Not provided" or "Information not available"
- DO NOT make assumptions or add details that weren't mentioned
- DO NOT create fictional scenarios or relationships
- If the client only said "divorce" with no other details, the summary should reflect that limited information

Generate a markdown summary using this exact format:

# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
[State ONLY what the client explicitly mentioned - if they only said "divorce", write "Divorce matter"]

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: [Only what was explicitly stated]
- **Timeline**: [Only if dates/timing were mentioned, otherwise "Not provided"]
- **Current Situation**: [Only if current status was mentioned, otherwise "Not provided"]
- **Evidence/Documentation**: [Only if documents were mentioned, otherwise "Not provided"]

## 🎯 Objective
[Only what the client stated they want to achieve, otherwise "Seeking legal assistance"]

CRITICAL: If the client provided minimal information (like just "divorce"), the summary should reflect that limited information rather than making up details.`;

            const summaryResult = await aiService.runLLM([
              { role: 'system', content: 'You are a legal assistant creating factual matter summaries. Use ONLY information explicitly provided by the client. Do not add assumptions, fictional details, or information that was not mentioned. If information is missing, state "Not provided" rather than making up details.' },
              { role: 'user', content: summaryPrompt }
            ]);
            
            matterSummary = summaryResult.response || `# 📋 ${body.service} Matter Summary\n\n## 💼 Legal Matter\n${body.service} matter with provided details.\n\n## 📝 Key Details\n- **Issue**: Details provided through consultation\n- **Current Situation**: Information gathered`;
            
            // Store AI-generated summary linked to the matter
            if (matterSummary && matterId) {
              await storeAISummary(
                env,
                matterId,
                matterSummary,
                '@cf/meta/llama-3.1-8b-instruct',
                summaryPrompt
              );
            }
          } catch (error) {
            console.warn('AI matter summary failed:', error);
            // Create a basic summary from the Q&A data
            const basicSummary = `# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
${body.service} matter with details provided through consultation.

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: ${questionAnswerPairs.length > 0 ? questionAnswerPairs[0].split(': ')[1] || 'Details provided through consultation' : 'Information gathered through Q&A'}
- **Current Situation**: ${questionAnswerPairs.length > 1 ? questionAnswerPairs[1].split(': ')[1] || 'Under review' : 'Under review'}

## 🎯 Objective
${questionAnswerPairs.length > 2 ? questionAnswerPairs[2].split(': ')[1] || 'Seeking legal assistance' : 'Seeking legal assistance'}`;
            
            matterSummary = basicSummary;
          }
        } else {
          // No AI service available, create basic summary
          matterSummary = `# 📋 ${body.service} Matter Summary

## 💼 Legal Matter
${body.service} matter with details provided through consultation.

## 📝 Key Details
- **Practice Area**: ${body.service}
- **Issue**: ${questionAnswerPairs.length > 0 ? questionAnswerPairs[0].split(': ')[1] || 'Details provided through consultation' : 'Information gathered through Q&A'}
- **Current Situation**: ${questionAnswerPairs.length > 1 ? questionAnswerPairs[1].split(': ')[1] || 'Under review' : 'Under review'}

## 🎯 Objective
${questionAnswerPairs.length > 2 ? questionAnswerPairs[2].split(': ')[1] || 'Seeking legal assistance' : 'Seeking legal assistance'}`;
        }
        
        // Store matter Q&A pairs linked to the matter
        if (matterId && matterAnswers) {
          Object.entries(matterAnswers).forEach(async ([key, value]) => {
            if (typeof value === 'object' && value !== null && 'question' in value && 'answer' in value) {
              await storeMatterQuestion(
                env,
                matterId,
                body.teamId,
                value.question,
                value.answer,
                'ai-form'
              );
            }
          });
        }
        
        // Determine if matter needs improvement (more strict threshold)
        const needsImprovement = reviewQuality.score < 70 || reviewQuality.breakdown.answerQuality < 60;
        
        // Generate follow-up questions if needed
        let followUpQuestions = [];
        if (needsImprovement && aiService) {
          try {
            const questionPrompt = `Based on the client's ${body.service} matter, generate 2-3 specific follow-up questions to gather missing information.

CLIENT'S CURRENT INFORMATION:
${questionAnswerPairs.join('\n')}

GUIDELINES:
- Ask ONLY about information that is clearly missing
- Do NOT ask about details that were already provided
- Do NOT assume relationships or situations that weren't mentioned
- If the client only said "divorce", ask basic questions like timeline, current status, etc.
- Use gentle, supportive language
- Focus on factual information needed for legal assistance

Generate 2-3 specific questions that would help complete the matter details.`;

            const questionResult = await aiService.runLLM([
              { role: 'system', content: 'You are a legal assistant generating follow-up questions. Ask only about missing information that was not already provided. Do not assume details or relationships that were not mentioned.' },
              { role: 'user', content: questionPrompt }
            ]);
            
            // Parse questions from AI response
            const rawQuestions = questionResult.response
              .split('\n')
              .filter(line => line.trim() && (line.includes('?') || line.includes('1.') || line.includes('2.') || line.includes('3.')))
              .map(line => line.replace(/^[\s\-\•\d\.]+/, '').trim())
              .filter(q => q.length > 10 && q.includes('?'));
            
            followUpQuestions = rawQuestions.slice(0, 3);
          } catch (error) {
            console.warn('AI follow-up questions failed:', error);
            // Provide default follow-up questions if AI fails
            followUpQuestions = [
              `Can you tell me more about when this ${body.service.toLowerCase()} issue first started?`,
              `I'd love to understand what outcome you're hoping for in this situation.`,
              `Is there anything else about your ${body.service.toLowerCase()} matter that you think would be important for us to know?`
            ];
          }
        }
        
        // Generate matter number from matter ID
        const matterNumber = matterId ? `M-${matterId.substring(0, 8).toUpperCase()}` : undefined;
        
        // Create matter canvas data
        const matterCanvasData = {
          matterId: matterId,
          matterNumber: matterNumber,
          service: body.service,
          matterSummary: matterSummary,
          qualityScore: reviewQuality,
          answers: matterAnswers
        };
        
        // Improved follow-up message logic to avoid redundancy
        let followUpMessage = '';
        if (needsImprovement) {
          if (followUpQuestions.length > 0) {
            // Use the first AI-generated follow-up question directly
            followUpMessage = followUpQuestions[0];
          } else if (reviewQuality.issues.length > 0 && reviewQuality.issues[0].includes('too short')) {
            followUpMessage = `I noticed some of your answers were quite brief. To help you get the best legal assistance, could you provide more details?`;
          } else {
            followUpMessage = `To make sure we have everything needed for your ${body.service.toLowerCase()} matter, I'd love to get a few more details. Can you tell me more about your situation?`;
          }
        } else {
          // High quality matter - provide positive feedback
          if (reviewQuality.score >= 85) {
            followUpMessage = `Excellent! Your matter summary is comprehensive and well-detailed. You've provided everything we need to connect you with the right attorney for your ${body.service.toLowerCase()} matter.`;
          } else if (reviewQuality.score >= 75) {
            followUpMessage = `Great! Your matter summary looks comprehensive. You've provided strong information to connect you with the right attorney who can help with your ${body.service.toLowerCase()} matter.`;
          } else {
            followUpMessage = `Your matter summary looks good! You've provided the information we need to connect you with the right attorney for your ${body.service.toLowerCase()} matter.`;
          }
        }

        // Send matter details webhook (when matter review is completed)
        const { WebhookService } = await import('../services/WebhookService.js');
        const webhookService = new WebhookService(env);
        const matterDetailsPayload = {
          event: 'matter_details',
          timestamp: new Date().toISOString(),
          teamId: body.teamId,
          sessionId: body.sessionId,
          matterId: matterId,
          matter: {
            matterId: matterId,
            matterNumber: matterNumber,
            service: body.service,
            description: matterDescription,
            summary: matterSummary,
            answers: matterAnswers,
            qualityScore: {
              score: reviewQuality.score,
              readyForLawyer: reviewQuality.readyForLawyer,
              needsImprovement,
              threshold: 75
            },
            followUpQuestions,
            urgency: body.urgency,
            questionAnswerPairs,
            readyForNextStep: !needsImprovement,
            nextActions: needsImprovement ? ['improve-matter'] : ['contact', 'schedule']
          }
        };

        // Fire and forget webhook - don't wait for completion
        webhookService.sendWebhook(body.teamId, 'matter_details', matterDetailsPayload, teamConfig)
          .catch(error => console.warn('Matter details webhook failed:', error));
        
        return new Response(JSON.stringify({
          step: needsImprovement ? 'matter-review' : 'complete',
          message: followUpMessage,
          selectedService: body.service,
          qualityScore: reviewQuality,
          matterCanvas: matterCanvasData,
          followUpMessage: followUpMessage,
          needsImprovement,
          followUpQuestions,
          currentFollowUpIndex: 0,
          readyForNextStep: !needsImprovement,
          nextActions: needsImprovement ? ['improve-matter'] : ['contact', 'schedule']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'matter-details':
        const serviceText = body.service ? ` regarding your ${body.service} matter` : '';
        const nextStepMessage = quality.readyForLawyer 
          ? `Perfect! Based on your matter details${serviceText}, you're ready to speak with one of our attorneys. Would you like to schedule a consultation or submit your contact information?`
          : `Thank you for the details${serviceText}. To better assist you, I have a few suggestions to strengthen your matter before connecting with an attorney.`;
        
        return new Response(JSON.stringify({
          step: 'complete',
          message: nextStepMessage,
          selectedService: body.service,
          qualityScore: quality,
          readyForNextStep: quality.readyForLawyer,
          nextActions: quality.readyForLawyer ? ['schedule', 'contact'] : ['improve-matter', 'contact']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid step' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Matter creation error:', error);
    return new Response(JSON.stringify({ error: 'Matter creation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 