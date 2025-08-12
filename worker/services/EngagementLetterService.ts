import type { Env } from '../types';

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
      await this.env.FILES_BUCKET?.put(r2Key, pdfBytes, {
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

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return content;
  }

  private async generatePDF(content: string, data: EngagementLetterData): Promise<Uint8Array> {
    // For now, we'll create a simple text-based PDF
    // In production, you'd use a proper PDF library like pdf-lib
    
    const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${content.length + 100}
>>
stream
BT
/F1 12 Tf
50 750 Td
(${content.replace(/\n/g, ') Tj 0 -15 Td (')}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000${(400 + content.length).toString().padStart(3, '0')} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${500 + content.length}
%%EOF`;

    return new TextEncoder().encode(pdfContent);
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
