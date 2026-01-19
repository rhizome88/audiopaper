import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialRatio?: number;
  onRatioChange?: (ratio: number) => void;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export function SplitPane({
  left,
  right,
  initialRatio = 0.5,
  onRatioChange,
  minLeftWidth = 300,
  minRightWidth = 300,
}: SplitPaneProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const dividerWidth = 8;
      const mouseX = e.clientX - rect.left;

      // Calculate new ratio with min width constraints
      let newRatio = mouseX / containerWidth;

      // Apply minimum width constraints
      const minLeftRatio = minLeftWidth / containerWidth;
      const maxLeftRatio = 1 - (minRightWidth + dividerWidth) / containerWidth;

      newRatio = Math.max(minLeftRatio, Math.min(maxLeftRatio, newRatio));

      setRatio(newRatio);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onRatioChange?.(ratio);
    }
  }, [isDragging, ratio, onRatioChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Load initial ratio
  useEffect(() => {
    setRatio(initialRatio);
  }, [initialRatio]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div
        className="overflow-auto bg-gray-100 dark:bg-gray-900"
        style={{ width: `calc(${ratio * 100}% - 4px)` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className={`w-2 cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors ${
          isDragging
            ? 'bg-blue-500'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-600'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
      </div>

      {/* Right Panel */}
      <div
        className="overflow-auto bg-white dark:bg-gray-800"
        style={{ width: `calc(${(1 - ratio) * 100}% - 4px)` }}
      >
        {right}
      </div>
    </div>
  );
}
