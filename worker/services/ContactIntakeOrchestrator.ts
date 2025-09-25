import { ConversationContextManager, type ConversationContext, type CaseDraft as ContextCaseDraft } from '../middleware/conversationContextManager.js';
import { PDFGenerationService } from './PDFGenerationService.js';
import { NotificationService } from './NotificationService.js';
import { Logger } from '../utils/logger.js';
import type { Env } from '../types.js';
import type { Team } from './TeamService.js';

interface MatterSubmissionInput {
  matterType: string;
  description: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  opposingParty?: string;
  urgency?: string;
}

interface OrchestrationOptions {
  env: Env;
  teamConfig?: Team | null;
  sessionId?: string;
  teamId?: string;
  correlationId?: string;
  matter: MatterSubmissionInput;
}

interface OrchestrationResult {
  pdf?: {
    filename: string;
    size: number;
    generatedAt: string;
    matterType: string;
    storageKey?: string;
    downloadUrl?: string;
  };
  context?: ConversationContext;
  notifications?: {
    matterCreatedSent: boolean;
    paymentSent: boolean;
  };
}

function buildFallbackCaseDraft(
  matter: MatterSubmissionInput,
  context: ConversationContext | null
): ContextCaseDraft {
  const now = new Date().toISOString();

  const baseDraft = context?.caseDraft;

  const normalizedUrgency = (() => {
    const allowed = ['low', 'normal', 'high', 'urgent'] as const;
    const raw = (matter.urgency || baseDraft?.urgency || '').toString().toLowerCase();
    return (allowed as readonly string[]).includes(raw) ? (raw as typeof allowed[number]) : 'normal';
  })();

  return {
    matter_type: matter.matterType || baseDraft?.matter_type || 'General Consultation',
    key_facts: baseDraft?.key_facts && baseDraft.key_facts.length > 0
      ? baseDraft.key_facts
      : matter.description
        ? [matter.description]
        : ['Client is seeking legal assistance.'],
    timeline: baseDraft?.timeline,
    parties: Array.isArray(baseDraft?.parties) ? baseDraft!.parties : [],
    documents: Array.isArray(baseDraft?.documents) ? baseDraft!.documents : [],
    evidence: Array.isArray(baseDraft?.evidence) ? baseDraft!.evidence : [],
    jurisdiction: baseDraft?.jurisdiction || 'Unknown',
    urgency: normalizedUrgency,
    status: 'ready',
    created_at: baseDraft?.created_at || now,
    updated_at: now
  };
}

function buildStorageKey(teamId: string | undefined, sessionId: string | undefined, filename: string): string {
  const safeTeam = teamId ? teamId.replace(/[^a-zA-Z0-9-_]/g, '') : 'public';
  const safeSession = sessionId ? sessionId.replace(/[^a-zA-Z0-9-_]/g, '') : 'anonymous';
  return `case-submissions/${safeTeam}/${safeSession}/${filename}`;
}

export class ContactIntakeOrchestrator {
  static async finalizeSubmission(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const { env, teamConfig, sessionId, teamId, matter, correlationId } = options;

    let context: ConversationContext | null = null;
    if (sessionId && teamId) {
      try {
        context = await ConversationContextManager.load(sessionId, teamId, env);
      } catch (error) {
        Logger.warn('[ContactIntakeOrchestrator] Failed to load conversation context', {
          sessionId,
          teamId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Ensure contact info is captured in context for downstream features
    if (context) {
      context.contactInfo = {
        ...context.contactInfo,
        name: matter.name,
        email: matter.email || context.contactInfo?.email,
        phone: matter.phone || context.contactInfo?.phone,
        location: matter.location || context.contactInfo?.location
      };
      context.conversationPhase = 'completed';
      context.userIntent = 'intake';
    }

    const caseDraft = buildFallbackCaseDraft(matter, context);

    if (context) {
      context.caseDraft = {
        ...caseDraft
      };
      context.lastUpdated = Date.now();
    }

    const teamMeta = teamConfig?.config ?? {};
    const teamName = (teamMeta.description || teamConfig?.name || 'Legal Services') as string;
    const brandColor = teamMeta.brandColor || '#334e68';

    let pdfResult: OrchestrationResult['pdf'];

    try {
      const pdfResponse = await PDFGenerationService.generateCaseSummaryPDF({
        caseDraft: {
          ...caseDraft,
          jurisdiction: caseDraft.jurisdiction || 'Unknown',
          urgency: caseDraft.urgency || 'normal'
        },
        clientName: matter.name,
        clientEmail: matter.email,
        teamName,
        teamBrandColor: brandColor
      }, env);

      if (pdfResponse.success && pdfResponse.pdfBuffer) {
        const filename = PDFGenerationService.generateFilename(caseDraft, matter.name);
        const generatedAt = new Date().toISOString();
        const size = pdfResponse.pdfBuffer.byteLength;

        let storageKey: string | undefined;

        if (env.FILES_BUCKET) {
          try {
            storageKey = buildStorageKey(teamId, sessionId, filename);
            await env.FILES_BUCKET.put(storageKey, pdfResponse.pdfBuffer, {
              httpMetadata: {
                contentType: 'application/pdf'
              }
            });

          } catch (storageError) {
            Logger.warn('[ContactIntakeOrchestrator] Failed to persist PDF to R2', {
              sessionId,
              teamId,
              error: storageError instanceof Error ? storageError.message : String(storageError)
            });
          }
        }

        pdfResult = {
          filename,
          size,
          generatedAt,
          matterType: caseDraft.matter_type,
          storageKey
        };

        if (context) {
          context.generatedPDF = pdfResult;
        }
      }
    } catch (error) {
      Logger.warn('[ContactIntakeOrchestrator] PDF generation failed', {
        sessionId,
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const notifications = {
      matterCreatedSent: false,
      paymentSent: false
    };

    if (teamConfig) {
      try {
        const notificationService = new NotificationService(env);

        await notificationService.sendMatterCreatedNotification({
          type: 'matter_created',
          teamConfig,
          matterInfo: {
            type: matter.matterType,
            urgency: matter.urgency,
            description: matter.description
          },
          clientInfo: {
            name: matter.name,
            email: matter.email,
            phone: matter.phone
          }
        });
        notifications.matterCreatedSent = true;

        if (teamConfig.config?.requiresPayment) {
          await notificationService.sendPaymentRequiredNotification({
            type: 'payment_required',
            teamConfig,
            matterInfo: {
              type: matter.matterType,
              description: matter.description
            },
            clientInfo: {
              name: matter.name,
              email: matter.email,
              phone: matter.phone
            }
          });
          notifications.paymentSent = true;
        }
      } catch (error) {
        Logger.warn('[ContactIntakeOrchestrator] Notification dispatch failed', {
          sessionId,
          teamId,
          correlationId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (context && sessionId && teamId) {
      try {
        await ConversationContextManager.save(context, env);
      } catch (error) {
        Logger.warn('[ContactIntakeOrchestrator] Failed to persist updated context', {
          sessionId,
          teamId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      pdf: pdfResult,
      context: context || undefined,
      notifications
    };
  }
}
