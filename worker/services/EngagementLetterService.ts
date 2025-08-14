import type { Env } from '../types';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface EngagementLetterTemplate {
  id: string;
  name: string;
  matterTypes: string[];
  content: string;
  placeholders: string[];
}

export interface EngagementLetterData {
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  matterType: string;
  matterDescription: string;
  attorneyName: string;
  firmName: string;
  firmAddress?: string;
  hourlyRate?: number;
  flatFee?: number;
  retainerAmount?: number;
  scopeOfWork: string;
  limitations?: string;
  jurisdiction?: string;
  effectiveDate: string;
}

export interface GeneratedLetter {
  id: string;
  matterId: string;
  content: string;
  r2Key: string;
  status: 'draft' | 'sent' | 'signed';
  createdAt: string;
}

export class EngagementLetterService {
  constructor(private env: Env) {}

  /**
   * Generate an engagement letter for a matter
   */
  async generateLetter(
    matterId: string,
    templateId: string = 'default',
    data: EngagementLetterData
  ): Promise<GeneratedLetter> {
    console.log('Generating engagement letter for matter:', matterId);

    try {
      // Get template
      const template = this.getTemplate(templateId);
      
      // Fill in placeholders
      const content = this.fillTemplate(template.content, data);
      
      // Generate PDF (simplified version using basic PDF generation)
      const pdfBytes = await this.generatePDF(content, data);
      
      // Store in R2
      const r2Key = `drafts/${data.firmName || 'firm'}/${matterId}/engagement-${Date.now()}.pdf`;
      if (!this.env.FILES_BUCKET) {
        const message = 'FILES_BUCKET is not configured. Cannot upload engagement letter PDF.';
        console.error(message);
        throw new Error(message);
      }
      await this.env.FILES_BUCKET.put(r2Key, pdfBytes, {
        httpMetadata: {
          contentType: 'application/pdf'
        },
        customMetadata: {
          matterId,
          documentType: 'engagement_letter',
          createdAt: new Date().toISOString()
        }
      });

      // Record in database
      const letterId = crypto.randomUUID();
      await this.recordInDatabase(letterId, matterId, template.id, content, r2Key);

      const result: GeneratedLetter = {
        id: letterId,
        matterId,
        content,
        r2Key,
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      console.log('Engagement letter generated successfully:', letterId);
      return result;

    } catch (error) {
      console.error('Failed to generate engagement letter:', error);
      throw new Error(`Engagement letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update engagement letter status
   */
  async updateStatus(
    letterId: string, 
    status: 'draft' | 'sent' | 'reviewed' | 'signed' | 'executed'
  ): Promise<void> {
    try {
      const stmt = this.env.DB.prepare(`
        UPDATE engagement_letters 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `);

      await stmt.bind(status, letterId).run();
      console.log(`Updated engagement letter ${letterId} status to ${status}`);
    } catch (error) {
      console.error('Failed to update engagement letter status:', error);
      throw error;
    }
  }

  /**
   * Get engagement letters for a matter
   */
  async getLettersForMatter(matterId: string): Promise<any[]> {
    try {
      const stmt = this.env.DB.prepare(`
        SELECT id, template_id, status, r2_key, version, created_at, updated_at
        FROM engagement_letters 
        WHERE matter_id = ?
        ORDER BY version DESC, created_at DESC
      `);

      const results = await stmt.bind(matterId).all();
      return results.results || [];
    } catch (error) {
      console.error('Failed to get engagement letters:', error);
      return [];
    }
  }

  private getTemplate(templateId: string): EngagementLetterTemplate {
    const templates: Record<string, EngagementLetterTemplate> = {
      default: {
        id: 'default',
        name: 'Standard Engagement Letter',
        matterTypes: ['general'],
        content: this.getDefaultTemplate(),
        placeholders: [
          'clientName', 'clientAddress', 'matterType', 'matterDescription',
          'attorneyName', 'firmName', 'scopeOfWork', 'hourlyRate', 'retainerAmount',
          'effectiveDate', 'jurisdiction'
        ]
      },
      family_law: {
        id: 'family_law',
        name: 'Family Law Engagement Letter',
        matterTypes: ['Family Law'],
        content: this.getFamilyLawTemplate(),
        placeholders: [
          'clientName', 'clientAddress', 'matterDescription', 'attorneyName',
          'firmName', 'hourlyRate', 'retainerAmount', 'effectiveDate'
        ]
      },
      employment_law: {
        id: 'employment_law', 
        name: 'Employment Law Engagement Letter',
        matterTypes: ['Employment Law'],
        content: this.getEmploymentLawTemplate(),
        placeholders: [
          'clientName', 'matterDescription', 'attorneyName', 'firmName',
          'hourlyRate', 'effectiveDate', 'limitations'
        ]
      }
    };

    return templates[templateId] || templates.default;
  }

  private fillTemplate(template: string, data: EngagementLetterData): string {
    let content = template;

    // Replace placeholders
    const replacements: Record<string, string> = {
      '{{clientName}}': data.clientName,
      '{{clientAddress}}': data.clientAddress || '[Client Address]',
      '{{clientEmail}}': data.clientEmail || '[Client Email]',
      '{{clientPhone}}': data.clientPhone || '[Client Phone]',
      '{{matterType}}': data.matterType,
      '{{matterDescription}}': data.matterDescription,
      '{{attorneyName}}': data.attorneyName,
      '{{firmName}}': data.firmName,
      '{{firmAddress}}': data.firmAddress || '[Firm Address]',
      '{{hourlyRate}}': data.hourlyRate ? `$${data.hourlyRate}` : '[Hourly Rate]',
      '{{flatFee}}': data.flatFee ? `$${data.flatFee}` : '[Flat Fee]',
      '{{retainerAmount}}': data.retainerAmount ? `$${data.retainerAmount}` : '[Retainer Amount]',
      '{{scopeOfWork}}': data.scopeOfWork,
      '{{limitations}}': data.limitations || 'Standard limitations apply as outlined in our firm policies.',
      '{{jurisdiction}}': data.jurisdiction || '[Jurisdiction]',
      '{{effectiveDate}}': data.effectiveDate,
      '{{currentDate}}': new Date().toLocaleDateString()
    };

    // Helper function to properly escape regex special characters
    const escapeRegex = (str: string): string => {
      return str.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      const escapedPlaceholder = escapeRegex(placeholder);
      const regex = new RegExp(escapedPlaceholder, 'g');
      content = content.replace(regex, value);
    }

    return content;
  }

  private async generatePDF(content: string, data: EngagementLetterData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = 14;
    const { width, height } = page.getSize();
    const margin = 50;
    const maxLineWidth = width - margin * 2;

    let cursorY = height - margin;

    const wrapText = (text: string): string[] => {
      if (!text) return [''];
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(test, fontSize);
        if (testWidth <= maxLineWidth) {
          current = test;
        } else {
          if (current) lines.push(current);
          // If single word too long, hard-split
          if (font.widthOfTextAtSize(word, fontSize) > maxLineWidth) {
            let chunk = '';
            for (const char of word) {
              const next = chunk + char;
              if (font.widthOfTextAtSize(next, fontSize) <= maxLineWidth) {
                chunk = next;
              } else {
                if (chunk) lines.push(chunk);
                chunk = char;
              }
            }
            current = chunk;
          } else {
            current = word;
          }
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const sanitize = (text: string): string => {
      try {
        // Will throw if characters can't be encoded by the font
        font.encodeText(text);
        return text;
      } catch {
        return Array.from(text)
          .map((ch) => {
            try {
              font.encodeText(ch);
              return ch;
            } catch {
              return '?';
            }
          })
          .join('');
      }
    };

    const paragraphs = content.split(/\n/);
    for (const para of paragraphs) {
      const lines = wrapText(sanitize(para));
      for (const line of lines) {
        if (cursorY - lineHeight < margin) {
          page = pdfDoc.addPage();
          cursorY = page.getSize().height - margin;
        }
        page.drawText(line, { x: margin, y: cursorY - lineHeight, size: fontSize, font });
        cursorY -= lineHeight;
      }
      // Paragraph spacing
      cursorY -= lineHeight * 0.5;
    }

    return await pdfDoc.save();
  }

  private async recordInDatabase(
    letterId: string,
    matterId: string,
    templateId: string,
    content: string,
    r2Key: string
  ): Promise<void> {
    const stmt = this.env.DB.prepare(`
      INSERT INTO engagement_letters (
        id, matter_id, template_id, content, status, r2_key, version, created_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, 1, datetime('now'))
    `);

    await stmt.bind(letterId, matterId, templateId, content, r2Key).run();
  }

  private getDefaultTemplate(): string {
    return `ENGAGEMENT LETTER

{{currentDate}}

{{clientName}}
{{clientAddress}}

Re: {{matterType}} - {{matterDescription}}

Dear {{clientName}},

This letter confirms our agreement regarding legal representation in the matter described above.

SCOPE OF REPRESENTATION
{{firmName}} agrees to represent you in connection with {{matterDescription}}. Our representation will include {{scopeOfWork}}.

FEES AND COSTS
Our hourly rate for this matter is {{hourlyRate}} per hour. We require a retainer of {{retainerAmount}} to begin work on your matter. This retainer will be held in our trust account and applied against fees and costs as they are incurred.

LIMITATIONS
{{limitations}}

JURISDICTION
This agreement shall be governed by the laws of {{jurisdiction}}.

Please sign and return one copy of this letter to indicate your agreement to these terms.

Sincerely,

{{attorneyName}}
{{firmName}}

ACCEPTED:

_________________________                    Date: _____________
{{clientName}}`;
  }

  private getFamilyLawTemplate(): string {
    return `FAMILY LAW ENGAGEMENT LETTER

{{currentDate}}

{{clientName}}
{{clientAddress}}

Re: Family Law Matter - {{matterDescription}}

Dear {{clientName}},

Thank you for selecting {{firmName}} to represent you in your family law matter. This letter outlines the terms of our representation.

SCOPE OF REPRESENTATION
We will represent you in connection with {{matterDescription}}. This may include negotiations, court proceedings, document preparation, and related legal services.

FEES AND BILLING
Our hourly rate is {{hourlyRate}} per hour. We require a retainer of {{retainerAmount}}. Family law matters can be emotionally and financially demanding, and we will keep you informed of costs throughout the process.

CONFIDENTIALITY
All communications between us are protected by attorney-client privilege.

COOPERATION
Your cooperation in providing documents and information promptly will help us serve you effectively and control costs.

Please sign below to confirm your agreement to these terms.

Sincerely,

{{attorneyName}}
{{firmName}}

CLIENT ACKNOWLEDGMENT:

_________________________                    Date: _____________
{{clientName}}`;
  }

  private getEmploymentLawTemplate(): string {
    return `EMPLOYMENT LAW ENGAGEMENT LETTER

{{currentDate}}

{{clientName}}

Re: Employment Law Matter - {{matterDescription}}

Dear {{clientName}},

This letter confirms our agreement to represent you in the employment law matter described above.

SCOPE OF WORK
{{firmName}} will represent you regarding {{matterDescription}}. {{limitations}}

FEES
Our hourly rate for employment law matters is {{hourlyRate}} per hour. Billing statements will be sent monthly.

TIME LIMITATIONS
Employment law matters often have strict deadlines. Please provide all requested information promptly to preserve your rights.

OUTCOME
While we will work diligently on your behalf, we cannot guarantee any specific outcome.

Please sign and return to confirm your agreement.

Best regards,

{{attorneyName}}
{{firmName}}

AGREED:

_________________________                    Date: _____________
{{clientName}}`;
  }
}
