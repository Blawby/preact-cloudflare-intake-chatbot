import { describe, it, expect } from 'vitest';
import { EngagementLetterService } from '../../../worker/services/EngagementLetterService';

// Minimal Env mock for PDF generation test
const createEnv = () => ({
  AI: {} as any,
  DB: { prepare: () => ({ bind: () => ({ run: async () => {} }) }) } as any,
  CHAT_SESSIONS: {} as any,
  FILES_BUCKET: { put: async () => ({}) } as any,
  DOC_EVENTS: {} as any,
  PARALEGAL_TASKS: {} as any,
  PARALEGAL_AGENT: {} as any,
});

describe('EngagementLetterService.generatePDF', () => {
  it('generates a PDF that handles multi-line and non-ASCII content', async () => {
    const env = createEnv();
    const service = new EngagementLetterService(env as any);

    const data = {
      clientName: 'José 🚀',
      matterType: 'General',
      matterDescription: 'Line1 with emoji 🚀\nLine2 with accents: café naïve façade',
      attorneyName: 'Anaïs',
      firmName: 'Fïrm Ñame',
      scopeOfWork: 'Representation',
      effectiveDate: '2025-08-01'
    } as any;

    // We call private via bracket to keep test simple
    // @ts-ignore
    const pdf: Uint8Array = await service.generatePDF('Hello José 🚀\nMultiple lines\nAccents: café naïve façade', data);

    expect(pdf).toBeInstanceOf(Uint8Array);
    // Ensure it looks like a PDF by checking header bytes %PDF
    const header = new TextDecoder().decode(pdf.slice(0, 8));
    expect(header.startsWith('%PDF')).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
  });
});
