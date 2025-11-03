import React, { useCallback, useState } from 'react';
import { UploadIcon, FileIcon, ImageIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept: { [key: string]: string[] };
  file: File | null;
  prompt: string;
  fileType: 'PDF' | 'Image';
  disabled?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onDrop, accept, file, prompt, fileType, disabled = false }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const { t } = useSettings();

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(Array.from(e.dataTransfer.files));
    }
  }, [onDrop, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      onDrop(Array.from(e.target.files));
    }
  };

  const inputId = `file-input-${fileType.toLowerCase()}`;
  const acceptString = Object.keys(accept).join(',');

  return (
    <div className="bg-brand-surface p-4 rounded-lg shadow-lg">
      <label
        htmlFor={inputId}
        className={`flex flex-col items-center justify-center w-full h-32 px-4 text-center border-2 border-dashed rounded-lg transition-colors
        ${isDragActive && !disabled ? 'border-brand-primary bg-brand-primary/10' : 'border-border-color'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-text-secondary hover:bg-overlay-bg/5'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <UploadIcon className="w-8 h-8 mb-2 text-brand-text-secondary" />
        <p className="font-semibold text-brand-text">{prompt}</p>
        <p className="text-xs text-brand-text-secondary">{t('dropzoneOrClick')}</p>
        <input id={inputId} type="file" className="hidden" onChange={handleChange} accept={acceptString} disabled={disabled} />
      </label>
      {file && (
        <div className="mt-4 p-3 bg-overlay-bg/10 rounded-md flex items-center gap-3 text-sm">
          {fileType === 'PDF' ? <FileIcon className="w-5 h-5 text-brand-secondary" /> : <ImageIcon className="w-5 h-5 text-brand-primary" />}
          <span className="truncate flex-1" title={file.name}>{file.name}</span>
          <span className="text-brand-text-secondary flex-shrink-0">{(file.size / 1024).toFixed(2)} {t('fileSizeKB')}</span>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
