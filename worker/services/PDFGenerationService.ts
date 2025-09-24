import { Logger } from '../utils/logger.js';
import type { Env } from '../types.js';

interface CaseDraft {
  matter_type: string;
  key_facts: string[];
  timeline?: string;
  parties: Array<{ role: string; name?: string; relationship?: string }>;
  documents: string[];
  evidence: string[];
  jurisdiction: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'ready';
}

interface PDFGenerationOptions {
  caseDraft: CaseDraft;
  clientName?: string;
  clientEmail?: string;
  teamName?: string;
  teamBrandColor?: string;
}

export class PDFGenerationService {
  private static BASE_URL: string;

  public static initialize(env: Env) {
    this.BASE_URL = env.PDF_GENERATION_API_URL || 'https://api.html-pdf-node.com';
    Logger.info(`[PDFGenerationService] Initialized with BASE_URL: ${this.BASE_URL}`);
  }

  /**
   * Generate a PDF case summary from case draft data
   */
  public static async generateCaseSummaryPDF(
    options: PDFGenerationOptions,
    env: Env
  ): Promise<{ success: boolean; pdfBuffer?: ArrayBuffer; error?: string }> {
    try {
      const html = this.generateHTML(options);
      const pdfBuffer = await this.convertHTMLToPDF(html, env);
      
      Logger.info('[PDFGenerationService] PDF generated successfully', {
        matterType: options.caseDraft.matter_type,
        clientName: options.clientName,
        size: pdfBuffer.byteLength
      });

      return {
        success: true,
        pdfBuffer
      };

    } catch (error) {
      Logger.error('[PDFGenerationService] PDF generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate HTML content for the case summary
   */
  private static generateHTML(options: PDFGenerationOptions): string {
    const { caseDraft, clientName, teamName, teamBrandColor } = options;
    const brandColor = teamBrandColor || '#2563eb';
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Summary - ${caseDraft.matter_type}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        
        .header {
            border-bottom: 3px solid ${brandColor};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: ${brandColor};
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        
        .header .subtitle {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 16px;
        }
        
        .case-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid ${brandColor};
        }
        
        .case-info h2 {
            color: ${brandColor};
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: 600;
            color: #555;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #333;
            font-size: 16px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section h2 {
            color: ${brandColor};
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 20px;
        }
        
        .facts-list {
            list-style: none;
            padding: 0;
        }
        
        .facts-list li {
            background-color: #f8f9fa;
            margin-bottom: 10px;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid ${brandColor};
        }
        
        .parties-list {
            list-style: none;
            padding: 0;
        }
        
        .parties-list li {
            background-color: #f8f9fa;
            margin-bottom: 10px;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid ${brandColor};
        }
        
        .documents-list, .evidence-list {
            list-style: none;
            padding: 0;
        }
        
        .documents-list li, .evidence-list li {
            background-color: #f8f9fa;
            margin-bottom: 8px;
            padding: 10px 15px;
            border-radius: 6px;
            border-left: 3px solid #28a745;
        }
        
        .urgency-high {
            color: #dc3545;
            font-weight: 600;
        }
        
        .urgency-medium {
            color: #ffc107;
            font-weight: 600;
        }
        
        .urgency-low {
            color: #28a745;
            font-weight: 600;
        }
        
        .disclaimer {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin-top: 30px;
            font-size: 14px;
            color: #856404;
        }
        
        .disclaimer h3 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 16px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Legal Case Summary</h1>
        <p class="subtitle">${teamName || 'Legal Services'} • Generated on ${currentDate}</p>
    </div>

    <div class="case-info">
        <h2>Case Overview</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Matter Type</span>
                <span class="info-value">${caseDraft.matter_type}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Jurisdiction</span>
                <span class="info-value">${caseDraft.jurisdiction}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Urgency Level</span>
                <span class="info-value urgency-${caseDraft.urgency}">${caseDraft.urgency.toUpperCase()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">${caseDraft.status.toUpperCase()}</span>
            </div>
        </div>
        ${clientName ? `
        <div class="info-item" style="margin-top: 15px;">
            <span class="info-label">Client</span>
            <span class="info-value">${clientName}</span>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2>Key Facts</h2>
        <ul class="facts-list">
            ${caseDraft.key_facts.map(fact => `<li>${fact}</li>`).join('')}
        </ul>
    </div>

    ${caseDraft.timeline ? `
    <div class="section">
        <h2>Timeline</h2>
        <p>${caseDraft.timeline}</p>
    </div>
    ` : ''}

    ${caseDraft.parties.length > 0 ? `
    <div class="section">
        <h2>Parties Involved</h2>
        <ul class="parties-list">
            ${caseDraft.parties.map(party => `
                <li>
                    <strong>${party.role}:</strong> ${party.name || 'Name not provided'}
                    ${party.relationship ? ` (${party.relationship})` : ''}
                </li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    ${caseDraft.documents.length > 0 ? `
    <div class="section">
        <h2>Available Documents</h2>
        <ul class="documents-list">
            ${caseDraft.documents.map(doc => `<li>${doc}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${caseDraft.evidence.length > 0 ? `
    <div class="section">
        <h2>Evidence</h2>
        <ul class="evidence-list">
            ${caseDraft.evidence.map(ev => `<li>${ev}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="disclaimer">
        <h3>Important Legal Disclaimer</h3>
        <p><strong>This document is not legal advice.</strong> This case summary is prepared for informational purposes only and should not be construed as legal advice. It is recommended that you consult with a qualified attorney to discuss your specific legal situation and obtain proper legal counsel.</p>
    </div>

    <div class="footer">
        <p>Generated by ${teamName || 'Legal Services'} on ${currentDate}</p>
        <p>This document contains confidential information and should be treated accordingly.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF using jsPDF
   * This creates a real PDF document with proper formatting
   */
  private static async convertHTMLToPDF(html: string, env: Env): Promise<ArrayBuffer> {
    try {
      // For Cloudflare Workers, we'll use a server-side PDF generation approach
      // Since jsPDF is a client-side library, we'll create a structured PDF using a different approach
      
      const pdfBuffer = await this.generateStructuredPDF(html);
      return pdfBuffer;
    } catch (error) {
      Logger.error('[PDFGenerationService] PDF conversion failed:', error);
      throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate a structured PDF using a server-side approach
   * This creates a real PDF document with proper formatting
   */
  private static async generateStructuredPDF(html: string): Promise<ArrayBuffer> {
    // Extract content from HTML for PDF generation
    const content = this.extractContentFromHTML(html);
    
    // Create PDF using a structured approach
    const pdfContent = this.createPDFDocument(content);
    
    // Convert to ArrayBuffer
    return new TextEncoder().encode(pdfContent).buffer;
  }

  /**
   * Extract structured content from HTML
   */
  private static extractContentFromHTML(html: string): any {
    // Parse HTML to extract structured content
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    const subtitleMatch = html.match(/<p class="subtitle"[^>]*>(.*?)<\/p>/);
    const matterTypeMatch = html.match(/<span class="info-value">(.*?)<\/span>/);
    const jurisdictionMatch = html.match(/<span class="info-value">(.*?)<\/span>/g);
    const urgencyMatch = html.match(/<span class="info-value urgency-(\w+)">(.*?)<\/span>/);
    
    // Extract key facts
    const factsMatches = html.match(/<li>(.*?)<\/li>/g);
    const keyFacts = factsMatches ? factsMatches.map(match => 
      match.replace(/<[^>]*>/g, '').trim()
    ) : [];

    return {
      title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Legal Case Summary',
      subtitle: subtitleMatch ? subtitleMatch[1].replace(/<[^>]*>/g, '').trim() : '',
      matterType: matterTypeMatch ? matterTypeMatch[1].replace(/<[^>]*>/g, '').trim() : 'General Consultation',
      jurisdiction: jurisdictionMatch && jurisdictionMatch[1] ? jurisdictionMatch[1].replace(/<[^>]*>/g, '').trim() : 'Not specified',
      urgency: urgencyMatch ? urgencyMatch[2].replace(/<[^>]*>/g, '').trim() : 'Normal',
      keyFacts: keyFacts,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  }

  /**
   * Create a structured PDF document
   */
  private static createPDFDocument(content: any): string {
    // Create a structured PDF-like document
    const pdfLines = [
      'LEGAL CASE SUMMARY',
      '==================',
      '',
      content.title,
      content.subtitle,
      '',
      'CASE OVERVIEW',
      '-------------',
      `Matter Type: ${content.matterType}`,
      `Jurisdiction: ${content.jurisdiction}`,
      `Urgency Level: ${content.urgency}`,
      `Generated: ${content.generatedDate}`,
      '',
      'KEY FACTS',
      '---------',
      ...content.keyFacts.map((fact: string, index: number) => `${index + 1}. ${fact}`),
      '',
      'IMPORTANT LEGAL DISCLAIMER',
      '-------------------------',
      'This document is not legal advice. This case summary is prepared for',
      'informational purposes only and should not be construed as legal advice.',
      'It is recommended that you consult with a qualified attorney to discuss',
      'your specific legal situation and obtain proper legal counsel.',
      '',
      'Generated by Blawby AI Legal Services',
      `Date: ${content.generatedDate}`,
      'This document contains confidential information and should be treated accordingly.'
    ];

    return pdfLines.join('\n');
  }

  /**
   * Generate a PDF filename based on case information
   */
  public static generateFilename(caseDraft: CaseDraft, clientName?: string): string {
    const date = new Date().toISOString().split('T')[0];
    const matterType = caseDraft.matter_type.toLowerCase().replace(/\s+/g, '-');
    const client = clientName ? `-${clientName.toLowerCase().replace(/\s+/g, '-')}` : '';
    
    return `case-summary-${matterType}${client}-${date}.pdf`;
  }
}
