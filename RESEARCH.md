# AudioPaper - Recherche

## TTS API Vergleich (Stand Januar 2026)

### OpenAI TTS ✓ (Empfohlen)
- **Preis**: $15/1M Zeichen (günstigster)
- **Qualität**: Gut, klar verständlich
- **Latenz**: ~200ms
- **Stimmen**: 6 (alloy, echo, fable, onyx, nova, shimmer)
- **Englisch**: Sehr gut
- **API**: Einfach, du hast schon einen Key

### ElevenLabs
- **Preis**: $5-99/Monat (Subscription)
- **Qualität**: Beste (82% Natürlichkeit)
- **Latenz**: 75-150ms
- **Stimmen**: 3000+
- **Nachteil**: Subscription statt Pay-per-Use

### Fish Audio
- **Preis**: $10/Monat oder $15/1M Zeichen
- **Qualität**: Sehr gut + Emotionen
- **Features**: "(laugh)", "(whisper)" Tags
- **Nachteil**: Weniger bekannt

## PDF Libraries

### PDF.js (Mozilla)
- Standard für PDF im Browser
- Volle Text-Extraktion
- Rendering auf Canvas
- Open Source

### react-pdf
- React Wrapper für PDF.js
- `<Document>` und `<Page>` Komponenten
- Einfache Integration

### pdfjs-dist
- NPM Package von PDF.js
- Für Next.js geeignet

## Highlighting Strategien

### 1. Satz-basiert (Empfohlen für MVP)
```
Text in Sätze splitten
Pro Satz ein Audio-Chunk generieren
Beim Abspielen: aktuellen Satz highlighten
```
- Einfach zu implementieren
- Keine Timestamp-Berechnung nötig
- Gute UX

### 2. Zeit-basiert (Schätzung)
```
Durchschnitt: 150 Wörter/Minute bei 1x Speed
Wortlänge schätzen → Timing berechnen
```
- Ungenau bei unterschiedlicher Wortlänge
- Driftet über Zeit

### 3. Whisper-Alignment (Komplex)
```
Audio generieren → durch Whisper → Timestamps
```
- Genaueste Methode
- Aber: doppelter API-Aufwand
- Für V2 interessant

## Quellen

- OpenAI TTS: https://platform.openai.com/docs/guides/text-to-speech
- PDF.js: https://mozilla.github.io/pdf.js/
- react-pdf: https://github.com/wojtekmaj/react-pdf
- ElevenLabs: https://elevenlabs.io/pricing
