import React, { useEffect, useRef } from 'react';
import type { MarkdownBlock } from '../lib/markdown-parser';

interface MarkdownViewerProps {
  blocks: MarkdownBlock[];
  sentences: string[];
  currentSentenceIndex: number;
  currentWordIndex: number;
  onSentenceClick: (index: number) => void;
}

export function MarkdownViewer({
  blocks,
  sentences,
  currentSentenceIndex,
  currentWordIndex,
  onSentenceClick,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to current sentence
  useEffect(() => {
    const el = document.querySelector(`[data-sentence="${currentSentenceIndex}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const margin = 150;
      if (rect.top < margin || rect.bottom > viewportHeight - margin) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSentenceIndex]);

  // Render inline markdown (bold, italic, code, links)
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold
      let match = remaining.match(/^\*\*(.+?)\*\*/);
      if (match) {
        parts.push(<strong key={key++}>{renderInline(match[1])}</strong>);
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Italic
      match = remaining.match(/^\*(.+?)\*/);
      if (match) {
        parts.push(<em key={key++}>{renderInline(match[1])}</em>);
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Inline code
      match = remaining.match(/^`([^`]+)`/);
      if (match) {
        parts.push(<code key={key++}>{match[1]}</code>);
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Link
      match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        parts.push(
          <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer">
            {renderInline(match[1])}
          </a>
        );
        remaining = remaining.slice(match[0].length);
        continue;
      }

      // Regular character
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return parts;
  };

  // Render a sentence (no word highlighting on left side)
  const renderSentence = (sentenceIdx: number) => {
    if (sentenceIdx < 0 || sentenceIdx >= sentences.length) {
      return null;
    }

    const sentence = sentences[sentenceIdx];
    const isCurrentSentence = sentenceIdx === currentSentenceIndex;

    return (
      <span
        key={sentenceIdx}
        data-sentence={sentenceIdx}
        className={`md-sentence ${isCurrentSentence ? 'md-sentence-active' : ''}`}
        onClick={() => onSentenceClick(sentenceIdx)}
      >
        {sentence}
        {' '}
      </span>
    );
  };

  let globalSentenceIdx = 0;

  return (
    <div ref={containerRef} className="p-8 md:p-12 markdown-content">
      {blocks.map((block, blockIdx) => {
        switch (block.type) {
          case 'header': {
            const level = block.level || 1;
            const content = renderInline(block.content || '');
            if (level === 1) return <h1 key={blockIdx}>{content}</h1>;
            if (level === 2) return <h2 key={blockIdx}>{content}</h2>;
            if (level === 3) return <h3 key={blockIdx}>{content}</h3>;
            if (level === 4) return <h4 key={blockIdx}>{content}</h4>;
            if (level === 5) return <h5 key={blockIdx}>{content}</h5>;
            return <h6 key={blockIdx}>{content}</h6>;
          }

          case 'paragraph': {
            const startIdx = globalSentenceIdx;
            const count = block.sentences?.length || 0;
            globalSentenceIdx += count;
            return (
              <p key={blockIdx}>
                {Array.from({ length: count }, (_, i) => renderSentence(startIdx + i))}
              </p>
            );
          }

          case 'code':
            return (
              <pre key={blockIdx}>
                <code>{block.content}</code>
              </pre>
            );

          case 'blockquote': {
            const startIdx = globalSentenceIdx;
            const count = block.sentences?.length || 0;
            globalSentenceIdx += count;
            return (
              <blockquote key={blockIdx}>
                {Array.from({ length: count }, (_, i) => renderSentence(startIdx + i))}
              </blockquote>
            );
          }

          case 'ul': {
            const items = block.items || [];
            return (
              <ul key={blockIdx}>
                {items.map((item, itemIdx) => {
                  const itemSentences = item
                    .replace(/\*\*([^*]+)\*\*/g, '$1')
                    .replace(/\*([^*]+)\*/g, '$1')
                    .replace(/`([^`]+)`/g, '$1')
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                    .split(/(?<=[.!?])\s+/)
                    .filter((s) => s.trim().length > 0);
                  const count = itemSentences.length || 1;
                  const startIdx = globalSentenceIdx;
                  globalSentenceIdx += count;
                  return (
                    <li key={itemIdx}>
                      {count > 0
                        ? Array.from({ length: count }, (_, i) => renderSentence(startIdx + i))
                        : renderInline(item)}
                    </li>
                  );
                })}
              </ul>
            );
          }

          case 'ol': {
            const items = block.items || [];
            return (
              <ol key={blockIdx}>
                {items.map((item, itemIdx) => {
                  const itemSentences = item
                    .replace(/\*\*([^*]+)\*\*/g, '$1')
                    .replace(/\*([^*]+)\*/g, '$1')
                    .replace(/`([^`]+)`/g, '$1')
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                    .split(/(?<=[.!?])\s+/)
                    .filter((s) => s.trim().length > 0);
                  const count = itemSentences.length || 1;
                  const startIdx = globalSentenceIdx;
                  globalSentenceIdx += count;
                  return (
                    <li key={itemIdx}>
                      {count > 0
                        ? Array.from({ length: count }, (_, i) => renderSentence(startIdx + i))
                        : renderInline(item)}
                    </li>
                  );
                })}
              </ol>
            );
          }

          case 'hr':
            return <hr key={blockIdx} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
