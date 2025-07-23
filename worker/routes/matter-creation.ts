import type { Env } from '../types';
import { parseJsonBody } from '../utils';

const SLOT_ORDER = ['full_name', 'email', 'phone', 'opposing_party', 'matter_details'];
const SLOT_LABELS = {
  full_name: 'May I have your full name?',
  email: 'Could you please share your email address?',
  phone: 'What’s the best phone number to reach you at?',
  opposing_party: 'Who is the opposing party (person or company) involved in this matter?',
  matter_details: (service?: string) => `Can you briefly describe the ${service || 'legal'} issue you’re facing?`
};

function isPlaceholder(val: string) {
  return !val || /what('|’)?s|please provide|can you|spell out|full name|email|phone|description|brief|situation|contact/i.test(val);
}

function isValidPhone(val: string) {
  // Accepts numbers, spaces, dashes, parentheses, and plus sign, min 7 digits
  return /\+?[\d\s\-\(\)]{7,}/.test(val);
}

function isValidOpposingParty(val: string, service?: string) {
  if (!val) return false;
  if (isPlaceholder(val)) return false;
  if (isValidPhone(val)) return false;
  if (/^[^@]+@[^@]+\.[^@]+$/.test(val)) return false; // email
  if (service && val.toLowerCase().includes(service.toLowerCase())) return false;
  return true;
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
      return new Response(JSON.stringify({ error: 'We couldn’t find your legal team configuration. Please check your team ID.' }), {
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
    // Helper to check if a value matches the service selection message
    function isServiceSelectionMessage(val: string, service?: string) {
      if (!val || !service) return false;
      return val.trim().toLowerCase() === `i'm looking for legal help with my ${service.toLowerCase()} issue.`;
    }
    // Determine which slot was last prompted
    let lastPromptedSlot = sessionData?.matterCreationState?.data?.lastQuestionSlot || null;
    // If this is the first step, set to first missing slot
    if (!lastPromptedSlot) {
      lastPromptedSlot = SLOT_ORDER.find(field => !mergedAnswers[field]?.answer || isPlaceholder(mergedAnswers[field]?.answer));
    }
    // Only fill the slot that was last prompted, and only if the reply is valid and not a service selection message or duplicate
    if (
      lastPromptedSlot &&
      !mergedAnswers[lastPromptedSlot]?.answer &&
      !isPlaceholder(body.description) &&
      !isServiceSelectionMessage(body.description, body.service) &&
      (!Object.values(mergedAnswers).some(a => a?.answer?.trim().toLowerCase() === body.description.trim().toLowerCase()))
    ) {
      if (lastPromptedSlot === 'phone' && isValidPhone(body.description)) {
        mergedAnswers[lastPromptedSlot] = {
          question: `${SLOT_LABELS[lastPromptedSlot]}?`,
          answer: body.description
        };
      } else if (lastPromptedSlot === 'opposing_party' && isValidOpposingParty(body.description, body.service)) {
        mergedAnswers[lastPromptedSlot] = {
          question: `${SLOT_LABELS[lastPromptedSlot]}?`,
          answer: body.description
        };
      } else if (lastPromptedSlot === 'matter_details' && isValidDescription(body.description, body.service, mergedAnswers)) {
        mergedAnswers[lastPromptedSlot] = {
          question: typeof SLOT_LABELS[lastPromptedSlot] === 'function'
            ? SLOT_LABELS[lastPromptedSlot](body.service)
            : SLOT_LABELS[lastPromptedSlot],
          answer: body.description
        };
      } else if (lastPromptedSlot !== 'phone' && lastPromptedSlot !== 'opposing_party' && lastPromptedSlot !== 'matter_details') {
        mergedAnswers[lastPromptedSlot] = {
          question: typeof SLOT_LABELS[lastPromptedSlot] === 'function'
            ? SLOT_LABELS[lastPromptedSlot](body.service)
            : SLOT_LABELS[lastPromptedSlot],
          answer: body.description
        };
      }
    }
    // Recompute filledFields and nextMissing after updating answers
    const filledFieldsUpdated = Object.fromEntries(
      SLOT_ORDER.map(field => [field, mergedAnswers[field]?.answer || ''])
    );
    const nextMissingUpdated = SLOT_ORDER.find(field => !filledFieldsUpdated[field] || isPlaceholder(filledFieldsUpdated[field]));
    // If user asks 'what is missing', respond directly
    const whatIsMissingRegex = /what(\s+is|'s)?\s+(the\s+)?missing|what do you need|what info|what information|what else/i;
    if (body.description && whatIsMissingRegex.test(body.description)) {
      const nextMissing = SLOT_ORDER.find(field => !filledFieldsUpdated[field] || isPlaceholder(filledFieldsUpdated[field]));
      return new Response(JSON.stringify({
        step: 'info-request',
        message: `I still need your ${SLOT_LABELS[nextMissing!]}. Could you provide that?`,
        answers: mergedAnswers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Build AI prompt
    const lastQuestion = sessionData?.matterCreationState?.data?.lastQuestion || '';
    const alreadyProvided = SLOT_ORDER
      .filter(field => filledFieldsUpdated[field] && !isPlaceholder(filledFieldsUpdated[field]))
      .map(field => `- ${SLOT_LABELS[field]}: "${filledFieldsUpdated[field]}"`).join('\n');
    const nextMissing = SLOT_ORDER.find(field => !filledFieldsUpdated[field] || isPlaceholder(filledFieldsUpdated[field]));
    // In the slotLabels mapping for next question, use the service for matter_details
    const slotLabels = {
      full_name: 'May I have your full name?',
      fullname: 'May I have your full name?',
      email: 'Could you please share your email address?',
      phone: 'What’s the best phone number to reach you at?',
      phonenumber: 'What’s the best phone number to reach you at?',
      opposing_party: 'Who is the opposing party (person or company) involved in this matter?',
      opposingparty: 'Who is the opposing party (person or company) involved in this matter?',
      matter_details: (service?: string) => `Can you briefly describe the ${service || 'legal'} issue you’re facing?`,
      matterdetails: (service?: string) => `Can you briefly describe the ${service || 'legal'} issue you’re facing?`
    };
    let normalizedKey = (lastQuestion || '').toLowerCase().replace(/[^a-z]/g, '');
    let nextQuestion = '';
    if (slotLabels[normalizedKey]) {
      nextQuestion = typeof slotLabels[normalizedKey] === 'function'
        ? slotLabels[normalizedKey](body.service)
        : slotLabels[normalizedKey];
    } else if (nextMissing && slotLabels[nextMissing]) {
      nextQuestion = typeof slotLabels[nextMissing] === 'function'
        ? slotLabels[nextMissing](body.service)
        : slotLabels[nextMissing];
    } else {
      nextQuestion = `Could you provide your ${SLOT_LABELS[nextMissing!]}.`;
    }
    const aiPrompt = `You are a professional and courteous legal intake assistant. Your tone is confident, clear, and respectful. Ask one question at a time to gather the following information:\n- Full name\n- Email address\n- Phone number\n- Brief description of the legal issue\n\nAvoid repeating questions. Use plain, formal language suitable for client intake. If a response contains unclear or placeholder language, do not treat it as valid input.\n\nHere is the conversation so far:\n\nLast question you asked: "${lastQuestion}"\nUser's reply: "${body.description || ''}"\n\nAlready provided:\n${alreadyProvided || 'None'}\n\nInstructions:\n- Only ask for the next missing field, in this order: name, email, phone, description.\n- Never ask for more than one thing at a time.\n- Never repeat or re-ask for info already provided.\n- Never use a question or template as a slot value.\n- Always use the selected service for the summary.\n- If the user asks "what is missing?" or "what do you need?", respond with the next missing field only.\n- Always use the key 'full_name' for the user's name.\n\nReturn ONLY a JSON object:\n{\n  "full_name": "",\n  "email": "",\n  "phone": "",\n  "matter_details": "",\n  "next_question": ""\n}`;
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
    // Update answers from LLM extraction, but NEVER fill matter_details from LLM extraction
    SLOT_ORDER.forEach(field => {
      if (field !== 'matter_details' && extractedData[field] && !isPlaceholder(extractedData[field])) {
        mergedAnswers[field] = {
          question: `${SLOT_LABELS[field]}?`,
          answer: extractedData[field]
        };
      }
    });
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
              lastQuestion: extractedData.next_question || '',
              lastQuestionSlot: nextMissingUpdated || null // Update lastQuestionSlot after each answer
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
    // All slots filled: show summary and ask for confirmation
    const hasAllRequired = SLOT_ORDER.every(
      field => mergedAnswers[field] && mergedAnswers[field].answer && !isPlaceholder(mergedAnswers[field].answer)
    );
    if (hasAllRequired) {
      // Get the actual team ID (ULID) from the database using the slug if needed
      let actualTeamId = body.teamId;
      try {
        const teamInfo = await env.DB.prepare('SELECT id FROM teams WHERE slug = ?').bind(body.teamId).first();
        if (teamInfo) actualTeamId = teamInfo.id as string;
      } catch {}
      const contactSummary = [
        `- **Full Name**: ${mergedAnswers.full_name?.answer}`,
        `- **Email**: ${mergedAnswers.email?.answer}`,
        `- **Phone**: ${mergedAnswers.phone?.answer}`,
        `- **Opposing Party**: ${mergedAnswers.opposing_party?.answer}`
      ].join('\n');
      const matterDescription = mergedAnswers.matter_details?.answer || 'Legal matter details provided';
      const service = body.service || 'General Consultation';
      // If user is submitting intake, finalize and return thank you
      if (body.step === 'submit-intake') {
        // Send matter_details webhook with full details
        const matterDetailsPayload = {
          event: 'matter_details',
          timestamp: new Date().toISOString(),
          teamId: actualTeamId,
          sessionId: body.sessionId,
          matter: {
            service: service,
            description: matterDescription,
            summary: `# Legal Intake Summary – ${service}\n\n## Contact Details\n${contactSummary}\n\n## Description of Legal Matter\n${matterDescription}`,
            answers: mergedAnswers,
            step: 'intake-complete',
            totalQuestions: SLOT_ORDER.length,
            hasQuestions: true
          }
        };
        console.log('Sending matter_details webhook payload:', JSON.stringify(matterDetailsPayload, null, 2));
        try {
          const { WebhookService } = await import('../services/WebhookService.js');
          const webhookService = new WebhookService(env);
          await webhookService.sendWebhook(actualTeamId, 'matter_details', matterDetailsPayload, teamConfig);
        } catch (err) {
          console.warn('Failed to send matter_details webhook:', err);
        }
        return new Response(JSON.stringify({
          step: 'intake-complete',
          message: 'Thank you! Your information has been submitted. A lawyer will contact you soon.',
          answers: mergedAnswers,
          webhookPayload: matterDetailsPayload, // for test verification
          followupMessage: "I've sent your info to our team, we will be in contact with you shortly. Would you like to add any more details to your request?"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // Otherwise, show summary and ask for confirmation
      // Send matter_creation webhook with full details
      const matterCreationPayload = {
        event: 'matter_creation',
        timestamp: new Date().toISOString(),
        teamId: actualTeamId,
        sessionId: body.sessionId,
        matter: {
          service: service,
          full_name: mergedAnswers.full_name?.answer,
          email: mergedAnswers.email?.answer,
          phone: mergedAnswers.phone?.answer,
          opposing_party: mergedAnswers.opposing_party?.answer,
          description: matterDescription,
          summary: `# Legal Intake Summary – ${service}\n\n## Contact Details\n${contactSummary}\n\n## Description of Legal Matter\n${matterDescription}`,
          answers: mergedAnswers,
          step: 'service-selected',
          totalQuestions: SLOT_ORDER.length,
          hasQuestions: true
        }
      };
      console.log('Sending matter_creation webhook payload:', JSON.stringify(matterCreationPayload, null, 2));
      try {
        const { WebhookService } = await import('../services/WebhookService.js');
        const webhookService = new WebhookService(env);
        await webhookService.sendWebhook(actualTeamId, 'matter_creation', matterCreationPayload, teamConfig);
      } catch (err) {
        console.warn('Failed to send matter_creation webhook:', err);
      }
      return new Response(JSON.stringify({
        step: 'awaiting-confirmation',
        message: `Thank you. Based on what you've shared, here’s a summary of your legal matter:`,
        matterCanvas: {
          service: service,
          matterSummary: `# Legal Intake Summary – ${service}\n\n## Contact Details\n${contactSummary}\n\n## Description of Legal Matter\n${matterDescription}`,
          answers: mergedAnswers
        },
        confirmationPrompt: `Does everything look correct? If so, click ‘Request Consultation’ to submit. If you need to make changes, just type your correction below.`,
        answers: mergedAnswers,
        webhookPayload: matterCreationPayload, // for test verification
        followupMessage: "I've sent your info to our team, we will be in contact with you shortly. Would you like to add any more details to your request?"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // If not all required slots are filled, ask for the next missing slot
    if (nextMissingUpdated) {
      const nextPrompt = typeof SLOT_LABELS[nextMissingUpdated] === 'function'
        ? SLOT_LABELS[nextMissingUpdated](body.service)
        : SLOT_LABELS[nextMissingUpdated];
      // Save last prompted slot to session
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
                lastQuestion: nextPrompt,
                lastQuestionSlot: nextMissingUpdated
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
      return new Response(JSON.stringify({
        step: 'info-request',
        message: nextPrompt,
        answers: mergedAnswers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Sorry, something went wrong while creating the matter. Please try again shortly.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// When checking for placeholders, ensure matter_details is not a placeholder or service name
function isValidDescription(val: string, service?: string, previousAnswers?: Record<string, any>) {
  if (!val) return false;
  if (isPlaceholder(val)) return false;
  if (service && val.toLowerCase().includes(service.toLowerCase())) return false;
  if (previousAnswers) {
    for (const key of Object.keys(previousAnswers)) {
      if (previousAnswers[key]?.answer && previousAnswers[key].answer.trim().toLowerCase() === val.trim().toLowerCase()) {
        return false;
      }
    }
  }
  return true;
} 