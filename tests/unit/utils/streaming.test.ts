import { describe, it, expect } from 'vitest';
import { chunkResponseText } from '../../../worker/utils/streaming.js';

describe('chunkResponseText', () => {
  describe('sentence splitting improvements', () => {
    it('should handle abbreviations correctly', () => {
      const text = 'Dr. Smith visited the U.S.A. yesterday. He met with Mr. Johnson at 3:30 p.m.';
      const chunks = chunkResponseText(text, 100);
      
      // Should not split on abbreviations
      expect(chunks.some(chunk => chunk.includes('Dr. Smith'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('U.S.A.'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('Mr. Johnson'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('3:30 p.m.'))).toBe(true);
    });

    it('should handle decimal numbers correctly', () => {
      const text = 'The price is $19.99. The temperature was 25.5°C. The version is 2.1.3.';
      const chunks = chunkResponseText(text, 100);
      
      // Should not split on decimal points
      expect(chunks.some(chunk => chunk.includes('$19.99'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('25.5°C'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('2.1.3'))).toBe(true);
    });

    it('should handle URLs and domains correctly', () => {
      const text = 'Visit https://example.com for more info. Check out www.test.org. Email us at user@domain.co.uk.';
      const chunks = chunkResponseText(text, 100);
      
      // Should not split on dots in URLs/domains
      expect(chunks.some(chunk => chunk.includes('https://example.com'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('www.test.org'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('user@domain.co.uk'))).toBe(true);
    });

    it('should handle mixed content with abbreviations, decimals, and URLs', () => {
      const text = 'Dr. Smith (Ph.D.) visited https://example.com at 2:30 p.m. The cost was $19.99.';
      const chunks = chunkResponseText(text, 100);
      
      // Should preserve all special cases
      expect(chunks.some(chunk => chunk.includes('Dr. Smith (Ph.D.)'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('https://example.com'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('2:30 p.m.'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('$19.99'))).toBe(true);
    });

    it('should still split on proper sentence boundaries', () => {
      const text = 'This is sentence one. This is sentence two! This is sentence three?';
      const chunks = chunkResponseText(text, 50);
      
      // Should split into separate sentences
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.some(chunk => chunk.includes('sentence one'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('sentence two'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('sentence three'))).toBe(true);
    });

    it('should handle edge cases with punctuation', () => {
      const text = 'No punctuation here. Multiple!!! Question marks??? Ellipsis...';
      const chunks = chunkResponseText(text, 50);
      
      // Should handle multiple punctuation marks
      expect(chunks.some(chunk => chunk.includes('Multiple!!!'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('Question marks???'))).toBe(true);
      expect(chunks.some(chunk => chunk.includes('Ellipsis...'))).toBe(true);
    });

    it('should handle empty and whitespace-only text', () => {
      expect(chunkResponseText('')).toEqual([]);
      expect(chunkResponseText('   ')).toEqual([]);
      expect(chunkResponseText('\n\n')).toEqual([]);
    });

    it('should handle text without sentence-ending punctuation', () => {
      const text = 'This is a single sentence without ending punctuation';
      const chunks = chunkResponseText(text, 50);
      
      // Should return the entire text as one chunk
      expect(chunks).toEqual([text]);
    });

    it('should preserve paragraph structure', () => {
      const text = 'First paragraph.\n\nSecond paragraph with Dr. Smith.';
      const chunks = chunkResponseText(text, 50);
      
      // Should preserve paragraph breaks
      expect(chunks.some(chunk => chunk.includes('\n\n'))).toBe(true);
    });
  });

  describe('chunking behavior', () => {
    it('should respect maxChunkSize', () => {
      const text = 'This is a very long sentence that should be split into multiple chunks when the maximum chunk size is exceeded.';
      const chunks = chunkResponseText(text, 30);
      
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(30);
      });
    });

    it('should handle very long words', () => {
      const text = 'This is a sentence with a verylongwordthatexceedsthemaximumchunksize.';
      const chunks = chunkResponseText(text, 20);
      
      // Should split even long words if necessary
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(20);
      });
    });

    it('should maintain word boundaries when possible', () => {
      const text = 'This is a sentence that should be split at word boundaries when possible.';
      const chunks = chunkResponseText(text, 25);
      
      // Most chunks should end at word boundaries
      const wordBoundaryChunks = chunks.filter(chunk => 
        chunk.endsWith(' ') || chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')
      );
      expect(wordBoundaryChunks.length).toBeGreaterThan(chunks.length / 2);
    });
  });
});
