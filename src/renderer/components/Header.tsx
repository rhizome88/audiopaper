import React from 'react';
import type { TTSVoice } from '../hooks/useAudioPlayback';

interface HeaderProps {
  fileName: string | null;
  currentSentenceIndex: number;
  totalSentences: number;
  voice: TTSVoice;
  scale: number;
  isOCR: boolean;
  isMarkdown: boolean;
  scrollSpeed: number;
  isPaused: boolean;
  onPause: () => void;
  onVoiceChange: (voice: TTSVoice) => void;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

export function Header({
  fileName,
  currentSentenceIndex,
  totalSentences,
  voice,
  scale,
  isOCR,
  isMarkdown,
  scrollSpeed,
  isPaused,
  onPause,
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
          {/* Pause button + Speed indicator */}
          {!isPaused && (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {Math.round(scrollSpeed * 100)}%
            </button>
          )}
          {isPaused && (
            <div className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
              Paused
            </div>
          )}

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
