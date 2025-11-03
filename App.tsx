import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileDropzone from './components/FileDropzone';
import PdfEditor from './components/PdfEditor';
import { DownloadIcon, SettingsIcon } from './components/Icons';
import SettingsMenu from './components/SettingsMenu';
import { useSettings } from './contexts/SettingsContext';


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

/**
 * Processes an image file to make its white background transparent.
 * @param imageFile The image file to process.
 * @returns A Promise that resolves with a Blob of the new PNG image.
 */
const removeWhiteBackground = (imageFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 240; // Pixels with R,G,B values all above this will be transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // Make pixel transparent
          }
        }
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob conversion failed'));
        }, 'image/png'); // Always output as PNG to support transparency
      };
      img.onerror = (e) => reject(e);
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('FileReader did not return a result'));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(imageFile);
  });
};


const App: React.FC = () => {
  const { t } = useSettings();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [image, setImage] = useState<ImageState>(initialImageState);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isImageProcessing, setIsImageProcessing] = useState<boolean>(false);
  const [removeImageBg, setRemoveImageBg] = useState<boolean>(true); // Default to true
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handlePdfDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
    } else {
      setError(t('errorInvalidPdf'));
    }
  }, [t]);

  const handleImageDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
        setIsImageProcessing(true);
        setError(null);
        try {
            let finalFile = file;
            if (removeImageBg) {
                const transparentBlob = await removeWhiteBackground(file);
                const newName = file.name.substring(0, file.name.lastIndexOf('.')) + '.png';
                finalFile = new File([transparentBlob], newName, { type: 'image/png' });
            }

            if (image.objectUrl) {
                URL.revokeObjectURL(image.objectUrl);
            }

            setImage({
                ...initialImageState,
                file: finalFile,
                objectUrl: URL.createObjectURL(finalFile)
            });
        } catch (err) {
            console.error("Image processing failed:", err);
            setError(t('errorProcessImage'));
            setImage(initialImageState);
        } finally {
            setIsImageProcessing(false);
        }
    } else {
        setError(t('errorInvalidImage'));
    }
  }, [removeImageBg, image.objectUrl, t]);
  
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
    return () => {
      if (image.objectUrl) {
        URL.revokeObjectURL(image.objectUrl);
      }
    };
  }, [image.objectUrl]);

  const mergeAndDownload = async (pageIndex: number, scale: number) => {
    if (!pdfFile || !image.file) {
      setError(t('errorMissingFiles'));
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
        throw new Error(t('errorUnsupportedImageType'));
      }
      
      const pageHeight = page.getHeight();

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
      const message = err instanceof Error ? err.message : t('errorMerge');
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <header className="py-4 px-6 text-center shadow-lg bg-brand-surface relative">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider">{t('headerTitle')}</h1>
        <p className="text-brand-text-secondary mt-1 text-sm sm:text-base">{t('headerSubtitle')}</p>
        <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
              className="p-2 rounded-full hover:bg-overlay-bg/10 transition-colors"
              aria-label={t('settingsTitle')}
            >
                <SettingsIcon className="w-6 h-6" />
            </button>
            {isSettingsOpen && <SettingsMenu onClose={() => setIsSettingsOpen(false)} />}
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/3 flex flex-col gap-6">
          <FileDropzone
            onDrop={handlePdfDrop}
            accept={{ 'application/pdf': ['.pdf'] }}
            file={pdfFile}
            prompt={t('dropzonePdfPrompt')}
            fileType="PDF"
            disabled={isImageProcessing || isProcessing}
          />
          <FileDropzone
            onDrop={handleImageDrop}
            accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}
            file={image.file}
            prompt={isImageProcessing ? t('dropzoneProcessing') : t('dropzoneImagePrompt')}
            fileType="Image"
            disabled={isImageProcessing || isProcessing}
          />
          
          <div className="bg-brand-surface p-4 rounded-lg shadow-lg flex items-center justify-between text-sm">
            <label htmlFor="transparent-toggle" className="font-semibold text-brand-text flex-grow pr-4 cursor-pointer">{t('transparentToggle')}</label>
            <button
              id="transparent-toggle"
              role="switch"
              aria-checked={removeImageBg}
              onClick={() => setRemoveImageBg(!removeImageBg)}
              disabled={isImageProcessing || isProcessing}
              className={`${
                removeImageBg ? 'bg-brand-primary' : 'bg-gray-400 dark:bg-gray-600'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-brand-surface disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`${
                  removeImageBg ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
           <p className="text-xs text-brand-text-secondary px-1 -mt-4">{t('transparentTooltip')}</p>

          
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
              <DownloadIcon className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-brand-text">{t('previewAreaTitle')}</h2>
              <p className="mt-2 max-w-sm">{t('previewAreaSubtitle')}</p>
            </div>
          )}
        </section>
      </main>

      <footer className="text-center py-4 px-6 text-brand-text-secondary text-sm bg-brand-surface/50">
        <p>{t('footerCopyright')}</p>
        <a href="mailto:gold.noam@gmail.com" className="hover:text-brand-primary transition-colors">{t('footerFeedback')}</a>
      </footer>
    </div>
  );
};

export default App;