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

    const sentences = trimmedParagraph.match(/[^.!?]+[.!?]?/g) ?? [trimmedParagraph];
    let buffer = '';

    for (const sentence of sentences) {
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
            chunks.push(word);
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
