import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, ResetIcon, ClearIcon } from './Icons';
import DraggableResizableImage from './DraggableResizableImage';

// pdfjs-dist is not imported via npm, so we use a dynamic import from a CDN.
// This is a common pattern when ESM modules are loaded from URLs.
const pdfjsLibPromise = import( /* @vite-ignore */ 'https://unpkg.com/pdfjs-dist@4.3.136/build/pdf.min.mjs');
pdfjsLibPromise.then(pdfjsLib => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.3.136/build/pdf.worker.min.mjs';
});

interface PdfEditorProps {
  pdfFile: File;
  image: { url: string; position: { x: number; y: number }; size: { width: number; height: number }; } | null;
  onImageUpdate: (pos: { x: number; y: number }, size: { width: number; height: number }) => void;
  onImageReset: () => void;
  onImageClear: () => void;
  onMerge: (pageIndex: number, scale: number) => void;
  isProcessing: boolean;
}

const PdfEditor: React.FC<PdfEditorProps> = ({ pdfFile, image, onImageUpdate, onMerge, isProcessing, onImageReset, onImageClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc) return;
    setIsLoading(true);
    const page = await pdfDoc.getPage(pageNumber);
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerWidth = container.clientWidth;
    const viewport = page.getViewport({ scale: 1.0 });
    const calculatedScale = containerWidth / viewport.width;
    setScale(calculatedScale);
    const scaledViewport = page.getViewport({ scale: calculatedScale });

    const context = canvas.getContext('2d');
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    
    if (context) {
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
    }
    setIsLoading(false);
  }, [pdfDoc]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdfjsLib = await pdfjsLibPromise;
        const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(pdfFile));
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    loadPdf();
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  useEffect(() => {
    const handleResize = () => {
        if(pdfDoc) renderPage(currentPage);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, renderPage]);


  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  const handleMergeClick = () => {
    // pdf-lib is 0-indexed, UI is 1-indexed
    onMerge(currentPage - 1, scale);
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-black/20">
      <div ref={containerRef} className="flex-grow flex items-center justify-center p-4 overflow-auto relative">
        {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"><div className="loader"></div><style>{`.loader { border: 4px solid #f3f3f340; border-top: 4px solid #6a45ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style></div>}
        <div style={{ position: 'relative', lineHeight: 0 }}>
            <canvas ref={canvasRef} className="rounded-md shadow-lg" />
            {image && canvasRef.current && (
                <DraggableResizableImage 
                    src={image.url} 
                    initialPosition={image.position} 
                    initialSize={image.size}
                    onUpdate={onImageUpdate}
                    bounds={{
                        top: 0,
                        left: 0,
                        right: canvasRef.current.width,
                        bottom: canvasRef.current.height
                    }}
                />
            )}
        </div>
      </div>
      <div className="flex-shrink-0 bg-brand-surface/70 backdrop-blur-sm p-3 flex justify-between items-center border-t border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={goToPrevPage} disabled={currentPage <= 1} className="p-2 rounded-md hover:bg-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <button onClick={goToNextPage} disabled={currentPage >= totalPages} className="p-2 rounded-md hover:bg-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
            {image && (
                <>
                    <button onClick={onImageReset} disabled={isProcessing} className="p-2 rounded-md hover:bg-brand-primary/20 disabled:opacity-50 transition-colors" title="Reset Image Position & Size">
                        <ResetIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onImageClear} disabled={isProcessing} className="p-2 rounded-md hover:bg-brand-secondary/20 disabled:opacity-50 transition-colors" title="Remove Image">
                        <ClearIcon className="w-5 h-5 text-brand-secondary" />
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                </>
            )}
            <button
              onClick={handleMergeClick}
              disabled={!image || isProcessing}
              className="bg-brand-primary hover:bg-brand-primary/80 disabled:bg-gray-500 disabled:cursor-wait text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-5 h-5" />
                  <span>Merge & Download</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PdfEditor;