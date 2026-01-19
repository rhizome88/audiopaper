# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AudioPaper** - Electron Desktop App for reading scientific PDFs, DOCX and Markdown files with sentence and word highlighting.

Goal: Self-hosted Speechify alternative for scientific English papers.

## Tech Stack

- **Electron** with Vite (fast HMR)
- **React 19**
- **Tailwind CSS 3**
- **PDF.js** for PDF rendering (locally bundled)
- **Tesseract.js** for OCR (scanned PDFs)
- **OpenAI TTS API** for Text-to-Speech
- **CloudConvert API** for DOCX-to-PDF conversion
- **electron-store** + **safeStorage** for secure API key storage

## Commands

```bash
npm run dev      # Start development (Vite + Electron with hot-reload)
npm run build    # Production build
npm start        # Start production build
npm run package  # Package for distribution (Windows/Mac)
```

## Architecture

```
src/
  main/                         # Electron Main Process
    index.ts                    # App entry, BrowserWindow setup
    preload.ts                  # Context Bridge for IPC
    ipc-handlers.ts             # IPC handler registration
    store.ts                    # Settings & encrypted API key storage
    services/
      tts-service.ts            # OpenAI TTS API
      convert-service.ts        # CloudConvert DOCX->PDF

  renderer/                     # React Frontend
    App.tsx                     # Main layout with SplitPane
    components/
      Header.tsx                # Top bar with playback controls
      SplitPane.tsx             # Resizable split-screen container
      PDFViewer.tsx             # Left: PDF rendering + text layer
      TextReader.tsx            # Right: Extracted text with highlighting
      MarkdownViewer.tsx        # Markdown rendering with highlighting
      SettingsDialog.tsx        # API key configuration
      UploadArea.tsx            # File drop zone
    hooks/
      useAudioPlayback.ts       # TTS playback state & controls
      useSentenceHighlight.ts   # PDF sentence highlighting
    lib/
      markdown-parser.ts        # Markdown to blocks
      sentence-extractor.ts     # PDF text extraction
    styles/
      globals.css               # Tailwind + custom styles
```

## Core Features

1. **Split-Screen Layout** - PDF/Markdown on left, extracted text on right
2. **PDF/DOCX/Markdown Upload** - PDF.js for PDFs, CloudConvert for DOCX, custom parser for .md
3. **Text Extraction** - Extract text from PDF (+ OCR for scanned PDFs)
4. **Text-to-Speech** - OpenAI TTS API (English)
5. **Sentence Highlighting** - Current sentence highlighted in both panels
6. **Word Highlighting** - Current word highlighted (for Markdown)
7. **Audio Controls** - Play/Pause, Speed, Voice selection, Zoom
8. **Click Navigation** - Click on text to start reading from that sentence
9. **Keyboard Shortcuts** - Space (play/pause), Arrow keys (navigate)

## Markdown-Rendering

The custom Markdown parser (`parseMarkdownToBlocks`) supports:
- Headers (H1-H6)
- Paragraphs
- Bold (`**text**`) and Italic (`*text*`)
- Inline code (`` `code` ``)
- Code blocks (``` ```)
- Links (`[text](url)`)
- Unordered lists (`- item`)
- Ordered lists (`1. item`)
- Blockquotes (`> quote`)
- Horizontal rules (`---`)

Styling is Typora-like (see `.markdown-content` in globals.css).

## IPC Communication

```typescript
// Renderer -> Main (via window.electronAPI)
generateSpeech(text, voice, speed)  // Returns ArrayBuffer
convertDocx(fileBuffer, fileName)   // Returns PDF ArrayBuffer
openFileDialog()                    // Returns file paths
readFile(filePath)                  // Returns file ArrayBuffer
getApiKey(service)                  // Returns decrypted API key
setApiKey(service, key)             // Stores encrypted API key
hasApiKey(service)                  // Check if key exists
getSplitRatio() / setSplitRatio()   // Window split position
```

## API Key Storage

API keys are stored securely using OS keychain:
- Windows: Windows Credential Manager
- macOS: Keychain
- Linux: Secret Service API / libsecret

First-time setup prompts the user to enter their keys.

## Known Issues

- **DOCX/PDF Highlighting**: Text layer coordinates may not align perfectly with visual layout for converted DOCX files.
- **Markdown (recommended)**: Highlighting works best with Markdown files.

## API Costs

- **OpenAI TTS**: $15 per 1 million characters (~$0.60 per paper)
- **CloudConvert**: 25 free conversions/day, then ~$0.02/file
