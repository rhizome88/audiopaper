import { useState, useRef, useCallback, useEffect } from 'react';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'scrollReading';
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
  const playbackStateRef = useRef(playbackState);
  const scrollSpeedRef = useRef(1.0);
  const isScrollModeRef = useRef(false);
  useEffect(() => { playbackStateRef.current = playbackState; }, [playbackState]);

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

  // Stop word tracking (resetProgress=false keeps the wave position)
  const stopWordTracking = useCallback((resetProgress = true) => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    if (resetProgress) onWordChangeRef.current?.(0);
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
        audioRef.current.currentTime = 0;

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
          const duration = audioRef.current.duration;
          const rate = speed;
          const audioDurationMs = (duration * 1000) / rate;
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
      const state = playbackStateRef.current;
      if (state === 'playing' || state === 'scrollReading') {
        // Will be handled by playSentence for 'playing', or scrollStartReading for 'scrollReading'
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
    } else if (playbackState === 'playing' || playbackState === 'scrollReading') {
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

  // Scroll-reading: simple dedicated audio playback for scroll mode
  const scrollDecayRef = useRef<NodeJS.Timeout | null>(null);
  const scrollLoadingRef = useRef(false);
  const SCROLL_BASE_SPEED = 1.0;

  // Load and play audio for a sentence in scroll mode
  const scrollPlaySentence = useCallback(
    async (index: number) => {
      if (scrollLoadingRef.current) return;
      const total = getTotalSentences();
      if (index >= total) {
        isScrollModeRef.current = false;
        setPlaybackState('idle');
        return;
      }

      scrollLoadingRef.current = true;
      setCurrentSentenceIndex(index);
      onSentenceChange?.(index);

      let audioUrl = audioQueueRef.current.get(index);
      if (!audioUrl) {
        const text = getSentenceText(index);
        if (!text) { scrollLoadingRef.current = false; return; }
        try {
          const buffer = await window.electronAPI.generateSpeech(text, voice, speed);
          const blob = new Blob([buffer], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(blob);
          audioQueueRef.current.set(index, audioUrl);
        } catch {
          scrollLoadingRef.current = false;
          return;
        }
      }

      scrollLoadingRef.current = false;

      // Check we're still in scroll mode (user might have paused during loading)
      if (!isScrollModeRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      audio.src = audioUrl;
      audio.playbackRate = scrollSpeedRef.current;
      audio.currentTime = 0;

      try {
        await audio.play();
        setPlaybackState('scrollReading');
        const duration = audio.duration;
        if (duration && isFinite(duration)) {
          startWordTracking(index, 0, (duration * 1000) / scrollSpeedRef.current);
        }
      } catch { /* ignore */ }

      // Preload next sentences
      for (let i = 1; i <= 3; i++) preloadAudio(index + i);
    },
    [speed, voice, getTotalSentences, getSentenceText, preloadAudio, startWordTracking, onSentenceChange]
  );

  // Handle audio ended in scroll mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleScrollEnded = () => {
      if (isScrollModeRef.current) {
        stopWordTracking();
        scrollPlaySentence(currentSentenceIndex + 1);
      }
    };
    audio.addEventListener('ended', handleScrollEnded);
    return () => audio.removeEventListener('ended', handleScrollEnded);
  }, [currentSentenceIndex, scrollPlaySentence, stopWordTracking]);

  const scrollStartReading = useCallback(
    (sentenceIndex: number) => {
      if (playbackStateRef.current === 'playing') return;
      if (isScrollModeRef.current) return; // Already reading, just boost

      isScrollModeRef.current = true;
      scrollSpeedRef.current = SCROLL_BASE_SPEED;

      const audio = audioRef.current;
      // Resume if we have audio paused at the same sentence
      if (audio && audio.src && !audio.ended && audio.paused && sentenceIndex === currentSentenceIndex) {
        audio.playbackRate = SCROLL_BASE_SPEED;
        audio.play().then(() => {
          setPlaybackState('scrollReading');
          if (audio.duration && isFinite(audio.duration)) {
            const ratio = audio.currentTime / audio.duration;
            const remaining = ((audio.duration - audio.currentTime) * 1000) / SCROLL_BASE_SPEED;
            const sentence = getSentenceTextRef.current(sentenceIndex);
            const words = sentence ? sentence.split(/\s+/).filter(w => w.length > 0) : [];
            startWordTracking(sentenceIndex, Math.floor(ratio * words.length), remaining);
          }
        }).catch(() => {});
        return;
      }

      scrollPlaySentence(sentenceIndex);
    },
    [currentSentenceIndex, scrollPlaySentence, startWordTracking]
  );

  const scrollBoost = useCallback(
    (delta: number) => {
      if (!isScrollModeRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      // While scrolling: set speed to 2.5x
      scrollSpeedRef.current = 2.5;
      audio.playbackRate = 2.5;


      // Restart word tracking with new speed
      stopWordTracking();
      if (audio.duration && isFinite(audio.duration)) {
        const playedRatio = audio.currentTime / audio.duration;
        const remaining = ((audio.duration - audio.currentTime) * 1000) / scrollSpeedRef.current;
        const sentence = getSentenceTextRef.current(currentSentenceIndex);
        const words = sentence ? sentence.split(/\s+/).filter(w => w.length > 0) : [];
        startWordTracking(currentSentenceIndex, Math.floor(playedRatio * words.length), remaining);
      }

      // Decay back to base speed after scroll stops
      if (scrollDecayRef.current) clearTimeout(scrollDecayRef.current);
      scrollDecayRef.current = setTimeout(() => {
        if (audioRef.current && isScrollModeRef.current && !audioRef.current.paused) {
          scrollSpeedRef.current = SCROLL_BASE_SPEED;
          audioRef.current.playbackRate = SCROLL_BASE_SPEED;
          stopWordTracking();
          if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
            const ratio = audioRef.current.currentTime / audioRef.current.duration;
            const remaining = ((audioRef.current.duration - audioRef.current.currentTime) * 1000) / SCROLL_BASE_SPEED;
            const sentence = getSentenceTextRef.current(currentSentenceIndex);
            const words = sentence ? sentence.split(/\s+/).filter(w => w.length > 0) : [];
            startWordTracking(currentSentenceIndex, Math.floor(ratio * words.length), remaining);
          }
        }
      }, 200);
    },
    [currentSentenceIndex, startWordTracking, stopWordTracking]
  );

  const pauseScrollReading = useCallback(() => {
    isScrollModeRef.current = false;
    audioRef.current?.pause();
    stopWordTracking(false); // Keep wave position
    setPlaybackState('idle');
    if (scrollDecayRef.current) clearTimeout(scrollDecayRef.current);
  }, [stopWordTracking]);

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
    scrollStartReading,
    scrollBoost,
    pauseScrollReading,
    setError,
  };
}
