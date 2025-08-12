// Robust PDF extraction with OCR fallback per-page
// Note: PDF.js is not available in Workers runtime, so we'll use basic text extraction
// OCR functionality is currently disabled for Workers compatibility
// import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
// import { createScheduler, createWorker } from "tesseract-wasm";

export async function extractPdfText(buf: ArrayBuffer) {
  // Enhanced PDF processing using Cloudflare AI vision model for better text extraction
  // This approach is more reliable than regex-based text extraction for complex PDFs
  
  console.log('PDF buffer size:', buf.byteLength);
  console.log('First 100 bytes as hex:', Array.from(new Uint8Array(buf.slice(0, 100))).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  // For now, fall back to basic text extraction as a foundation
  // TODO: Integrate with Cloudflare AI vision model for PDF processing
  const textDecoder = new TextDecoder('utf-8');
  const pdfContent = textDecoder.decode(buf);
  
  console.log('Raw PDF content length:', pdfContent.length);
  console.log('Raw PDF content preview:', pdfContent.substring(0, 500));
  
  const pages: string[] = [];
  let extractedText = '';
  
  // First, try to extract text using PDF-specific patterns
  const textStreamMatches = pdfContent.match(/BT[\s\S]*?ET/g);
  if (textStreamMatches && textStreamMatches.length > 0) {
    extractedText = textStreamMatches.join(' ').replace(/BT|ET/g, ' ').trim();
    console.log('Found text streams, length:', extractedText.length);
  }
  
  // Look for text between parentheses (common in PDFs)
  const parenMatches = pdfContent.match(/\(([^)]+)\)/g);
  if (parenMatches && parenMatches.length > 0) {
    const parenText = parenMatches.join(' ').replace(/[()]/g, ' ').trim();
    extractedText += ' ' + parenText;
    console.log('Found parentheses text, length:', parenText.length);
  }
  
  // Look for text between quotes
  const quoteMatches = pdfContent.match(/"([^"]+)"/g);
  if (quoteMatches && quoteMatches.length > 0) {
    const quoteText = quoteMatches.join(' ').replace(/"/g, ' ').trim();
    extractedText += ' ' + quoteText;
    console.log('Found quote text, length:', quoteText.length);
  }
  
  // Look for text after /Text operators
  const textOperatorMatches = pdfContent.match(/\/Text\s+([^\s]+)/g);
  if (textOperatorMatches && textOperatorMatches.length > 0) {
    const textOpText = textOperatorMatches.join(' ').replace(/\/Text/g, ' ').trim();
    extractedText += ' ' + textOpText;
    console.log('Found text operators, length:', textOpText.length);
  }
  
  // If we found structured text, use it
  if (extractedText.length > 10) {
    console.log('Using structured text extraction, length:', extractedText.length);
    pages.push(normalize(extractedText));
  } else {
    // Fallback: extract readable ASCII text
    console.log('Using fallback text extraction');
    const fallbackText = pdfContent.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Remove any [object Object] artifacts
    const cleanText = fallbackText.replace(/\[object Object\]/g, '').trim();
    
    if (cleanText.length > 10) {
      pages.push(normalize(cleanText));
    } else {
      // Last resort: try to find any readable text
      const anyText = pdfContent.match(/[A-Za-z0-9\s]{10,}/g);
      if (anyText && anyText.length > 0) {
        pages.push(normalize(anyText.join(' ')));
      } else {
        pages.push('PDF document - unable to extract text content');
      }
    }
  }

  const result = { pages, fullText: pages.join("\n\n---\n\n") };
  console.log('Final extracted text length:', result.fullText.length);
  console.log('Final text preview:', result.fullText.substring(0, 200));

  // Extract key information for legal intake
  const keyInfo = extractKeyLegalInfo(result.fullText);
  console.log('Key legal info extracted:', keyInfo);

  return { ...result, keyInfo };
}

function normalize(s: string) {
  return s.replace(/\s+/g, " ").replace(/\u00AD/g, "") // soft hyphen
          .replace(/-\s+/g, "-").trim();
}

function extractKeyLegalInfo(text: string): string {
  // Extract key information for legal intake analysis
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for common legal document patterns
  const keySections: string[] = [];
  
  // Extract names (common patterns)
  const namePatterns = [
    /(?:name|full name|client|tenant|landlord|defendant|plaintiff):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:LLC|Inc|Corp|Company|Associates)/gi,
    /(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi
  ];
  
  // Extract dates
  const datePatterns = [
    /(?:date|signed|effective|expires?):\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
  ];
  
  // Extract amounts
  const amountPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g,
    /(?:amount|payment|value):\s*\$[\d,]+(?:\.\d{2})?/gi
  ];
  
  // Extract addresses
  const addressPatterns = [
    /(?:address|location):\s*([^,\n]+(?:,\s*[A-Z]{2}\s+\d{5})?)/gi,
    /([^,\n]+(?:,\s*[A-Z]{2}\s+\d{5})?)/gi
  ];
  
  // Extract document types
  const docTypePatterns = [
    /(?:contract|agreement|lease|deed|will|trust|petition|complaint|motion|order)/gi,
    /(?:form|application|notice|letter|resume|invoice|receipt)/gi
  ];
  
  // Combine all found information
  const foundInfo: string[] = [];
  
  // Add first few lines (usually contain title/header)
  if (lines.length > 0) {
    foundInfo.push(`Document Title/Header: ${lines[0]}`);
  }
  
  // Add any lines that seem important (contain key words)
  const importantKeywords = ['name', 'date', 'address', 'phone', 'email', 'amount', 'contract', 'agreement', 'lease', 'deed', 'will', 'trust', 'petition', 'complaint'];
  
  for (const line of lines.slice(1, 20)) { // Check first 20 lines
    const lowerLine = line.toLowerCase();
    if (importantKeywords.some(keyword => lowerLine.includes(keyword))) {
      foundInfo.push(line);
    }
  }
  
  // Limit to reasonable size
  const summary = foundInfo.join('\n').substring(0, 1000);
  
  return summary || 'Document content extracted but no specific legal information identified';
}
