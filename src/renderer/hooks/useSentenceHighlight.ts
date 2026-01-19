import { useCallback, useEffect, useRef } from 'react';
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
  const highlightSentence = useCallback(
    (index: number) => {
      // Remove all previous highlight overlays
      document.querySelectorAll('.sentence-highlight-overlay').forEach((el) => {
        el.remove();
      });

      if (index < 0 || index >= sentences.length) return;

      const sentence = sentences[index];
      if (sentence.spans.length === 0) return;

      // Find the vertical center of the sentence
      const firstSpan = sentence.spans[0];
      const textLayerDiv = textLayerRefs.current.get(firstSpan.pageIndex);
      if (!textLayerDiv) return;

      const textItems = textLayerDiv.querySelectorAll('.pdf-text-item');
      const firstItem = textItems[firstSpan.itemIndex] as HTMLElement;
      if (!firstItem) return;

      // Get the center Y position
      const itemTop = parseFloat(firstItem.style.top) || 0;
      const itemHeight = firstItem.offsetHeight || 20;
      const centerY = itemTop + itemHeight / 2;

      // Create a full-width gradient overlay
      const overlayHeight = 120; // Height of the highlight band
      const overlay = document.createElement('div');
      overlay.className = 'sentence-highlight-overlay';
      overlay.style.position = 'absolute';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.top = `${centerY - overlayHeight / 2}px`;
      overlay.style.height = `${overlayHeight}px`;
      overlay.style.background = `linear-gradient(
        to bottom,
        transparent 0%,
        rgba(253, 224, 71, 0.3) 20%,
        rgba(253, 224, 71, 0.4) 40%,
        rgba(253, 224, 71, 0.4) 60%,
        rgba(253, 224, 71, 0.3) 80%,
        transparent 100%
      )`;
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '0';
      overlay.style.transition = 'top 0.3s ease-out';

      textLayerDiv.appendChild(overlay);

      // Always scroll to center the highlighted area
      firstItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [sentences, textLayerRefs]
  );

  // Update highlight when sentence changes
  useEffect(() => {
    highlightSentence(currentSentenceIndex);
  }, [currentSentenceIndex, highlightSentence]);

  // Find sentence index and word index by page and item index
  const findSentenceBySpan = useCallback(
    (pageIndex: number, itemIndex: number): { sentenceIndex: number; wordIndex: number } => {
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        for (let spanIdx = 0; spanIdx < sentence.spans.length; spanIdx++) {
          const span = sentence.spans[spanIdx];
          if (span.pageIndex === pageIndex && span.itemIndex === itemIndex) {
            // Estimate word index based on span position within sentence
            // Each span roughly corresponds to a word or part of the text
            const words = sentence.sentence.split(/\s+/).filter(w => w.length > 0);
            const totalSpans = sentence.spans.length;
            const totalWords = words.length;

            // Estimate word index proportionally
            const wordIndex = Math.round((spanIdx / Math.max(totalSpans - 1, 1)) * (totalWords - 1));

            return { sentenceIndex: i, wordIndex: Math.max(0, wordIndex) };
          }
        }
      }
      return { sentenceIndex: -1, wordIndex: 0 };
    },
    [sentences]
  );

  return {
    highlightSentence,
    findSentenceBySpan,
  };
}
