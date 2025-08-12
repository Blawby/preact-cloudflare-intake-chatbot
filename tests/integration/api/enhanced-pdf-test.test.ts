import { describe, it, expect } from 'vitest';
import { extractPdfText } from '../../../worker/lib/pdf.js';

describe('Enhanced PDF Processing Test', () => {
  it('should handle PDF with text content properly', async () => {
    // Create a simple PDF-like content with text
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
      /Resources <<
      /Font <<
      /F1 4 0 R
      >>
      >>
      /MediaBox [0 0 612 792]
      /Contents 5 0 R
      >>
      endobj
      
      4 0 obj
      <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica
      >>
      endobj
      
      5 0 obj
      <<
      /Length 100
      >>
      stream
      BT
      /F1 12 Tf
      72 720 Td
      (PAUL CHRIS LUKE - Software Engineer Resume) Tj
      ET
      endstream
      endobj
      
      xref
      0 6
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000256 00000 n 
      0000000320 00000 n 
      trailer
      <<
      /Size 6
      /Root 1 0 R
      >>
      startxref
      389
      %%EOF
    `;
    
    const pdfBuffer = new TextEncoder().encode(pdfContent);
    const arrayBuffer = pdfBuffer.buffer;
    
    const result = await extractPdfText(arrayBuffer);
    
    expect(result).toBeDefined();
    expect(result.pages).toBeDefined();
    expect(result.fullText).toBeDefined();
    expect(result.pages.length).toBeGreaterThan(0);
    
    console.log('Enhanced PDF extraction result:', {
      pages: result.pages.length,
      fullTextLength: result.fullText.length,
      sampleText: result.fullText.substring(0, 100)
    });
    
    // Should extract some text content
    expect(result.fullText.length).toBeGreaterThan(10);
  });

  it('should handle problematic PDF content gracefully', async () => {
    // Create problematic PDF content that might cause [object Object]
    const problematicContent = `
      %PDF-1.4
      (Some text content here)
      [object Object]
      (More text content)
      BT ET
    `;
    
    const pdfBuffer = new TextEncoder().encode(problematicContent);
    const arrayBuffer = pdfBuffer.buffer;
    
    const result = await extractPdfText(arrayBuffer);
    
    expect(result).toBeDefined();
    expect(result.fullText).toBeDefined();
    
    // Should not contain [object Object]
    expect(result.fullText).not.toContain('[object Object]');
    
    console.log('Problematic PDF handling result:', {
      fullTextLength: result.fullText.length,
      sampleText: result.fullText.substring(0, 100)
    });
  });

  it('should handle empty or minimal PDF content', async () => {
    const minimalContent = '%PDF-1.4\n%%EOF';
    const pdfBuffer = new TextEncoder().encode(minimalContent);
    const arrayBuffer = pdfBuffer.buffer;
    
    const result = await extractPdfText(arrayBuffer);
    
    expect(result).toBeDefined();
    expect(result.fullText).toBeDefined();
    
    console.log('Minimal PDF handling result:', {
      fullTextLength: result.fullText.length,
      sampleText: result.fullText
    });
  });
});
