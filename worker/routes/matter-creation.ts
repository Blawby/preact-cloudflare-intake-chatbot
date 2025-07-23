import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody, createMatterRecord, storeMatterQuestion, storeAISummary, updateAISummary, updateMatterRecord, getMatterIdBySession } from '../utils';

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

// NEW: Helper functions for enhanced prompt system
function generateRequiredFieldPrompt(field: string, service: string): string {
  const fieldPrompts = {
    full_name: `To help you with your ${service} matter, I'll need your full name. What's your complete legal name?`,
    email: `Great! Now I need your email address so we can send you important updates about your ${service} matter. What's your email?`,
    phone: `Perfect! Finally, I need a phone number where we can reach you about your ${service} matter. What's the best number to contact you?`
  };
  
  return fieldPrompts[field as keyof typeof fieldPrompts] || `Please provide your ${field.replace('_', ' ')}.`;
}

function validateRequiredFields(answers: Record<string, any>): { isValid: boolean; missingFields: string[] } {
  const requiredFields = ['full_name', 'email', 'phone'];
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const hasField = Object.keys(answers).some(key => 
      key.toLowerCase().includes(field) && 
      answers[key] && 
      (typeof answers[key] === 'string' ? answers[key].trim() : answers[key].answer?.trim())
    );
    
    if (!hasField) {
      missingFields.push(field.replace('_', ' '));
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// NEW: Extract contact information from answers
function extractContactInfo(answers: Record<string, any>): { full_name?: string; email?: string; phone?: string } {
  const contactInfo: { full_name?: string; email?: string; phone?: string } = {};
  
  for (const [key, value] of Object.entries(answers)) {
    const answer = typeof value === 'string' ? value : (value as any)?.answer || '';
    
    if (key.toLowerCase().includes('full_name') || key.toLowerCase().includes('name')) {
      contactInfo.full_name = answer;
    } else if (key.toLowerCase().includes('email')) {
      contactInfo.email = answer;
    } else if (key.toLowerCase().includes('phone')) {
      contactInfo.phone = answer;
    }
  }
  
  return contactInfo;
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
          
          // Get team info for webhook payload - use slug to find ULID
          const teamInfo = await env.DB.prepare('SELECT id, slug, name FROM teams WHERE slug = ?').bind(body.teamId).first();
          
          const matterCreationPayload = {
            event: 'matter_creation',
            timestamp: new Date().toISOString(),
            teamId: teamInfo?.id || body.teamId, // Use ULID if available, fallback to slug
            teamName: body.teamId, // Human-readable team identifier (slug)
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
        // 1. ALWAYS try AI extraction first if description is provided
        if (body.description && body.description.trim().length > 0) {
          console.log('🔍 Running AI extraction on description:', body.description);
          
          // Load existing session data
          let sessionData = null;
          if (body.sessionId) {
            try {
              const sessionString = await env.CHAT_SESSIONS.get(body.sessionId);
              if (sessionString) {
                sessionData = JSON.parse(sessionString);
              }
            } catch (error) {
              console.warn('Failed to load session data:', error);
            }
          }
          
          // Merge existing answers
          const existingAnswers = sessionData?.matterCreationState?.data?.answers || {};
          const currentAnswers = body.answers || {};
          const mergedAnswers = { ...existingAnswers, ...currentAnswers };

          // Determine last question asked
          const lastQuestion = sessionData?.matterCreationState?.data?.lastQuestion || '';

          // Determine which slots are missing
          const requiredFields = ['full_name', 'email', 'phone', 'matter_details'];
          const filledFields = Object.fromEntries(
            requiredFields.map(field => [field, mergedAnswers[field]?.answer || ''])
          );
          const missingFields = requiredFields.filter(field => !filledFields[field]);

          // If user asks 'what is missing' or similar, respond directly
          const whatIsMissingRegex = /what(\s+is|'s)?\s+(the\s+)?missing|what do you need|what info|what information|what else/i;
          if (whatIsMissingRegex.test(body.description)) {
            return new Response(JSON.stringify({
              step: 'questions',
              message: `To proceed, please provide: ${missingFields.map(f => f.replace('_', ' ')).join(', ')}.`,
              answers: mergedAnswers
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Build AI prompt
          const alreadyProvided = requiredFields
            .filter(field => filledFields[field])
            .map(field => `- ${field.replace('_', ' ')}: "${filledFields[field]}"`).join('\n');
          const missingList = missingFields.map(f => f.replace('_', ' ')).join(', ');

          const aiPrompt = `You are a legal intake agent. Here is the conversation so far:

Last question you asked: "${lastQuestion}"
User's reply: "${body.description}"

Already provided:
${alreadyProvided || 'None'}

Missing fields:
${missingList || 'None'}

If the user asks "what is missing?" or "what do you need?", respond with a clear, direct list of the missing fields.

Return ONLY a JSON object:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "matter_details": "",
  "acknowledgement": "",
  "next_question": ""
}`;

          try {
            const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [
                { 
                  role: 'system', 
                  content: `You are a helpful legal intake assistant for ${teamConfig.name || 'legal services'}. Extract information naturally and ask follow-up questions conversationally.` 
                },
                { role: 'user', content: aiPrompt }
              ]
            });

            const aiResult = aiResponse.response;
            console.log('AI extraction result:', aiResult);
            
            // Parse AI response - extract first JSON block only
            let extractedData;
            try {
              const raw = aiResult;
              const jsonBlock = raw.match(/\{[\s\S]*?\}/)?.[0];   // grab first {...}
              if (!jsonBlock) throw new Error('No JSON from LLM');
              extractedData = JSON.parse(jsonBlock);
              console.log('✅ Successfully parsed JSON from LLM:', extractedData);
            } catch (parseError) {
              console.error('❌ Failed to parse AI extraction:', parseError);
              console.error('Raw AI response:', aiResult);
            }
            
            if (extractedData) {
              // Update answers with extracted info
              const updatedAnswers = { ...mergedAnswers };
              
              if (extractedData.full_name) {
                updatedAnswers.full_name = {
                  question: 'What is your full legal name?',
                  answer: extractedData.full_name
                };
              }
              if (extractedData.email) {
                updatedAnswers.email = {
                  question: 'What is your email address?',
                  answer: extractedData.email
                };
              }
              if (extractedData.phone) {
                updatedAnswers.phone = {
                  question: 'What is your phone number?',
                  answer: extractedData.phone
                };
              }
              if (extractedData.matter_details) {
                updatedAnswers.matter_details = {
                  question: 'Tell me about your legal situation',
                  answer: extractedData.matter_details
                };
              }
              
              // Save to session, including lastQuestion
              if (body.sessionId) {
                try {
                  const updatedSessionData = {
                    ...sessionData,
                    matterCreationState: {
                      ...sessionData?.matterCreationState,
                      data: {
                        ...sessionData?.matterCreationState?.data,
                        answers: updatedAnswers,
                        lastQuestion: extractedData.next_question || ''
                      },
                      timestamp: new Date().toISOString()
                    },
                    lastActivity: new Date().toISOString()
                  };
                  
                  await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(updatedSessionData), {
                    expirationTtl: 24 * 60 * 60
                  });
                } catch (error) {
                  console.warn('Failed to save session data:', error);
                }
              }
              
              // Check which fields are missing
              const requiredFields = ['full_name', 'email', 'phone', 'matter_details'];
              const hasAllRequired = requiredFields.every(field => 
                updatedAnswers[field] && updatedAnswers[field].answer
              );
              
              if (!hasAllRequired) {
                // Use AI-generated acknowledgement and next_question
                const nextQuestion = extractedData.next_question || 'Could you provide the missing information?';
                const acknowledgement = extractedData.acknowledgement || '';
                return new Response(JSON.stringify({
                  step: 'questions',
                  message: `${acknowledgement}${acknowledgement ? '\n' : ''}${nextQuestion}`.trim(),
                  answers: updatedAnswers
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              } else {
                // All required fields present - move to matter review
                const contactSummary = [
                  `**Name**: ${updatedAnswers.full_name?.answer}`,
                  `**Email**: ${updatedAnswers.email?.answer}`,
                  `**Phone**: ${updatedAnswers.phone?.answer}`
                ].join('\n');
                
                // Create matter description from extracted data
                const matterDescription = extractedData.matter_details || 'Legal matter details provided';
                const service = extractedData.service || body.service || 'General Consultation';
                
                // Create enhanced body for quality assessment
                const enhancedBody = {
                  ...body,
                  service: service,
                  description: matterDescription,
                  answers: updatedAnswers
                };
                
                // Get quality assessment
                const qualityScore = assessMatterQuality(enhancedBody);
                
                // Create matter canvas
                const matterCanvas = {
                  service: service,
                  matterSummary: `# ${service} Matter Summary\n\n## Contact Information\n${contactSummary}\n\n## Matter Details\n${matterDescription}\n\n## Quality Assessment\n- **Score**: ${qualityScore.score}/100\n- **Status**: ${qualityScore.readyForLawyer ? 'Ready for Attorney' : 'Needs More Information'}`,
                  qualityScore: qualityScore,
                  answers: updatedAnswers
                };
                
                console.log('✅ AI extraction successful - all required fields present, creating matter summary');
                return new Response(JSON.stringify({
                  step: 'matter-details',
                  message: `Perfect! I have your contact information:\n\n${contactSummary}\n\nHere's your matter summary:`,
                  answers: updatedAnswers,
                  matterCanvas: matterCanvas,
                  qualityScore: qualityScore
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          } catch (aiError) {
            console.warn('AI extraction failed:', aiError);
            return new Response(JSON.stringify({
              step: 'questions',
              message: 'Sorry, I had trouble understanding your last message. Could you please rephrase or provide the missing information?',
              answers: mergedAnswers
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

      case 'matter-review':
        // Generate comprehensive matter summary and determine next steps
        
        // Load existing session data to get all answers
        let reviewSessionData = null;
        if (body.sessionId) {
          try {
            const sessionString = await env.CHAT_SESSIONS.get(body.sessionId);
            if (sessionString) {
              reviewSessionData = JSON.parse(sessionString);
            }
          } catch (error) {
            console.warn('Failed to load session data:', error);
          }
        }
        
        // Merge answers from session and current request
        const reviewSessionAnswers = reviewSessionData?.matterCreationState?.data?.answers || {};
        const reviewCurrentAnswers = body.answers || {};
        const matterAnswers = { ...reviewSessionAnswers, ...reviewCurrentAnswers };
        
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
        
        // Check if we already have a matter record for this session (for follow-up questions)
        if (body.sessionId) {
          matterId = await getMatterIdBySession(env, body.sessionId, body.teamId);
        }
        
        // Create or update matter record in database
        try {
          if (matterId) {
            // Update existing matter record with new information
            await updateMatterRecord(
              env,
              matterId,
              matterDescription,
              body.urgency
            );
          } else {
            // Create new matter record
            matterId = await createMatterRecord(
              env,
              body.teamId,
              body.sessionId || '',
              body.service,
              matterDescription,
              body.urgency
            );
          }
        } catch (error) {
          console.warn('Failed to create/update matter record:', error);
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
            
            // Store or update AI-generated summary linked to the matter
            if (matterSummary && matterId) {
              await updateAISummary(
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
              // Determine if this is a follow-up question based on the key
              const isFollowUp = key.startsWith('followup_');
              await storeMatterQuestion(
                env,
                matterId,
                body.teamId,
                value.question,
                value.answer,
                isFollowUp ? 'followup' : 'ai-form'
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
          if (reviewQuality.issues.length > 0 && reviewQuality.issues[0].includes('too short')) {
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
        
        // Get team info for webhook payload - use slug to find ULID
        const teamInfo = await env.DB.prepare('SELECT id, slug, name FROM teams WHERE slug = ?').bind(body.teamId).first();
        
        // NEW: Extract contact information from answers
        const contactInfo = extractContactInfo(matterAnswers);
        
        const matterDetailsPayload = {
          event: 'matter_details',
          timestamp: new Date().toISOString(),
          teamId: teamInfo?.id || body.teamId, // Use ULID if available, fallback to slug
          teamName: body.teamId, // Human-readable team identifier (slug)
          sessionId: body.sessionId,
          matterId: matterId,
          contact: contactInfo, // NEW: Structured contact information
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

        // Debug webhook configuration
        console.log('Webhook debug info:');
        console.log('- Team ID:', body.teamId);
        console.log('- Team config webhooks enabled:', teamConfig.webhooks?.enabled);
        console.log('- Team config webhook URL:', teamConfig.webhooks?.url);
        console.log('- Team config webhook events:', teamConfig.webhooks?.events);
        console.log('- Matter details event enabled:', teamConfig.webhooks?.events?.matterDetails);

        // Fire and forget webhook - don't wait for completion
        // Use the team slug to get the team config for webhook delivery
        console.log('About to send webhook...');
        webhookService.sendWebhook(body.teamId, 'matter_details', matterDetailsPayload, teamConfig)
          .then(() => console.log('Webhook sent successfully'))
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