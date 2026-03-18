import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import Tesseract from 'tesseract.js';

import { Header } from './components/Header';
import { SplitPane } from './components/SplitPane';
import { PDFViewer } from './components/PDFViewer';
import { TextReader } from './components/TextReader';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SettingsDialog } from './components/SettingsDialog';
import { UploadArea } from './components/UploadArea';

import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useSentenceHighlight } from './hooks/useSentenceHighlight';
import { parseMarkdownToBlocks, type MarkdownBlock } from './lib/markdown-parser';
import {
  extractSentencesWithLocations,
  type SentenceLocation,
  type TextSpan,
  type OCRTextItem,
} from './lib/sentence-extractor';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function App() {
  // Document state
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [sentences, setSentences] = useState<SentenceLocation[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);
  const [isOCR, setIsOCR] = useState(false);
  const [ocrTextItems, setOcrTextItems] = useState<Map<number, OCRTextItem[]>>(new Map());
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [markdownSentences, setMarkdownSentences] = useState<string[]>([]);
  const [markdownBlocks, setMarkdownBlocks] = useState<MarkdownBlock[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);

  // Refs
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastFilePathRef = useRef<string | null>(null);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const hasKey = await window.electronAPI.hasApiKey('openai');
      setHasApiKey(hasKey);
      if (!hasKey) {
        setSettingsOpen(true);
      }
    };
    checkApiKey();

    // Load saved split ratio
    const loadSplitRatio = async () => {
      const ratio = await window.electronAPI.getSplitRatio();
      setSplitRatio(ratio);
    };
    loadSplitRatio();
  }, []);

  // Get sentence text by index
  const getSentenceText = useCallback(
    (index: number): string | null => {
      if (markdownContent && markdownSentences.length > 0) {
        return markdownSentences[index] || null;
      }
      return sentences[index]?.sentence || null;
    },
    [markdownContent, markdownSentences, sentences]
  );

  // Get total sentence count
  const getTotalSentences = useCallback((): number => {
    if (markdownContent) {
      return markdownSentences.length;
    }
    return sentences.length;
  }, [markdownContent, markdownSentences, sentences]);

  // Audio playback hook
  const {
    playbackState,
    currentSentenceIndex,
    speed,
    voice,
    error: audioError,
    setError: setAudioError,
    togglePlayback,
    previousSentence,
    nextSentence,
    handleSpeedChange,
    handleVoiceChange,
    reset: resetAudio,
    playSentence,
    playSentenceFromWord,
  } = useAudioPlayback({
    getSentenceText,
    getTotalSentences,
    onWordChange: setCurrentWordIndex,
    isMarkdown: !!markdownContent,
  });

  // Sentence highlight hook (for PDF)
  const { findSentenceBySpan } = useSentenceHighlight({
    sentences,
    currentSentenceIndex,
    textLayerRefs,
  });

  // Run OCR on a single page
  const runOCROnPage = async (
    doc: PDFDocumentProxy,
    pageNum: number
  ): Promise<OCRTextItem[]> => {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setLoadingStatus(`OCR Page ${pageNum}/${doc.numPages}: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const items: OCRTextItem[] = [];
    const scaleBack = viewport.width / page.getViewport({ scale: 1 }).width;

    result.data.words.forEach((word) => {
      if (word.text.trim()) {
        items.push({
          text: word.text,
          bbox: {
            x: word.bbox.x0 / scaleBack,
            y: word.bbox.y0 / scaleBack,
            width: (word.bbox.x1 - word.bbox.x0) / scaleBack,
            height: (word.bbox.y1 - word.bbox.y0) / scaleBack,
          },
        });
      }
    });

    return items;
  };

  // Extract text from PDF
  const extractTextFromPDF = async (
    doc: PDFDocumentProxy
  ): Promise<{
    textSpans: TextSpan[];
    ocrData?: Map<number, OCRTextItem[]>;
    needsOCR: boolean;
  }> => {
    const textSpans: TextSpan[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageHeight = viewport.height;
      const textContent = await page.getTextContent();

      // Collect font sizes to determine the main body font size
      const fontSizes: number[] = [];
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim() && 'transform' in item) {
          fontSizes.push(Math.abs(item.transform[3])); // transform[3] = font height
        }
      }
      // Main body font size = most common font size
      const fontSizeCount = new Map<number, number>();
      for (const fs of fontSizes) {
        const rounded = Math.round(fs * 10) / 10;
        fontSizeCount.set(rounded, (fontSizeCount.get(rounded) || 0) + 1);
      }
      let mainFontSize = 10;
      let maxCount = 0;
      for (const [fs, count] of fontSizeCount) {
        if (count > maxCount) {
          maxCount = count;
          mainFontSize = fs;
        }
      }

      textContent.items.forEach((item, originalIndex) => {
        if ('str' in item && item.str) {
          // Filter: skip items in bottom 15% of page with smaller font
          if ('transform' in item) {
            const yPos = item.transform[5]; // Y position (from bottom in PDF coords)
            const fontSize = Math.abs(item.transform[3]);
            const isFooterRegion = yPos < pageHeight * 0.15;
            const isSmallerFont = fontSize < mainFontSize * 0.85;
            if (isFooterRegion && isSmallerFont) {
              return; // Skip footnotes/footer text
            }
          }
          textSpans.push({
            text: item.str,
            pageIndex: i - 1,
            itemIndex: originalIndex, // Must match PDFViewer's forEach index
          });
        }
      });
    }

    const totalText = textSpans.map((s) => s.text).join('').replace(/\s/g, '');

    if (totalText.length > 100) {
      return { textSpans, needsOCR: false };
    }

    setLoadingStatus('PDF has no text. Starting OCR...');
    const ocrData = new Map<number, OCRTextItem[]>();
    const ocrTextSpans: TextSpan[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const pageItems = await runOCROnPage(doc, i);
      ocrData.set(i - 1, pageItems);

      pageItems.forEach((item, itemIndex) => {
        ocrTextSpans.push({
          text: item.text,
          pageIndex: i - 1,
          itemIndex,
          bbox: item.bbox,
        });
      });
    }

    return { textSpans: ocrTextSpans, ocrData, needsOCR: true };
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const fileNameLower = file.name.toLowerCase();
    const isPDF = file.type.includes('pdf') || fileNameLower.endsWith('.pdf');
    const isDOCX = fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc');
    const isMarkdown = fileNameLower.endsWith('.md') || fileNameLower.endsWith('.markdown');

    if (!isPDF && !isDOCX && !isMarkdown) {
      setError('Please upload a PDF, DOCX, or Markdown file.');
      return;
    }

    // Check for API key
    if (!hasApiKey) {
      setError('Please configure your OpenAI API key in Settings first.');
      setSettingsOpen(true);
      return;
    }

    // Save file path if available (via Electron's webUtils.getPathForFile)
    try {
      const filePath = window.electronAPI.getPathForFile(file);
      if (filePath) {
        lastFilePathRef.current = filePath;
        window.electronAPI.setLastDocument(filePath, 0);
      }
    } catch {
      // File may not have a path (e.g. restored from buffer)
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    resetAudio();
    setPdfDoc(null);
    setSentences([]);
    setIsOCR(false);
    setOcrTextItems(new Map());
    setMarkdownContent(null);
    setMarkdownSentences([]);
    setMarkdownBlocks([]);

    try {
      // Handle Markdown files
      if (isMarkdown) {
        setLoadingStatus('Loading Markdown...');
        const text = await file.text();
        setMarkdownContent(text);

        const { blocks, allSentences } = parseMarkdownToBlocks(text);
        setMarkdownBlocks(blocks);
        setMarkdownSentences(allSentences);
        setLoadingStatus('');
        setIsLoading(false);
        return;
      }

      let arrayBuffer: ArrayBuffer;

      if (isDOCX) {
        setLoadingStatus('Converting DOCX to PDF...');
        const fileBuffer = await file.arrayBuffer();
        try {
          arrayBuffer = await window.electronAPI.convertDocx(fileBuffer, file.name);
        } catch (err) {
          throw new Error('DOCX conversion failed. Please check your CloudConvert API key.');
        }
      } else {
        setLoadingStatus('Loading PDF...');
        arrayBuffer = await file.arrayBuffer();
      }

      const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);

      setLoadingStatus('Extracting text...');
      const { textSpans, ocrData, needsOCR } = await extractTextFromPDF(doc);

      if (needsOCR && ocrData) {
        setIsOCR(true);
        setOcrTextItems(ocrData);
      }

      const extractedSentences = extractSentencesWithLocations(textSpans);
      if (extractedSentences.length === 0) {
        setError('Could not extract text from PDF.');
        return;
      }

      setSentences(extractedSentences);
      setLoadingStatus('');
    } catch (err) {
      console.error('Document processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load a file from disk by path
  const loadFileFromPath = async (filePath: string, restoreSentenceIndex?: number) => {
    try {
      const buffer = await window.electronAPI.readFile(filePath);
      const name = filePath.split(/[/\\]/).pop() || 'document';
      const file = new File([buffer], name);
      await handleFileUpload(file);
      // Save as last document
      window.electronAPI.setLastDocument(filePath, 0);
      // Store the path for future saves
      lastFilePathRef.current = filePath;
      // Restore sentence position after a short delay to allow rendering
      if (restoreSentenceIndex && restoreSentenceIndex > 0) {
        setTimeout(() => {
          playSentence(restoreSentenceIndex);
        }, 500);
      }
    } catch (err) {
      console.error('Failed to load file from path:', err);
    }
  };

  // Handle file dialog
  const handleOpenDialog = async () => {
    try {
      const result = await window.electronAPI.openFileDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        await loadFileFromPath(filePath);
      }
    } catch (err) {
      console.error('File dialog error:', err);
    }
  };

  // Handle text layer refs from PDF viewer
  const handleTextLayerRefsReady = useCallback((refs: Map<number, HTMLDivElement>) => {
    textLayerRefs.current = refs;
  }, []);

  // Handle PDF text click - find sentence by matching clicked text
  const handlePdfTextClick = useCallback(
    (pageIndex: number, itemIndex: number, clickedText?: string) => {
      // Try text-based matching first (most reliable for PDFs)
      if (clickedText && clickedText.trim().length > 2) {
        const needle = clickedText.trim().toLowerCase();
        for (let i = 0; i < sentences.length; i++) {
          if (sentences[i].sentence.toLowerCase().includes(needle)) {
            playSentence(i);
            return;
          }
        }
      }
      // Fallback to index-based matching
      const result = findSentenceBySpan(pageIndex, itemIndex);
      if (result.sentenceIndex >= 0) {
        playSentence(result.sentenceIndex);
      }
    },
    [sentences, findSentenceBySpan, playSentence]
  );

  // Handle split ratio change
  const handleSplitRatioChange = useCallback((ratio: number) => {
    setSplitRatio(ratio);
    window.electronAPI.setSplitRatio(ratio);
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    resetAudio();
    setPdfDoc(null);
    setSentences([]);
    setFileName(null);
    setIsOCR(false);
    setOcrTextItems(new Map());
    setMarkdownContent(null);
    setMarkdownSentences([]);
    setMarkdownBlocks([]);
    setError(null);
    lastFilePathRef.current = null;
    window.electronAPI.clearLastDocument();
  }, [resetAudio]);

  // Center both views on current position
  const centerCurrentPosition = useCallback(() => {
    // Center right side (TextReader)
    const rightSentenceEl = document.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);
    if (rightSentenceEl) {
      rightSentenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Center left side (PDF or Markdown)
    if (markdownContent) {
      // Markdown: find sentence element
      const mdSentenceEl = document.querySelector(`[data-sentence="${currentSentenceIndex}"]`);
      if (mdSentenceEl) {
        mdSentenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (sentences.length > 0 && sentences[currentSentenceIndex]) {
      // PDF: find first span of current sentence
      const sentence = sentences[currentSentenceIndex];
      if (sentence.spans.length > 0) {
        const firstSpan = sentence.spans[0];
        const textLayerDiv = textLayerRefs.current.get(firstSpan.pageIndex);
        if (textLayerDiv) {
          const textItems = textLayerDiv.querySelectorAll('.pdf-text-item');
          const targetItem = textItems[firstSpan.itemIndex] as HTMLElement;
          if (targetItem) {
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [currentSentenceIndex, markdownContent, sentences]);

  // Toggle playback with centering
  const handleTogglePlayback = useCallback(() => {
    centerCurrentPosition();
    togglePlayback();
  }, [centerCurrentPosition, togglePlayback]);

  // Restore last document on startup
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (!hasApiKey || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    (async () => {
      const last = await window.electronAPI.getLastDocument();
      if (last?.filePath) {
        try {
          const buffer = await window.electronAPI.readFile(last.filePath);
          const name = last.filePath.split(/[/\\]/).pop() || 'document';
          const file = new File([buffer], name);
          lastFilePathRef.current = last.filePath;
          await handleFileUpload(file);
          if (last.sentenceIndex > 0) {
            setTimeout(() => playSentence(last.sentenceIndex), 500);
          }
        } catch (err) {
          console.error('Failed to restore last document:', err);
          window.electronAPI.clearLastDocument();
        }
      }
    })();
  }, [hasApiKey]);

  // Periodically save current sentence index
  useEffect(() => {
    if (!lastFilePathRef.current) return;
    window.electronAPI.setLastDocument(lastFilePathRef.current, currentSentenceIndex);
  }, [currentSentenceIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (getTotalSentences() === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextSentence();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        previousSentence();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getTotalSentences, previousSentence, nextSentence, handleTogglePlayback]);

  const hasDocument = pdfDoc || markdownContent;
  const displayError = error || audioError;

  // Dismiss error
  const dismissError = useCallback(() => {
    setError(null);
    setAudioError(null);
  }, [setAudioError]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header
        fileName={fileName}
        playbackState={playbackState}
        currentSentenceIndex={currentSentenceIndex}
        totalSentences={getTotalSentences()}
        speed={speed}
        voice={voice}
        scale={scale}
        isOCR={isOCR}
        isMarkdown={!!markdownContent}
        onTogglePlayback={handleTogglePlayback}
        onPreviousSentence={previousSentence}
        onNextSentence={nextSentence}
        onSpeedChange={handleSpeedChange}
        onVoiceChange={handleVoiceChange}
        onScaleChange={setScale}
        onReset={handleReset}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Error Display */}
      {displayError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
          <p className="text-red-700 dark:text-red-400 text-sm">{displayError}</p>
          <button
            onClick={dismissError}
            className="ml-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">{loadingStatus || 'Processing...'}</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!hasDocument && !isLoading && (
        <UploadArea onFileSelect={handleFileUpload} onOpenDialog={handleOpenDialog} />
      )}

      {/* Document View - Split Pane */}
      {hasDocument && !isLoading && (
        <SplitPane
          initialRatio={splitRatio}
          onRatioChange={handleSplitRatioChange}
          left={
            pdfDoc ? (
              <PDFViewer
                pdfDoc={pdfDoc}
                scale={scale}
                ocrTextItems={isOCR ? ocrTextItems : undefined}
                isOCR={isOCR}
                onTextLayerRefsReady={handleTextLayerRefsReady}
                onTextClick={handlePdfTextClick}
              />
            ) : markdownContent ? (
              <div className="h-full bg-white dark:bg-gray-800 overflow-auto">
                <MarkdownViewer
                  blocks={markdownBlocks}
                  sentences={markdownSentences}
                  currentSentenceIndex={currentSentenceIndex}
                  currentWordIndex={currentWordIndex}
                  onSentenceClick={playSentence}
                />
              </div>
            ) : null
          }
          right={
            pdfDoc ? (
              <TextReader
                sentences={sentences}
                currentSentenceIndex={currentSentenceIndex}
                currentWordIndex={currentWordIndex}
                isPlaying={playbackState === 'playing'}
                onSentenceClick={playSentence}
                onWordClick={playSentenceFromWord}
                onTogglePlayback={handleTogglePlayback}
              />
            ) : markdownContent ? (
              <TextReader
                sentences={markdownSentences.map((s) => ({ sentence: s, spans: [] }))}
                currentSentenceIndex={currentSentenceIndex}
                currentWordIndex={currentWordIndex}
                isPlaying={playbackState === 'playing'}
                onSentenceClick={playSentence}
                onWordClick={playSentenceFromWord}
                onTogglePlayback={handleTogglePlayback}
              />
            ) : null
          }
        />
      )}

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => {
          setSettingsOpen(false);
          setHasApiKey(true);
        }}
      />
    </div>
  );
}
