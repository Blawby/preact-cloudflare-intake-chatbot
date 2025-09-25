Checked out main and pulled latest. Attempt to run wrangler dev + test-conversation-flow.sh failed because port 8787 was already bound by another process; the script never executed, so please stop the existing worker and retry when ready.
Contact Intake Strategy

The new conversation context manager now persistently extracts matter types, intent, and user-contact fields (name/email/phone/location) from the entire transcript, so the AI has structured data even before a form appears worker/middleware/conversationContextManager.ts:58, worker/middleware/conversationContextManager.ts:171, worker/middleware/conversationContextManager.ts:191.
Agent prompts explicitly gate show_contact_form: the tool is only made available after qualification, and skip-to-lawyer scenarios are instructed to surface it immediately when warranted worker/agents/legal-intake/index.ts:439, worker/agents/legal-intake/index.ts:441, worker/agents/legal-intake/index.ts:448.
Middleware keeps public traffic in self-service mode while team conversations pivot to the contact form by setting pendingContactForm, guaranteeing human handoff when someone wants to “talk to a lawyer” worker/middleware/skipToLawyerMiddleware.ts:254, worker/middleware/skipToLawyerMiddleware.ts:258, worker/middleware/skipToLawyerMiddleware.ts:273.
End-to-end tests already enforce “contact form only when appropriate” across greetings, team intake, urgent matters, and skip flows, so keeping the form aligned with these criteria protects regression coverage test-conversation-flow.sh:84, test-conversation-flow.sh:122, test-conversation-flow.sh:149.
The form still provides critical validation, explicit consent text, and structured submission logging before handing off to humans src/components/ContactForm.tsx:200, src/components/ContactForm.tsx:223.
Lead-qualification remains feature-flagged, letting us fine-tune when the form appears per environment or team src/config/features.ts:70, src/config/features.ts:80.
Recommended Architecture (Teams Version)

Keep the contact form as the final “commit” step for team deployments. Use the AI pipeline to pre-fill the form with extracted details and ask the user to confirm/edit before submission. This preserves compliance, data quality, and explicit consent while still benefiting from the richer conversation context.
Treat the pipeline as five phases: (1) AI dialogue builds structured context; (2) middleware adds case drafts, checklists, and PDF readiness worker/middleware/caseDraftMiddleware.ts:74, worker/middleware/pdfGenerationMiddleware.ts:12; (3) contact form confirmation captures authoritative contact info; (4) tool handlers create matters, invoices, and review tickets worker/agents/legal-intake/index.ts:276, worker/agents/legal-intake/index.ts:294; (5) async services deliver email and artifacts (Resend email service worker/services/EmailService.ts:1 and PDF generation worker/middleware/pdfGenerationMiddleware.ts:74).
On submission, trigger an orchestration sequence: create the matter, generate the case-summary PDF, upload it (R2), request payment when required, email the team owner with the structured summary and artifact links, and enqueue for lawyer review via request_lawyer_review.
Maintain AI-only intake for the public experience, but require the contact form for team handoffs, urgent escalations, or whenever the confidence score for extracted contact data is low. Add telemetry to log when AI-collected details differ from user-confirmed values to refine the extractor.
Extend the test suite with scenarios where AI extracts full contact info and the form is auto-populated, plus regression tests for the new PDF/payment/email flow once implemented.
Next Steps

Free port 8787 (or choose an alternate) and rerun npm run dev:worker + npm run test:conversation.
Implement form auto-fill and confirmation UX drawing from context.contactInfo.
Wire post-submission orchestration (PDF generation, payment, Resend email) behind a queue or durable object to keep the worker responsive.
Instrument success/fallback metrics so we can tune when the form is shown or skipped.
Let me know when you’re ready for the orchestration implementation or if you want help resolving the local port conflict.
Orchestration Implementation (2025-09-25)

- Added `worker/services/ContactIntakeOrchestrator.ts` to centralize post-contact tasks: load/save conversation context, synthesize a fallback case draft, generate the PDF, persist it to R2 when configured, and dispatch Resend notifications.
- Updated `worker/agents/legal-intake/index.ts` so the `create_matter` tool now invokes the orchestrator, returns PDF metadata in the tool response, and lets the user know their submission and payment status were forwarded to the team.
- Extended `worker/middleware/conversationContextManager.ts` to track PDF storage details, enabling the UI and follow-up workflows to locate the generated summary.
- Prefill contact forms automatically using any structured contact info the middleware extracted earlier in the conversation, so teams only ask users to confirm rather than retype details (`worker/agents/legal-intake/index.ts`, `src/components/ContactForm.tsx`).
