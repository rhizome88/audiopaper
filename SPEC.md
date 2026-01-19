# AudioPaper - Spezifikation

## Problemstellung

Wissenschaftliche Paper auf Englisch lesen ist zeitaufwendig. Eine Vorlese-App wie Speechify hilft, aber:
- Speechify kostet $139/Jahr
- Keine Kontrolle über die Daten
- Overkill für den Use-Case

## Lösung

Eigene Web-App die:
- PDFs hochlädt und anzeigt
- Text extrahiert und vorliest (OpenAI TTS)
- Das aktuelle Wort/Satz hervorhebt
- Auf Smartphone und Desktop funktioniert

## User Flow

1. User öffnet AudioPaper im Browser (auch mobil)
2. PDF hochladen oder URL eingeben
3. Text wird extrahiert und angezeigt
4. Play drücken → Text wird vorgelesen
5. Aktueller Satz/Wort wird hervorgehoben
6. Pause/Resume, Geschwindigkeit anpassen

## Features (MVP)

### Must Have
- [ ] PDF hochladen
- [ ] Text aus PDF extrahieren
- [ ] Text anzeigen (scrollbar)
- [ ] OpenAI TTS Integration
- [ ] Play/Pause Button
- [ ] Aktuellen Satz highlighten
- [ ] Geschwindigkeitsregler (0.5x - 2x)

### Nice to Have
- [ ] Wort-genaues Highlighting (braucht Timestamps)
- [ ] Fortschrittsbalken
- [ ] Position merken (localStorage)
- [ ] Dark Mode
- [ ] Drag & Drop für PDFs
- [ ] URL-Input für Online-PDFs

### Später
- [ ] Verschiedene Stimmen wählbar
- [ ] Offline-Modus (lokales TTS)
- [ ] PDF-Annotationen

## Technische Details

### PDF Text-Extraktion

Option A: **PDF.js** (Mozilla)
- Läuft komplett im Browser
- Keine Server-Verarbeitung nötig
- Bewährt und stabil

Option B: **react-pdf**
- React-Wrapper um PDF.js
- Einfacher zu integrieren

### Text-to-Speech

**OpenAI TTS API**
- Modelle: `tts-1` (schnell) oder `tts-1-hd` (Qualität)
- Stimmen: alloy, echo, fable, onyx, nova, shimmer
- Englisch: Sehr gute Qualität
- Preis: $15/1M Zeichen ($0.015/1k Zeichen)

```typescript
const response = await openai.audio.speech.create({
  model: "tts-1",
  voice: "nova",  // gut für akademische Texte
  input: text,
  speed: 1.0      // 0.25 - 4.0
});
```

### Word-Level Timestamps

OpenAI TTS gibt keine Timestamps zurück. Workarounds:
1. **Chunk-basiert**: Text in Sätze teilen, pro Satz Audio generieren
2. **Timing schätzen**: Wörter pro Minute berechnen
3. **Whisper reverse**: Audio durch Whisper jagen für Timestamps (aufwendig)

Empfehlung: Chunk-basiert (Satz-Highlighting statt Wort-Highlighting)

## UI Mockup (grob)

```
┌─────────────────────────────────────────┐
│  AudioPaper                    [Dark]   │
├─────────────────────────────────────────┤
│  [PDF hochladen]  oder  [URL eingeben]  │
├─────────────────────────────────────────┤
│                                         │
│  Lorem ipsum dolor sit amet,            │
│  consectetur adipiscing elit.           │
│  ▶ SED DO EIUSMOD TEMPOR ◀              │  ← Aktueller Satz
│  incididunt ut labore et dolore         │
│  magna aliqua.                          │
│                                         │
├─────────────────────────────────────────┤
│   advancement. Ut enim ad minim         │
│  ▶ [||]  ════════●══════  1.25x  🔊    │
│     Play   Fortschritt    Speed  Vol    │
└─────────────────────────────────────────┘
```

## Deployment

**Vercel** (wie Agenda)
- Kostenloser Tier reicht
- Auto-Deploy bei Git Push
- Edge Functions für TTS-Proxy
