export function chunkResponseText(response: string, maxChunkSize = 320): string[] {
  if (!response) {
    return [];
  }

  const normalized = response.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];

  paragraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) {
      if (index < paragraphs.length - 1) {
        chunks.push('\n\n');
      }
      return;
    }

    // More robust sentence splitting that avoids abbreviations, decimals, and URLs
    // First, protect common abbreviation patterns, decimals, and URLs
    const protectedText = trimmedParagraph
      .replace(/\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Ph\.D|U\.S\.A|U\.S|etc|vs|Inc|Corp|Ltd|Co|a\.m|p\.m)\./g, (match) => match.replace(/\./g, '§'))
      .replace(/\b\d+\.\d+/g, (match) => match.replace(/\./g, '§'))
      .replace(/\b\d+:\d+\s*(?:a\.m|p\.m)\./g, (match) => match.replace(/\./g, '§'))
      .replace(/https?:\/\/[^\s]+/g, (match) => match.replace(/\./g, '§'))
      .replace(/\b\w+@\w+\.\w+/g, (match) => match.replace(/\./g, '§'))
      .replace(/\bwww\.\w+\.\w+/g, (match) => match.replace(/\./g, '§'));
    
    // Split on sentence boundaries (punctuation followed by whitespace and capital letter, or end of string)
    const sentences = protectedText.match(/[^.!?]+[.!?]+(?=\s+[A-Z]|\s*$)/g) ?? [protectedText];
    
    // Restore the protected dots
    const restoredSentences = sentences.map(sentence => sentence.replace(/§/g, '.'));
    let buffer = '';

    for (const sentence of restoredSentences) {
      const sentenceText = sentence.trim();
      if (!sentenceText) continue;

      const candidate = buffer ? `${buffer} ${sentenceText}` : sentenceText;

      if (candidate.length > maxChunkSize && buffer) {
        chunks.push(buffer);
        buffer = sentenceText;
        continue;
      }

      if (candidate.length > maxChunkSize) {
        const words = sentenceText.split(/\s+/);
        let wordBuffer = buffer;

        for (const word of words) {
          const candidateWord = wordBuffer ? `${wordBuffer} ${word}` : word;

          if (candidateWord.length > maxChunkSize && wordBuffer) {
            chunks.push(wordBuffer);
            wordBuffer = word;
            continue;
          }

          if (candidateWord.length > maxChunkSize) {
            // Split long word into character-level substrings of maxChunkSize
            for (let i = 0; i < word.length; i += maxChunkSize) {
              const segment = word.slice(i, i + maxChunkSize);
              chunks.push(segment);
            }
            wordBuffer = '';
            continue;
          }

          wordBuffer = candidateWord;
        }

        buffer = wordBuffer;
        continue;
      }

      buffer = candidate;
    }

    if (buffer) {
      chunks.push(buffer);
    }

    if (index < paragraphs.length - 1) {
      chunks.push('\n\n');
    }
  });

  return chunks.filter(chunk => chunk.trim().length > 0 || chunk.includes('\n'));
}
