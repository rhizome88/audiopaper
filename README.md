# AudioPaper Electron

Desktop application for reading scientific papers with Text-to-Speech support and split-screen layout.

## Features

- **PDF Viewer** (left panel): View PDF pages with highlighted sentences
- **Text Reader** (right panel): Extracted text with sentence-by-sentence highlighting
- **Markdown Support**: Native rendering with word-level highlighting
- **OCR Support**: Automatic text extraction from scanned PDFs (via Tesseract.js)
- **DOCX Conversion**: Convert Word documents to PDF (requires CloudConvert API)
- **Split-Screen Layout**: Resizable panels for widescreen monitors
- **Keyboard Navigation**: Arrow keys and spacebar for playback control

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React 19** + **Vite** - Fast frontend development
- **Tailwind CSS 3** - Utility-first styling
- **PDF.js** - PDF rendering
- **Tesseract.js** - OCR for scanned documents
- **OpenAI TTS API** - High-quality text-to-speech
- **CloudConvert API** - DOCX to PDF conversion (optional)

## Development

```bash
# Install dependencies
npm install

# Start development mode (hot-reload)
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

## Packaging

```bash
# Build for all platforms
npm run package

# Build for specific platform
npm run package:win   # Windows (.exe)
npm run package:mac   # macOS (.dmg)
```

Output will be in the `release/` directory.

## Configuration

On first launch, you'll be prompted to enter your API keys:

1. **OpenAI API Key** (required): For text-to-speech functionality
   - Get your key at [platform.openai.com](https://platform.openai.com/api-keys)

2. **CloudConvert API Key** (optional): For DOCX to PDF conversion
   - Get your key at [cloudconvert.com](https://cloudconvert.com/dashboard/api/v2/keys)

API keys are securely stored using your operating system's keychain.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Arrow Right/Down` | Next sentence |
| `Arrow Left/Up` | Previous sentence |

## Project Structure

```
audiopaper-electron/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # App entry, window management
│   │   ├── preload.ts           # Context bridge for IPC
│   │   ├── ipc-handlers.ts      # IPC handler registration
│   │   ├── store.ts             # Settings & API key storage
│   │   └── services/
│   │       ├── tts-service.ts   # OpenAI TTS
│   │       └── convert-service.ts # CloudConvert
│   │
│   └── renderer/                # React Frontend
│       ├── App.tsx              # Main app component
│       ├── components/
│       │   ├── Header.tsx       # Top bar with controls
│       │   ├── SplitPane.tsx    # Resizable split view
│       │   ├── PDFViewer.tsx    # PDF rendering
│       │   ├── TextReader.tsx   # Plain text view
│       │   ├── MarkdownViewer.tsx # Markdown rendering
│       │   ├── SettingsDialog.tsx # API key configuration
│       │   └── UploadArea.tsx   # File drop zone
│       ├── hooks/
│       │   ├── useAudioPlayback.ts # TTS playback logic
│       │   └── useSentenceHighlight.ts # PDF highlighting
│       ├── lib/
│       │   ├── markdown-parser.ts # MD to blocks
│       │   └── sentence-extractor.ts # Text extraction
│       └── styles/
│           └── globals.css      # Tailwind + custom styles
├── dist/                        # Build output
└── release/                     # Packaged installers
```

## API Costs

- **OpenAI TTS**: ~$15 per 1 million characters (~$0.60 per paper)
- **CloudConvert**: 25 free conversions/day, then ~$0.02/file

## License

MIT
