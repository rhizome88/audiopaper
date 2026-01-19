import React from 'react';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  onOpenDialog: () => void;
}

export function UploadArea({ onFileSelect, onOpenDialog }: UploadAreaProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-white dark:bg-gray-800 max-w-xl w-full"
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,.md,.markdown"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v6m0 0l-3-3m3 3l3-3" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
            Drop PDF, DOCX or Markdown here
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">or click to select a file</p>
        </label>
        <div className="flex gap-3 justify-center">
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Choose File
          </label>
          <button
            onClick={onOpenDialog}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>
    </div>
  );
}
