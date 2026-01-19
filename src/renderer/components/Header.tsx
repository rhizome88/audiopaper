import React from 'react';
import type { PlaybackState, TTSVoice } from '../hooks/useAudioPlayback';

interface HeaderProps {
  fileName: string | null;
  playbackState: PlaybackState;
  currentSentenceIndex: number;
  totalSentences: number;
  speed: number;
  voice: TTSVoice;
  scale: number;
  isOCR: boolean;
  isMarkdown: boolean;
  onTogglePlayback: () => void;
  onPreviousSentence: () => void;
  onNextSentence: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voice: TTSVoice) => void;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

export function Header({
  fileName,
  playbackState,
  currentSentenceIndex,
  totalSentences,
  speed,
  voice,
  scale,
  isOCR,
  isMarkdown,
  onTogglePlayback,
  onPreviousSentence,
  onNextSentence,
  onSpeedChange,
  onVoiceChange,
  onScaleChange,
  onReset,
  onOpenSettings,
}: HeaderProps) {
  const hasDocument = totalSentences > 0;

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AudioPaper</h1>

      {hasDocument && (
        <>
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPreviousSentence}
              disabled={currentSentenceIndex === 0}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous sentence"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
              </svg>
            </button>

            <button
              onClick={onTogglePlayback}
              disabled={playbackState === 'loading'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {playbackState === 'loading' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : playbackState === 'playing' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
              {playbackState === 'loading' ? 'Loading...' : playbackState === 'playing' ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={onNextSentence}
              disabled={currentSentenceIndex >= totalSentences - 1}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next sentence"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
              </svg>
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Speed:</label>
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Voice Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Voice:</label>
            <select
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value as TTSVoice)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </div>

          {/* Zoom Control (for PDF) */}
          {!isMarkdown && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">Zoom:</label>
              <select
                value={scale}
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
              </select>
            </div>
          )}

          {/* Progress */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentSentenceIndex + 1} / {totalSentences}
          </span>

          {/* Badges */}
          {isOCR && (
            <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
              OCR
            </span>
          )}
          {isMarkdown && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              MD
            </span>
          )}

          {/* File name */}
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs hidden md:block">
            {fileName}
          </span>

          {/* New File button */}
          <button
            onClick={onReset}
            className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            New File
          </button>
        </>
      )}

      {/* Settings button (always visible) */}
      <button
        onClick={onOpenSettings}
        className="ml-auto p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
}
