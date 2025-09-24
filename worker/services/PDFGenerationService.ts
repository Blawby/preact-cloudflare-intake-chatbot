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
  public static initialize(env: Env) {
    Logger.info(`[PDFGenerationService] Initialized - using local pdf-lib for PDF generation`);
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
      const pdfBuffer = await this.convertHTMLToPDF(html, options, env);
      
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
   * Escape HTML special characters to prevent XSS
   */
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate HTML content for the case summary
   */
  private static generateHTML(options: PDFGenerationOptions): string {
    const { caseDraft, clientName, teamName, teamBrandColor } = options;
    const brandColor = teamBrandColor || '#334e68'; // Use your app's primary-700 color as default
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Escape all user-provided strings
    const escapedClientName = clientName ? this.escapeHtml(clientName) : '';
    const escapedTeamName = teamName ? this.escapeHtml(teamName) : '';
    const escapedMatterType = this.escapeHtml(caseDraft.matter_type);
    const escapedJurisdiction = this.escapeHtml(caseDraft.jurisdiction);
    const escapedUrgency = this.escapeHtml(caseDraft.urgency);
    const escapedStatus = this.escapeHtml(caseDraft.status);
    const escapedTimeline = caseDraft.timeline ? this.escapeHtml(caseDraft.timeline) : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Summary - ${escapedMatterType}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 1.5rem;
            background-color: #ffffff;
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
            color: #6b7280;
            margin: 0.5rem 0 0 0;
            font-size: 1rem;
        }
        
        .case-info {
            background-color: #f9fafb;
            padding: 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 2rem;
            border-left: 4px solid ${brandColor};
        }
        
        .case-info h2 {
            color: ${brandColor};
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }
        
        .info-value {
            color: #1a1a1a;
            font-size: 1rem;
        }
        
        .section {
            margin-bottom: 2rem;
        }
        
        .section h2 {
            color: ${brandColor};
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.75rem;
            margin-bottom: 1.25rem;
            font-size: 1.25rem;
        }
        
        .facts-list {
            list-style: none;
            padding: 0;
        }
        
        .facts-list li {
            background-color: #f9fafb;
            margin-bottom: 0.75rem;
            padding: 1rem;
            border-radius: 0.5rem;
            border-left: 3px solid ${brandColor};
        }
        
        .parties-list {
            list-style: none;
            padding: 0;
        }
        
        .parties-list li {
            background-color: #f9fafb;
            margin-bottom: 0.75rem;
            padding: 1rem;
            border-radius: 0.5rem;
            border-left: 3px solid ${brandColor};
        }
        
        .documents-list, .evidence-list {
            list-style: none;
            padding: 0;
        }
        
        .documents-list li, .evidence-list li {
            background-color: #f0fdf4;
            margin-bottom: 0.5rem;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            border-left: 3px solid #10b981;
        }
        
        .urgency-high {
            color: #dc2626;
            font-weight: 600;
        }
        
        .urgency-medium {
            color: #d97706;
            font-weight: 600;
        }
        
        .urgency-low {
            color: #059669;
            font-weight: 600;
        }
        
        .disclaimer {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 2rem;
            font-size: 0.875rem;
            color: #92400e;
        }
        
        .disclaimer h3 {
            margin: 0 0 0.75rem 0;
            color: #92400e;
            font-size: 1rem;
        }
        
        .footer {
            margin-top: 2.5rem;
            padding-top: 1.25rem;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Legal Case Summary</h1>
        <p class="subtitle">${escapedTeamName || 'Legal Services'} • Generated on ${currentDate}</p>
    </div>

    <div class="case-info">
        <h2>Case Overview</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Matter Type</span>
                <span class="info-value">${escapedMatterType}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Jurisdiction</span>
                <span class="info-value">${escapedJurisdiction}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Urgency Level</span>
                <span class="info-value urgency-${escapedUrgency}">${escapedUrgency.toUpperCase()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">${escapedStatus.toUpperCase()}</span>
            </div>
        </div>
        ${escapedClientName ? `
        <div class="info-item" style="margin-top: 15px;">
            <span class="info-label">Client</span>
            <span class="info-value">${escapedClientName}</span>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2>Key Facts</h2>
        <ul class="facts-list">
            ${caseDraft.key_facts.map(fact => `<li>${this.escapeHtml(fact)}</li>`).join('')}
        </ul>
    </div>

    ${escapedTimeline ? `
    <div class="section">
        <h2>Timeline</h2>
        <p>${escapedTimeline}</p>
    </div>
    ` : ''}

    ${caseDraft.parties.length > 0 ? `
    <div class="section">
        <h2>Parties Involved</h2>
        <ul class="parties-list">
            ${caseDraft.parties.map(party => `
                <li>
                    <strong>${this.escapeHtml(party.role)}:</strong> ${party.name ? this.escapeHtml(party.name) : 'Name not provided'}
                    ${party.relationship ? ` (${this.escapeHtml(party.relationship)})` : ''}
                </li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    ${caseDraft.documents.length > 0 ? `
    <div class="section">
        <h2>Available Documents</h2>
        <ul class="documents-list">
            ${caseDraft.documents.map(doc => `<li>${this.escapeHtml(doc)}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${caseDraft.evidence.length > 0 ? `
    <div class="section">
        <h2>Evidence</h2>
        <ul class="evidence-list">
            ${caseDraft.evidence.map(ev => `<li>${this.escapeHtml(ev)}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="disclaimer">
        <h3>Important Legal Disclaimer</h3>
        <p><strong>This document is not legal advice.</strong> This case summary is prepared for informational purposes only and should not be construed as legal advice. It is recommended that you consult with a qualified attorney to discuss your specific legal situation and obtain proper legal counsel.</p>
    </div>

    <div class="footer">
        <p>Generated by ${escapedTeamName || 'Legal Services'} on ${currentDate}</p>
        <p>This document contains confidential information and should be treated accordingly.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF using pdf-lib
   * This creates a real PDF document with proper formatting
   */
  private static async convertHTMLToPDF(html: string, options: PDFGenerationOptions, env: Env): Promise<ArrayBuffer> {
    try {
      // Import pdf-lib dynamically for Cloudflare Workers compatibility
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Add a page
      let page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      
      // Extract content from structured data for PDF generation
      const content = this.extractContentFromOptions(options);
      
      // Add fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Set up text styling
      const fontSize = 12;
      const lineHeight = fontSize * 1.2;
      let yPosition = height - 50; // Start from top with margin
      
      // Helper function to check if we need a new page and add one if needed
      const checkPageOverflow = (requiredSpace: number = 20) => {
        if (yPosition < requiredSpace + 50) {
          // Add a new page and reset position
          const newPage = pdfDoc.addPage([612, 792]);
          page = newPage; // Update page reference
          yPosition = height - 50; // Reset to top of new page
          Logger.info('[PDFGenerationService] Added new page due to content overflow');
          return false; // Content can continue on new page
        }
        return false;
      };

      // Helper function to add section headers with overflow protection
      const addSectionHeader = (title: string) => {
        checkPageOverflow(30); // Need more space for headers (will add new page if needed)
        addText(title, boldFont, 14, rgb(0.2, 0.2, 0.2));
        yPosition -= 10;
        return true;
      };

      // Helper function to add text with word wrapping and page overflow protection
      const addText = (text: string, font: any, size: number, color: any, maxWidth?: number) => {
        // Check for page overflow before adding text (will add new page if needed)
        checkPageOverflow();

        if (maxWidth) {
          const words = text.split(' ');
          let line = '';
          let currentY = yPosition;
          
          for (const word of words) {
            const testLine = line + (line ? ' ' : '') + word;
            const textWidth = font.widthOfTextAtSize(testLine, size);
            
            if (textWidth > maxWidth && line) {
              // Check if we have space for this line (will add new page if needed)
              checkPageOverflow();
              
              page.drawText(line, {
                x: 50,
                y: currentY,
                size,
                font,
                color,
              });
              line = word;
              currentY -= lineHeight;
            } else {
              line = testLine;
            }
          }
          
          if (line) {
            // Check for page overflow before drawing final line (will add new page if needed)
            checkPageOverflow();
            page.drawText(line, {
              x: 50,
              y: currentY,
              size,
              font,
              color,
            });
            yPosition = currentY - lineHeight;
          }
        } else {
          page.drawText(text, {
            x: 50,
            y: yPosition,
            size,
            font,
            color,
          });
          yPosition -= lineHeight;
        }
      };
      
      // Add title
      addText(content.title, boldFont, 18, rgb(0.2, 0.2, 0.2));
      yPosition -= 10;
      
      // Add subtitle
      if (content.subtitle) {
        addText(content.subtitle, font, 12, rgb(0.4, 0.4, 0.4));
        yPosition -= 20;
      }
      
      // Add case overview section
      addSectionHeader('CASE OVERVIEW');
      
      addText(`Matter Type: ${content.matterType}`, font, fontSize, rgb(0, 0, 0), width - 100);
      addText(`Jurisdiction: ${content.jurisdiction}`, font, fontSize, rgb(0, 0, 0), width - 100);
      addText(`Urgency Level: ${content.urgency}`, font, fontSize, rgb(0, 0, 0), width - 100);
      addText(`Generated: ${content.generatedDate}`, font, fontSize, rgb(0, 0, 0), width - 100);
      yPosition -= 20;
      
      // Add key facts section
      if (content.keyFacts && content.keyFacts.length > 0) {
        addSectionHeader('KEY FACTS');
        content.keyFacts.forEach((fact: string, index: number) => {
          addText(`${index + 1}. ${fact}`, font, fontSize, rgb(0, 0, 0), width - 100);
        });
        yPosition -= 20;
      }

      // Add timeline section
      if (content.timeline) {
        addSectionHeader('TIMELINE');
        addText(content.timeline, font, fontSize, rgb(0, 0, 0), width - 100);
        yPosition -= 20;
      }

      // Add parties section
      if (content.parties && content.parties.length > 0) {
        addSectionHeader('PARTIES INVOLVED');
        content.parties.forEach((party: any, index: number) => {
          const partyText = `${party.role}: ${party.name || 'Name not provided'}${party.relationship ? ` (${party.relationship})` : ''}`;
          addText(partyText, font, fontSize, rgb(0, 0, 0), width - 100);
        });
        yPosition -= 20;
      }

      // Add documents section
      if (content.documents && content.documents.length > 0) {
        addSectionHeader('AVAILABLE DOCUMENTS');
        content.documents.forEach((doc: string, index: number) => {
          addText(`• ${doc}`, font, fontSize, rgb(0, 0, 0), width - 100);
        });
        yPosition -= 20;
      }

      // Add evidence section
      if (content.evidence && content.evidence.length > 0) {
        addSectionHeader('EVIDENCE');
        content.evidence.forEach((ev: string, index: number) => {
          addText(`• ${ev}`, font, fontSize, rgb(0, 0, 0), width - 100);
        });
        yPosition -= 20;
      }
      
      // Add disclaimer
      addSectionHeader('IMPORTANT LEGAL DISCLAIMER');
      const disclaimerText = 'This document is not legal advice. This case summary is prepared for informational purposes only and should not be construed as legal advice. It is recommended that you consult with a qualified attorney to discuss your specific legal situation and obtain proper legal counsel.';
      addText(disclaimerText, font, fontSize, rgb(0, 0, 0), width - 100);
      yPosition -= 30;
      
      // Add footer with overflow protection
      if (!checkPageOverflow(40)) { // Need space for 3 lines of footer
        addText(`Generated by ${content.teamName || 'Legal Services'}`, font, 10, rgb(0.4, 0.4, 0.4));
        addText(`Date: ${content.generatedDate}`, font, 10, rgb(0.4, 0.4, 0.4));
        addText('This document contains confidential information and should be treated accordingly.', font, 10, rgb(0.4, 0.4, 0.4));
      }
      
      // Serialize the PDF to bytes
      const pdfBytes = await pdfDoc.save();
      return pdfBytes.buffer as ArrayBuffer;
      
    } catch (error) {
      Logger.error('[PDFGenerationService] PDF conversion failed:', error);
      throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }


  /**
   * Extract structured content from options (more reliable than HTML parsing)
   */
  private static extractContentFromOptions(options: PDFGenerationOptions): any {
    const { caseDraft, clientName, teamName } = options;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      title: 'Legal Case Summary',
      subtitle: `${teamName || 'Legal Services'} • Generated on ${currentDate}`,
      matterType: caseDraft.matter_type || 'General Consultation',
      jurisdiction: caseDraft.jurisdiction || 'Not specified',
      urgency: caseDraft.urgency || 'Normal',
      keyFacts: caseDraft.key_facts || [],
      timeline: caseDraft.timeline,
      parties: caseDraft.parties || [],
      documents: caseDraft.documents || [],
      evidence: caseDraft.evidence || [],
      clientName: clientName,
      teamName: teamName,
      generatedDate: currentDate
    };
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
