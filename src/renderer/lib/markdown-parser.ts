// Markdown Block Types
export interface MarkdownBlock {
  type: 'header' | 'paragraph' | 'code' | 'blockquote' | 'ul' | 'ol' | 'hr';
  level?: number;
  content?: string;
  items?: string[];
  sentences?: string[];
}

// Extract sentences from text, removing markdown formatting
function extractSentences(text: string): string[] {
  // Remove markdown formatting for TTS
  const plain = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

  if (!plain) return [];

  return plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Parse markdown into structured blocks with sentences
export function parseMarkdownToBlocks(md: string): { blocks: MarkdownBlock[]; allSentences: string[] } {
  const lines = md.split('\n');
  const blocks: MarkdownBlock[] = [];
  const allSentences: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'code', content: code.trimEnd() });
      i++;
      continue;
    }

    // Header
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({ type: 'header', level: headerMatch[1].length, content: headerMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      let quote = '';
      while (i < lines.length && lines[i].startsWith('>')) {
        quote += lines[i].replace(/^>\s?/, '') + ' ';
        i++;
      }
      const content = quote.trim();
      const sentences = extractSentences(content);
      sentences.forEach((s) => allSentences.push(s));
      blocks.push({ type: 'blockquote', content, sentences });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      const blockSentences: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^[-*+]\s+/, '');
        items.push(item);
        const sentences = extractSentences(item);
        sentences.forEach((s) => {
          allSentences.push(s);
          blockSentences.push(s);
        });
        i++;
      }
      blocks.push({ type: 'ul', items, sentences: blockSentences });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      const blockSentences: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\d+\.\s+/, '');
        items.push(item);
        const sentences = extractSentences(item);
        sentences.forEach((s) => {
          allSentences.push(s);
          blockSentences.push(s);
        });
        i++;
      }
      blocks.push({ type: 'ol', items, sentences: blockSentences });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    let para = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para += ' ' + lines[i];
      i++;
    }
    const sentences = extractSentences(para);
    sentences.forEach((s) => allSentences.push(s));
    blocks.push({ type: 'paragraph', content: para, sentences });
  }

  return { blocks, allSentences };
}
