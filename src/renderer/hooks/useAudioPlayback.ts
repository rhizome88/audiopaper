import { useState, useRef, useCallback, useEffect } from 'react';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface UseAudioPlaybackOptions {
  getSentenceText: (index: number) => string | null;
  getTotalSentences: () => number;
  onSentenceChange?: (index: number) => void;
  onWordChange?: (wordIndex: number) => void;
  isMarkdown?: boolean;
}

export function useAudioPlayback({
  getSentenceText,
  getTotalSentences,
  onSentenceChange,
  onWordChange,
  isMarkdown = false,
}: UseAudioPlaybackOptions) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [voice, setVoice] = useState<TTSVoice>('nova');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Map<number, string>>(new Map());
  const wordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid stale closures in intervals
  const onWordChangeRef = useRef(onWordChange);
  const getSentenceTextRef = useRef(getSentenceText);
  const speedRef = useRef(speed);

  // Keep refs updated
  useEffect(() => {
    onWordChangeRef.current = onWordChange;
  }, [onWordChange]);

  useEffect(() => {
    getSentenceTextRef.current = getSentenceText;
  }, [getSentenceText]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Stop word tracking
  const stopWordTracking = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    onWordChangeRef.current?.(0);
  }, []);

  // Start smooth progress tracking (flows like water, uses actual audio duration)
  const startWordTracking = useCallback(
    (sentenceIndex: number, startFromWord: number = 0, audioDurationMs?: number) => {
      // Clear any existing interval first
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
        wordTimerRef.current = null;
      }

      const sentence = getSentenceTextRef.current(sentenceIndex);
      if (!sentence) return;

      const words = sentence.split(/\s+/).filter((w) => w.length > 0);
      if (words.length === 0) return;

      // Use actual audio duration if provided, otherwise estimate with 600 WPM
      const totalDurationMs = audioDurationMs || (words.length / 600) * 60 * 1000;

      // Start progress from the clicked word position (convert word index to percentage)
      const initialProgress = words.length > 1
        ? Math.min((startFromWord / (words.length - 1)) * 100, 99)
        : 0;

      onWordChangeRef.current?.(initialProgress);

      const startTime = Date.now();
      const intervalId = setInterval(() => {
        // Calculate progress based on elapsed time, not tick count
        const elapsed = Date.now() - startTime;
        const newProgress = initialProgress + ((100 - initialProgress) * elapsed / totalDurationMs);

        if (newProgress < 100) {
          onWordChangeRef.current?.(newProgress);
        } else {
          onWordChangeRef.current?.(99.9);
        }
      }, 25); // 25ms = 40fps
      wordTimerRef.current = intervalId;
    },
    [] // No dependencies needed - we use refs
  );

  // Preload audio for a sentence
  const preloadAudio = useCallback(
    async (index: number) => {
      const totalSentences = getTotalSentences();
      if (index >= totalSentences || audioQueueRef.current.has(index)) {
        return;
      }

      const text = getSentenceText(index);
      if (!text) return;

      try {
        const buffer = await window.electronAPI.generateSpeech(text, voice, speed);
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioQueueRef.current.set(index, url);
      } catch (err) {
        console.error('Preload error:', err);
      }
    },
    [speed, voice, getTotalSentences, getSentenceText]
  );

  // Play a specific sentence
  const playSentence = useCallback(
    async (index: number) => {
      const totalSentences = getTotalSentences();
      if (index >= totalSentences) {
        setPlaybackState('idle');
        setCurrentSentenceIndex(0);
        onSentenceChange?.(0);
        return;
      }

      // Clear any previous seek handler
      if (audioRef.current) {
        audioRef.current.onloadedmetadata = null;
      }

      setCurrentSentenceIndex(index);
      onSentenceChange?.(index);
      setPlaybackState('loading');

      let audioUrl = audioQueueRef.current.get(index);

      if (!audioUrl) {
        const text = getSentenceText(index);
        if (!text) {
          setPlaybackState('idle');
          return;
        }

        try {
          const buffer = await window.electronAPI.generateSpeech(text, voice, speed);
          const blob = new Blob([buffer], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(blob);
          audioQueueRef.current.set(index, audioUrl);
        } catch (err) {
          setError('Failed to generate audio. Please check your API key.');
          setPlaybackState('idle');
          return;
        }
      }

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = speed;
        audioRef.current.currentTime = 0; // Always start from beginning

        // Wait for metadata to load to get accurate duration
        await new Promise<void>((resolve) => {
          const audio = audioRef.current!;
          if (audio.readyState >= 1) {
            resolve();
          } else {
            audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
          }
        });

        try {
          await audioRef.current.play();
          setPlaybackState('playing');
          // Use actual audio duration
          const duration = audioRef.current.duration;
          const audioDurationMs = (duration * 1000) / speed;
          startWordTracking(index, 0, audioDurationMs);
        } catch (err) {
          console.error('Playback error:', err);
          setPlaybackState('idle');
        }
      }

      // Preload next sentences
      for (let i = 1; i <= 3; i++) {
        preloadAudio(index + i);
      }
    },
    [
      speed,
      voice,
      preloadAudio,
      getTotalSentences,
      getSentenceText,
      startWordTracking,
      onSentenceChange,
    ]
  );

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      stopWordTracking();
      if (playbackState === 'playing') {
        playSentence(currentSentenceIndex + 1);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSentenceIndex, playbackState, playSentence, stopWordTracking]);

  // Toggle playback
  const togglePlayback = useCallback(async () => {
    if (playbackState === 'idle') {
      playSentence(currentSentenceIndex);
    } else if (playbackState === 'paused') {
      // Resume from current position
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setPlaybackState('playing');
          // Calculate remaining duration for word tracking
          const remainingTime = audioRef.current.duration - audioRef.current.currentTime;
          const remainingDurationMs = (remainingTime * 1000) / speedRef.current;
          // Estimate current word position based on played time
          const playedRatio = audioRef.current.currentTime / audioRef.current.duration;
          const sentence = getSentenceTextRef.current(currentSentenceIndex);
          const words = sentence ? sentence.split(/\s+/).filter(w => w.length > 0) : [];
          const estimatedWordIndex = Math.floor(playedRatio * words.length);
          startWordTracking(currentSentenceIndex, estimatedWordIndex, remainingDurationMs);
        } catch (err) {
          console.error('Resume error:', err);
          // If resume fails, restart the sentence
          playSentence(currentSentenceIndex);
        }
      }
    } else if (playbackState === 'playing') {
      audioRef.current?.pause();
      stopWordTracking();
      setPlaybackState('paused');
    }
  }, [playbackState, currentSentenceIndex, playSentence, stopWordTracking, startWordTracking]);

  // Navigate to previous sentence
  const previousSentence = useCallback(() => {
    const prevIndex = Math.max(currentSentenceIndex - 1, 0);
    if (playbackState === 'playing') {
      playSentence(prevIndex);
    } else {
      setCurrentSentenceIndex(prevIndex);
      onSentenceChange?.(prevIndex);
    }
  }, [currentSentenceIndex, playbackState, playSentence, onSentenceChange]);

  // Navigate to next sentence
  const nextSentence = useCallback(() => {
    const nextIndex = Math.min(currentSentenceIndex + 1, getTotalSentences() - 1);
    if (playbackState === 'playing') {
      playSentence(nextIndex);
    } else {
      setCurrentSentenceIndex(nextIndex);
      onSentenceChange?.(nextIndex);
    }
  }, [currentSentenceIndex, playbackState, playSentence, getTotalSentences, onSentenceChange]);

  // Change speed (clears audio cache)
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioQueueRef.current.clear();
  }, []);

  // Change voice (clears audio cache)
  const handleVoiceChange = useCallback((newVoice: TTSVoice) => {
    setVoice(newVoice);
    audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioQueueRef.current.clear();
  }, []);

  // Reset playback
  const reset = useCallback(() => {
    audioRef.current?.pause();
    stopWordTracking();
    setPlaybackState('idle');
    setCurrentSentenceIndex(0);
    setError(null);
    audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioQueueRef.current.clear();
  }, [stopWordTracking]);

  // Jump to specific sentence
  const jumpToSentence = useCallback(
    (index: number) => {
      if (index >= 0 && index < getTotalSentences()) {
        if (playbackState === 'playing') {
          playSentence(index);
        } else {
          setCurrentSentenceIndex(index);
          onSentenceChange?.(index);
        }
      }
    },
    [playbackState, playSentence, getTotalSentences, onSentenceChange]
  );

  // Play sentence starting from a specific word
  const playSentenceFromWord = useCallback(
    async (sentenceIndex: number, wordIndex: number) => {
      const totalSentences = getTotalSentences();
      if (sentenceIndex < 0 || sentenceIndex >= totalSentences) return;

      // Stop any existing playback first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onloadedmetadata = null; // Clear old handler
      }
      stopWordTracking();

      setCurrentSentenceIndex(sentenceIndex);
      onSentenceChange?.(sentenceIndex);
      setPlaybackState('loading');

      // Set initial word position immediately
      onWordChangeRef.current?.(wordIndex);

      let audioUrl = audioQueueRef.current.get(sentenceIndex);

      if (!audioUrl) {
        const text = getSentenceTextRef.current(sentenceIndex);
        if (!text) {
          setPlaybackState('idle');
          return;
        }

        try {
          const buffer = await window.electronAPI.generateSpeech(text, voice, speed);
          const blob = new Blob([buffer], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(blob);
          audioQueueRef.current.set(sentenceIndex, audioUrl);
        } catch (err) {
          setError('Failed to generate audio. Please check your API key.');
          setPlaybackState('idle');
          return;
        }
      }

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = speed;

        // Calculate start time based on word position
        const text = getSentenceTextRef.current(sentenceIndex);
        const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
        const totalWords = words.length;

        // Set up seek handler for when audio is loaded
        const seekToWord = () => {
          if (audioRef.current && totalWords > 0 && wordIndex > 0) {
            const duration = audioRef.current.duration;
            const seekTime = (wordIndex / totalWords) * duration;
            audioRef.current.currentTime = seekTime;
          }
        };

        // If audio might already be loaded (cached), seek immediately after play
        // Otherwise set up the loadedmetadata handler
        audioRef.current.onloadedmetadata = seekToWord;

        try {
          await audioRef.current.play();
          // Also try to seek after play starts (for cached audio)
          if (audioRef.current.readyState >= 1) {
            seekToWord();
          }
          setPlaybackState('playing');
          // Calculate remaining duration from word position
          const totalDurationMs = (audioRef.current.duration * 1000) / speed;
          const remainingDurationMs = totalDurationMs * (1 - wordIndex / totalWords);
          startWordTracking(sentenceIndex, wordIndex, remainingDurationMs);
        } catch (err) {
          console.error('Playback error:', err);
          setPlaybackState('idle');
        }
      }

      // Preload next sentences
      for (let i = 1; i <= 3; i++) {
        preloadAudio(sentenceIndex + i);
      }
    },
    [speed, voice, getTotalSentences, startWordTracking, stopWordTracking, onSentenceChange, preloadAudio]
  );

  return {
    playbackState,
    currentSentenceIndex,
    speed,
    voice,
    error,
    togglePlayback,
    previousSentence,
    nextSentence,
    handleSpeedChange,
    handleVoiceChange,
    reset,
    playSentence,
    playSentenceFromWord,
    jumpToSentence,
    setError,
  };
}
