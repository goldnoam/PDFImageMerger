
import React, { useCallback, useState } from 'react';
import { UploadIcon, FileIcon, ImageIcon } from './Icons';

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept: { [key: string]: string[] };
  file: File | null;
  prompt: string;
  fileType: 'PDF' | 'Image';
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onDrop, accept, file, prompt, fileType }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(Array.from(e.dataTransfer.files));
    }
  }, [onDrop]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        className={`flex flex-col items-center justify-center w-full h-32 px-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-600 hover:border-gray-500 hover:bg-black/20'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <UploadIcon className="w-8 h-8 mb-2 text-gray-400" />
        <p className="font-semibold text-brand-text">{prompt}</p>
        <p className="text-xs text-brand-text-secondary">or click to browse</p>
        <input id={inputId} type="file" className="hidden" onChange={handleChange} accept={acceptString} />
      </label>
      {file && (
        <div className="mt-4 p-3 bg-black/30 rounded-md flex items-center gap-3 text-sm">
          {fileType === 'PDF' ? <FileIcon className="w-5 h-5 text-brand-secondary" /> : <ImageIcon className="w-5 h-5 text-brand-primary" />}
          <span className="truncate flex-1" title={file.name}>{file.name}</span>
          <span className="text-brand-text-secondary flex-shrink-0">{(file.size / 1024).toFixed(2)} KB</span>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
