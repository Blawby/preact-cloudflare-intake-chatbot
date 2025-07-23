import type { Env } from '../types';
import { parseJsonBody } from '../utils';

const SLOT_ORDER = ['full_name', 'email', 'phone', 'matter_details'];
const SLOT_LABELS = {
  full_name: 'name',
  email: 'email address',
  phone: 'phone number',
  matter_details: 'a brief description of your situation'
};

function isPlaceholder(val: string) {
  return !val || /what('|’)?s|please provide|can you|spell out|full name|email|phone|description|brief|situation|contact/i.test(val);
}

function isValidPhone(val: string) {
  // Accepts numbers, spaces, dashes, parentheses, and plus sign, min 7 digits
  return /\+?[\d\s\-\(\)]{7,}/.test(val);
}

export async function handleMatterCreation(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as any;
    if (!body.teamId) {
      return new Response(JSON.stringify({ error: 'Missing teamId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team config
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(body.teamId);
    if (!teamConfig || Object.keys(teamConfig).length === 0) {
      return new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. AI-driven slot-filling/questions
    // Load session data
    let sessionData = null;
    if (body.sessionId) {
      try {
        const sessionString = await env.CHAT_SESSIONS.get(body.sessionId);
        if (sessionString) sessionData = JSON.parse(sessionString);
      } catch {}
    }
    // If service is not set, try to recover from session
    if (!body.service && sessionData?.matterCreationState?.data?.service) {
      body.service = sessionData.matterCreationState.data.service;
    }
    // If still no service, show service selection (and only then)
    if (!body.service) {
      const services = teamConfig.availableServices || [];
      return new Response(JSON.stringify({
        step: 'service-selection',
        message: 'What type of legal matter do you need help with?',
        services
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Merge answers robustly: always prefer latest, skip placeholders, and never re-ask filled slots
    const existingAnswers = sessionData?.matterCreationState?.data?.answers || {};
    const currentAnswers = body.answers || {};
    const mergedAnswers = { ...existingAnswers };
    for (const key of Object.keys(currentAnswers)) {
      const val = currentAnswers[key];
      if (val && typeof val === 'object' && val.answer && !isPlaceholder(val.answer)) {
        mergedAnswers[key] = val;
      }
    }
    // Fill slots
    const filledFields = Object.fromEntries(
      SLOT_ORDER.map(field => [field, mergedAnswers[field]?.answer || ''])
    );
    // If user asks 'what is missing', respond directly
    const whatIsMissingRegex = /what(\s+is|'s)?\s+(the\s+)?missing|what do you need|what info|what information|what else/i;
    if (body.description && whatIsMissingRegex.test(body.description)) {
      const nextMissing = SLOT_ORDER.find(field => !filledFields[field] || isPlaceholder(filledFields[field]));
      return new Response(JSON.stringify({
        step: 'questions',
        message: `What is your ${SLOT_LABELS[nextMissing!]}?`,
        answers: mergedAnswers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Build AI prompt
    const lastQuestion = sessionData?.matterCreationState?.data?.lastQuestion || '';
    const alreadyProvided = SLOT_ORDER
      .filter(field => filledFields[field] && !isPlaceholder(filledFields[field]))
      .map(field => `- ${SLOT_LABELS[field]}: "${filledFields[field]}"`).join('\n');
    const nextMissing = SLOT_ORDER.find(field => !filledFields[field] || isPlaceholder(filledFields[field]));
    const nextLabel = SLOT_LABELS[nextMissing!];
    const aiPrompt = `You are a concise, direct legal intake agent. Here is the conversation so far:

Last question you asked: "${lastQuestion}"
User's reply: "${body.description || ''}"

Already provided:
${alreadyProvided || 'None'}

Instructions:
- Only ask for the next missing field, in this order: name, email, phone, description.
- Never ask for more than one thing at a time.
- Never repeat or re-ask for info already provided.
- Never use a question or template as a slot value.
- Always use the selected service for the summary.
- If the user asks "what is missing?" or "what do you need?", respond with the next missing field only.
- Always use the key 'full_name' for the user's name.

Return ONLY a JSON object:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "matter_details": "",
  "next_question": ""
}`;
    // Run AI extraction
    let extractedData = {} as any;
    if (body.description && body.description.trim().length > 0) {
      try {
        const aiResponse = await aiService.runLLM([
          { role: 'system', content: `You are a helpful legal intake assistant for ${teamConfig.name || 'legal services'}.` },
          { role: 'user', content: aiPrompt }
        ]);
        const raw = aiResponse.response;
        const jsonBlock = raw.match(/\{[\s\S]*?\}/)?.[0];
        if (jsonBlock) extractedData = JSON.parse(jsonBlock);
      } catch (e) {
        extractedData = {};
      }
    }
    // Filter out placeholders
    SLOT_ORDER.forEach(field => {
      if (extractedData[field] && isPlaceholder(extractedData[field])) {
        extractedData[field] = '';
      }
    });
    // Update answers from LLM extraction
    SLOT_ORDER.forEach(field => {
      if (extractedData[field] && !isPlaceholder(extractedData[field])) {
        mergedAnswers[field] = {
          question: `What is your ${SLOT_LABELS[field]}?`,
          answer: extractedData[field]
        };
      }
    });
    // If the last slot asked is still missing and the user's reply is not a placeholder, fill it
    if (nextMissing && !mergedAnswers[nextMissing]?.answer && !isPlaceholder(body.description)) {
      if (nextMissing === 'phone') {
        if (isValidPhone(body.description)) {
          mergedAnswers[nextMissing] = {
            question: `What is your ${SLOT_LABELS[nextMissing]}?`,
            answer: body.description
          };
        } // else do not fill, will re-ask for phone
      } else {
        mergedAnswers[nextMissing] = {
          question: `What is your ${SLOT_LABELS[nextMissing]}?`,
          answer: body.description
        };
      }
    }
    // Save to session
    if (body.sessionId) {
      try {
        const updatedSessionData = {
          ...sessionData,
          matterCreationState: {
            ...sessionData?.matterCreationState,
            data: {
              ...sessionData?.matterCreationState?.data,
              answers: mergedAnswers,
              service: body.service,
              lastQuestion: extractedData.next_question || ''
            },
            timestamp: new Date().toISOString()
          },
          lastActivity: new Date().toISOString()
        };
        await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(updatedSessionData), {
          expirationTtl: 24 * 60 * 60
        });
      } catch {}
    }
    // Check if all slots are filled
    const hasAllRequired = SLOT_ORDER.every(
      field => mergedAnswers[field] && mergedAnswers[field].answer && !isPlaceholder(mergedAnswers[field].answer)
    );
    if (!hasAllRequired) {
      let nextQuestion = extractedData.next_question;
      // When mapping slot keys to human prompts, only use 'full_name'
      const slotLabels = {
        full_name: 'What is your name?',
        email: 'What is your email address?',
        phone: 'What is your phone number?',
        matter_details: 'Can you briefly describe your situation?'
      };
      const normalizedKey = (nextQuestion || '').toLowerCase().replace(/[_\s]/g, '');
      if (slotLabels[normalizedKey]) {
        nextQuestion = slotLabels[normalizedKey];
      }
      if (!nextQuestion || isPlaceholder(nextQuestion)) {
        nextQuestion = `What is your ${nextLabel}?`;
      }
      return new Response(JSON.stringify({
        step: 'questions',
        message: nextQuestion.trim(),
        answers: mergedAnswers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // All slots filled: generate summary
    const contactSummary = [
      `**Name**: ${mergedAnswers.full_name?.answer}`,
      `**Email**: ${mergedAnswers.email?.answer}`,
      `**Phone**: ${mergedAnswers.phone?.answer}`
    ].join('\n');
    const matterDescription = mergedAnswers.matter_details?.answer || 'Legal matter details provided';
    const service = body.service || 'General Consultation';
    return new Response(JSON.stringify({
      step: 'matter-details',
      message: `Perfect! I have your contact information:\n\n${contactSummary}\n\nHere's your matter summary:`,
      answers: mergedAnswers,
      matterCanvas: {
        service: service,
        matterSummary: `# ${service} Matter Summary\n\n## Contact Information\n${contactSummary}\n\n## Matter Details\n${matterDescription}`,
        answers: mergedAnswers
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Matter creation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 