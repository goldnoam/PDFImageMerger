import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileDropzone from './components/FileDropzone';
import PdfEditor from './components/PdfEditor';
import { DownloadIcon } from './components/Icons';

// pdf-lib is loaded from CDN and available as a global
declare const PDFLib: any;

interface ImageState {
  file: File | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
  objectUrl: string | null;
}

const initialImageState: ImageState = {
  file: null,
  position: { x: 50, y: 50 },
  size: { width: 150, height: 100 },
  objectUrl: null,
};

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [image, setImage] = useState<ImageState>(initialImageState);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePdfDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
    } else {
      setError('Invalid file type. Please upload a PDF.');
    }
  }, []);

  const handleImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      setImage(prev => ({ 
        ...initialImageState,
        file, 
        objectUrl: URL.createObjectURL(file) 
      }));
      setError(null);
    } else {
      setError('Invalid file type. Please upload an image.');
    }
  }, []);
  
  const handleImageUpdate = useCallback((pos: {x: number, y: number}, size: {width: number, height: number}) => {
    setImage(prev => ({...prev, position: pos, size: size}));
  }, []);

  const handleImageReset = useCallback(() => {
    setImage(prev => ({
      ...prev,
      position: initialImageState.position,
      size: initialImageState.size,
    }));
  }, []);

  const handleImageClear = useCallback(() => {
    if (image.objectUrl) {
      URL.revokeObjectURL(image.objectUrl);
    }
    setImage(initialImageState);
  }, [image.objectUrl]);


  useEffect(() => {
    // Cleanup object URL
    return () => {
      if (image.objectUrl) {
        URL.revokeObjectURL(image.objectUrl);
      }
    };
  }, [image.objectUrl]);

  const mergeAndDownload = async (pageIndex: number, scale: number) => {
    if (!pdfFile || !image.file) {
      setError("Please upload both a PDF and an image file.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { PDFDocument } = PDFLib;

      const pdfBuffer = await pdfFile.arrayBuffer();
      const imageBuffer = await image.file.arrayBuffer();

      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const page = pdfDoc.getPages()[pageIndex];

      let embeddedImage;
      if (image.file.type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(imageBuffer);
      } else if (image.file.type === 'image/jpeg') {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      } else {
        throw new Error('Unsupported image type. Please use PNG or JPG.');
      }
      
      const pageHeight = page.getHeight();

      // Convert pixel-based position and size to PDF points
      const x_pt = image.position.x / scale;
      const y_pt = pageHeight - (image.position.y / scale) - (image.size.height / scale);
      const width_pt = image.size.width / scale;
      const height_pt = image.size.height / scale;
      
      page.drawImage(embeddedImage, {
        x: x_pt,
        y: y_pt,
        width: width_pt,
        height: height_pt,
      });

      const pdfBytes = await pdfDoc.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `merged-${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during merging.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <header className="py-4 px-6 text-center shadow-lg bg-brand-surface">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider">PDF Image Merger</h1>
        <p className="text-brand-text-secondary mt-1 text-sm sm:text-base">Drag, drop, and position your image on any PDF page.</p>
      </header>

      <main className="flex-grow container mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/3 flex flex-col gap-6">
          <FileDropzone
            onDrop={handlePdfDrop}
            accept={{ 'application/pdf': ['.pdf'] }}
            file={pdfFile}
            prompt="Drop PDF Here"
            fileType="PDF"
          />
          <FileDropzone
            onDrop={handleImageDrop}
            accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}
            file={image.file}
            prompt="Drop Image Here"
            fileType="Image"
          />
          
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md border border-red-500/50">{error}</div>}
        </aside>

        <section className="lg:w-2/3 flex-grow flex flex-col bg-brand-surface rounded-lg shadow-2xl overflow-hidden">
          {pdfFile ? (
            <PdfEditor
              pdfFile={pdfFile}
              image={image.file && image.objectUrl ? {
                url: image.objectUrl,
                position: image.position,
                size: image.size
              } : null}
              onImageUpdate={handleImageUpdate}
              onImageReset={handleImageReset}
              onImageClear={handleImageClear}
              onMerge={mergeAndDownload}
              isProcessing={isProcessing}
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-brand-text-secondary">
              <DownloadIcon className="w-16 h-16 mb-4 text-gray-600" />
              <h2 className="text-xl font-semibold text-brand-text">PDF Preview Area</h2>
              <p className="mt-2 max-w-sm">Once you upload a PDF file, it will be displayed here for you to edit.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="text-center py-4 px-6 text-brand-text-secondary text-sm bg-brand-surface/50">
        <p>(C) Noam Gold AI 2025</p>
        <a href="mailto:gold.noam@gmail.com" className="hover:text-brand-primary transition-colors">Send Feedback</a>
      </footer>
    </div>
  );
};

export default App;