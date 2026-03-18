// Types for PDF text extraction
export interface TextSpan {
  text: string;
  pageIndex: number;
  itemIndex: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface SentenceLocation {
  sentence: string;
  spans: { pageIndex: number; itemIndex: number; startChar: number; endChar: number; bbox?: { x: number; y: number; width: number; height: number } }[];
}

export interface OCRTextItem {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
}

// Extract sentences with location info from text spans
export function extractSentencesWithLocations(textSpans: TextSpan[]): SentenceLocation[] {
  // Join all text and split into sentences
  const fullText = textSpans.map((s) => s.text).join(' ');
  const cleanedText = fullText.replace(/\s+/g, ' ').replace(/- /g, '').trim();
  const sentenceTexts = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Map sentences back to text spans
  const sentenceLocations: SentenceLocation[] = [];
  let currentSpanIndex = 0;
  let currentCharInSpan = 0;

  for (const sentenceText of sentenceTexts) {
    const spans: SentenceLocation['spans'] = [];
    let remainingSentence = sentenceText.replace(/\s+/g, ' ');
    let searchPos = 0;

    while (searchPos < remainingSentence.length && currentSpanIndex < textSpans.length) {
      const span = textSpans[currentSpanIndex];
      const spanText = span.text;
      const availableText = spanText.slice(currentCharInSpan);

      let matchLength = 0;
      let sentencePos = searchPos;
      let spanPos = 0;

      while (sentencePos < remainingSentence.length && spanPos < availableText.length) {
        const sentenceChar = remainingSentence[sentencePos];
        const spanChar = availableText[spanPos];

        if (sentenceChar === spanChar) {
          matchLength++;
          sentencePos++;
          spanPos++;
        } else if (sentenceChar === ' ' && spanPos === 0) {
          sentencePos++;
        } else if (spanChar === ' ' && sentenceChar !== ' ') {
          spanPos++;
        } else {
          break;
        }
      }

      if (matchLength > 0 || spanPos > 0) {
        spans.push({
          pageIndex: span.pageIndex,
          itemIndex: span.itemIndex,
          startChar: currentCharInSpan,
          endChar: currentCharInSpan + spanPos,
          bbox: span.bbox,
        });

        currentCharInSpan += spanPos;
        searchPos = sentencePos;

        if (currentCharInSpan >= spanText.length) {
          currentSpanIndex++;
          currentCharInSpan = 0;
        }
      } else {
        currentSpanIndex++;
        currentCharInSpan = 0;
      }
    }

    sentenceLocations.push({
      sentence: sentenceText,
      spans,
    });
  }

  return sentenceLocations;
}
