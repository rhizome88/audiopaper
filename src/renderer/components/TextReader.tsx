import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SentenceLocation } from '../lib/sentence-extractor';

interface TextReaderProps {
  sentences: SentenceLocation[] | { sentence: string; spans: unknown[] }[];
  currentSentenceIndex: number;
  currentWordIndex?: number;
  isPlaying?: boolean;
  onSentenceClick: (index: number) => void;
  onWordClick?: (sentenceIndex: number, wordIndex: number) => void;
  onTogglePlayback?: () => void;
  onScrollNavigate?: (index: number, progress: number) => void;
}

export function TextReader({
  sentences,
  currentSentenceIndex,
  currentWordIndex = 0,
  isPlaying = false,
  onSentenceClick,
  onWordClick,
  onTogglePlayback,
  onScrollNavigate,
}: TextReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [fontSize, setFontSize] = useState(18);
  const scrollProgressRef = useRef(0);

  const zoomIn = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const zoomOut = () => setFontSize((prev) => Math.max(prev - 2, 12));

  // Scroll-to-navigate: wheel events drive wave progress across sentences
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScrollNavigate || isPlaying) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Map scroll delta to progress change (tune sensitivity here)
      const sensitivity = 0.3; // % progress per pixel of scroll
      const delta = e.deltaY * sensitivity;

      scrollProgressRef.current += delta;

      if (scrollProgressRef.current > 100) {
        // Move to next sentence
        const nextIdx = Math.min(sentences.length - 1, currentSentenceIndex + 1);
        if (nextIdx !== currentSentenceIndex) {
          scrollProgressRef.current = 0;
          onScrollNavigate(nextIdx, 0);
        } else {
          scrollProgressRef.current = 100;
          onScrollNavigate(currentSentenceIndex, 100);
        }
      } else if (scrollProgressRef.current < 0) {
        // Move to previous sentence
        const prevIdx = Math.max(0, currentSentenceIndex - 1);
        if (prevIdx !== currentSentenceIndex) {
          scrollProgressRef.current = 100;
          onScrollNavigate(prevIdx, 100);
        } else {
          scrollProgressRef.current = 0;
          onScrollNavigate(currentSentenceIndex, 0);
        }
      } else {
        onScrollNavigate(currentSentenceIndex, scrollProgressRef.current);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [sentences.length, currentSentenceIndex, isPlaying, onScrollNavigate]);

  // Reset scroll progress when sentence changes externally (e.g. from audio)
  useEffect(() => {
    if (isPlaying) {
      scrollProgressRef.current = currentWordIndex;
    }
  }, [currentSentenceIndex, isPlaying, currentWordIndex]);

  // Always center the current sentence
  useEffect(() => {
    const sentenceEl = sentenceRefs.current.get(currentSentenceIndex);
    if (sentenceEl) {
      sentenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSentenceIndex]);

  if (sentences.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No text extracted
      </div>
    );
  }

  // Render sentence with clickable words and gradient wave
  const renderSentenceWithClickableWords = (sentenceText: string, sentenceIndex: number) => {
    const isCurrentSentence = sentenceIndex === currentSentenceIndex;
    const parts = sentenceText.split(/(\s+)/);
    let wordIdx = 0;

    const totalWords = parts.filter(p => !/^\s+$/.test(p) && p.length > 0).length;
    const position = currentWordIndex;
    const gradientWidth = 20;

    return (
      <span
        style={isCurrentSentence ? {
          background: `linear-gradient(
            90deg,
            transparent 0%,
            transparent ${Math.max(0, position - gradientWidth)}%,
            rgba(59, 130, 246, 0.15) ${Math.max(0, position - gradientWidth * 0.7)}%,
            rgba(59, 130, 246, 0.4) ${Math.max(0, position - gradientWidth * 0.3)}%,
            rgba(59, 130, 246, 0.6) ${position}%,
            rgba(59, 130, 246, 0.4) ${Math.min(100, position + gradientWidth * 0.3)}%,
            rgba(59, 130, 246, 0.15) ${Math.min(100, position + gradientWidth * 0.7)}%,
            transparent ${Math.min(100, position + gradientWidth)}%,
            transparent 100%
          )`,
        } : undefined}
      >
        {parts.map((part, partIdx) => {
          if (/^\s+$/.test(part)) {
            return <span key={partIdx}>{part}</span>;
          }
          if (part.length === 0) {
            return null;
          }

          const currentWordIdx = wordIdx;
          wordIdx++;

          return (
            <span
              key={partIdx}
              onClick={(e) => {
                e.stopPropagation();
                if (onWordClick) {
                  onWordClick(sentenceIndex, currentWordIdx);
                } else {
                  onSentenceClick(sentenceIndex);
                }
              }}
              className="cursor-pointer hover:underline decoration-blue-400"
            >
              {part}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="text-reader overflow-hidden h-full relative">
      {/* Zoom controls */}
      <div className="sticky top-0 right-0 z-10 flex justify-end p-2 bg-gradient-to-b from-white dark:from-gray-800 to-transparent">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 px-2 py-1">
          <button
            onClick={zoomOut}
            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
            title="Verkleinern"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-center">{fontSize}</span>
          <button
            onClick={zoomIn}
            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
            title="Vergrössern"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 pb-6 max-w-2xl mx-auto text-gray-900 dark:text-gray-100 leading-relaxed space-y-4" style={{ fontSize: `${fontSize}px` }}>
        {sentences.map((sentence, index) => {
          const sentenceText = 'sentence' in sentence ? sentence.sentence : '';
          const isCurrentSentence = index === currentSentenceIndex;

          return (
            <div
              key={index}
              data-sentence-index={index}
              ref={(el) => {
                if (el) sentenceRefs.current.set(index, el);
              }}
              onClick={() => onSentenceClick(index)}
              className={`cursor-pointer rounded-lg p-3 transition-all flex items-start gap-2 ${
                isCurrentSentence
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border-l-4 border-transparent'
              }`}
            >
              <div className="flex-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                  {index + 1}
                </span>
                {renderSentenceWithClickableWords(sentenceText, index)}
              </div>
              {isCurrentSentence && onTogglePlayback && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePlayback();
                  }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
