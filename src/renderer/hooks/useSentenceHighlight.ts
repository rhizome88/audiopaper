import { useCallback, useEffect } from 'react';
import type { SentenceLocation } from '../lib/sentence-extractor';

interface UseSentenceHighlightOptions {
  sentences: SentenceLocation[];
  currentSentenceIndex: number;
  textLayerRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
}

export function useSentenceHighlight({
  sentences,
  currentSentenceIndex,
  textLayerRefs,
}: UseSentenceHighlightOptions) {
  // Scroll PDF to the correct page when sentence changes
  useEffect(() => {
    if (currentSentenceIndex < 0 || currentSentenceIndex >= sentences.length) return;
    const sentence = sentences[currentSentenceIndex];
    if (sentence.spans.length === 0) return;

    const pageIndex = sentence.spans[0].pageIndex;
    const textLayerDiv = textLayerRefs.current.get(pageIndex);
    if (textLayerDiv) {
      textLayerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSentenceIndex, sentences, textLayerRefs]);

  // Find sentence index by page and item index
  const findSentenceBySpan = useCallback(
    (pageIndex: number, itemIndex: number): { sentenceIndex: number; wordIndex: number } => {
      for (let i = 0; i < sentences.length; i++) {
        for (let spanIdx = 0; spanIdx < sentences[i].spans.length; spanIdx++) {
          const span = sentences[i].spans[spanIdx];
          if (span.pageIndex === pageIndex && span.itemIndex === itemIndex) {
            const words = sentences[i].sentence.split(/\s+/).filter(w => w.length > 0);
            const wordIndex = Math.round((spanIdx / Math.max(sentences[i].spans.length - 1, 1)) * (words.length - 1));
            return { sentenceIndex: i, wordIndex: Math.max(0, wordIndex) };
          }
        }
      }
      // Fallback: closest on same page
      let bestMatch = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < sentences.length; i++) {
        for (const span of sentences[i].spans) {
          if (span.pageIndex === pageIndex) {
            const dist = Math.abs(span.itemIndex - itemIndex);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestMatch = i;
            }
          }
        }
      }
      return { sentenceIndex: bestMatch, wordIndex: 0 };
    },
    [sentences]
  );

  return {
    findSentenceBySpan,
  };
}
