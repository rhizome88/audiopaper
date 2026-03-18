import React, { useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import type { OCRTextItem } from '../lib/sentence-extractor';

interface PDFViewerProps {
  pdfDoc: PDFDocumentProxy | null;
  scale: number;
  ocrTextItems?: Map<number, OCRTextItem[]>;
  isOCR?: boolean;
  onTextLayerRefsReady: (refs: Map<number, HTMLDivElement>) => void;
  onTextClick?: (pageIndex: number, itemIndex: number, clickedText?: string) => void;
}

export function PDFViewer({
  pdfDoc,
  scale,
  ocrTextItems,
  isOCR = false,
  onTextLayerRefsReady,
  onTextClick,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Render a single PDF page
  const renderPage = useCallback(
    async (page: PDFPageProxy, pageIndex: number, ocrItems?: OCRTextItem[]) => {
      const pageContainer = pageRefs.current.get(pageIndex);
      const textLayerDiv = textLayerRefs.current.get(pageIndex);
      if (!pageContainer || !textLayerDiv) return;

      const pixelRatio = window.devicePixelRatio || 2;
      const viewport = page.getViewport({ scale });
      const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

      // Get or create canvas
      let canvas = pageContainer.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        pageContainer.insertBefore(canvas, textLayerDiv);
      }

      const context = canvas.getContext('2d')!;
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      pageContainer.style.width = `${viewport.width}px`;
      pageContainer.style.height = `${viewport.height}px`;

      // Render PDF page
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      // Render text layer
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      if (ocrItems && ocrItems.length > 0) {
        // Use OCR text items
        const pageViewport = page.getViewport({ scale: 1 });
        const scaleX = viewport.width / pageViewport.width;
        const scaleY = viewport.height / pageViewport.height;

        ocrItems.forEach((item, itemIndex) => {
          const span = document.createElement('span');
          span.textContent = item.text;
          span.className = 'pdf-text-item';
          span.dataset.pageIndex = pageIndex.toString();
          span.dataset.itemIndex = itemIndex.toString();
          span.style.left = `${item.bbox.x * scaleX}px`;
          span.style.top = `${item.bbox.y * scaleY}px`;
          span.style.width = `${item.bbox.width * scaleX}px`;
          span.style.height = `${item.bbox.height * scaleY}px`;
          span.style.fontSize = `${item.bbox.height * scaleY * 0.8}px`;
          textLayerDiv.appendChild(span);
        });
      } else {
        // Use PDF.js text content
        const textContent = await page.getTextContent();

        textContent.items.forEach((item, itemIndex) => {
          if (!('str' in item) || !item.str) return;
          const textItem = item as TextItem;

          const tx = pdfjs.Util.transform(viewport.transform, textItem.transform);

          const span = document.createElement('span');
          span.textContent = textItem.str;
          span.className = 'pdf-text-item';
          span.dataset.pageIndex = pageIndex.toString();
          span.dataset.itemIndex = itemIndex.toString();
          span.style.left = `${tx[4]}px`;
          span.style.top = `${tx[5] - textItem.height}px`;
          span.style.fontSize = `${textItem.height}px`;
          span.style.fontFamily = textItem.fontName || 'sans-serif';

          if (textItem.width > 0) {
            span.style.width = `${textItem.width}px`;
          }

          textLayerDiv.appendChild(span);
        });
      }
    },
    [scale]
  );

  // Render all pages
  const renderAllPages = useCallback(async () => {
    if (!pdfDoc) return;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const items = isOCR ? ocrTextItems?.get(i - 1) : undefined;
      await renderPage(page, i - 1, items);
    }

    // Notify parent about text layer refs
    onTextLayerRefsReady(textLayerRefs.current);
  }, [pdfDoc, isOCR, ocrTextItems, renderPage, onTextLayerRefsReady]);

  // Re-render on scale change
  useEffect(() => {
    if (pdfDoc) {
      const frameId = requestAnimationFrame(() => {
        setTimeout(() => {
          renderAllPages();
        }, 100);
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [pdfDoc, scale, renderAllPages]);

  // Handle click on text
  const handleTextClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('pdf-text-item')) return;

      const pageIndex = parseInt(target.dataset.pageIndex || '-1', 10);
      const itemIndex = parseInt(target.dataset.itemIndex || '-1', 10);
      const clickedText = target.textContent || '';

      if (pageIndex >= 0 && itemIndex >= 0 && onTextClick) {
        onTextClick(pageIndex, itemIndex, clickedText);
      }
    },
    [onTextClick]
  );

  if (!pdfDoc) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pdf-container flex flex-col items-center gap-4 py-8 px-4"
      onClick={handleTextClick}
    >
      {Array.from({ length: pdfDoc.numPages }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) pageRefs.current.set(i, el);
          }}
          className="pdf-page relative bg-white shadow-lg"
        >
          <div
            ref={(el) => {
              if (el) textLayerRefs.current.set(i, el);
            }}
            className="text-layer absolute top-0 left-0"
          />
        </div>
      ))}
    </div>
  );
}
