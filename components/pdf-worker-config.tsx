'use client';

import { useEffect } from 'react';
import { pdfjs } from 'react-pdf';

// Configure the PDF worker source
// This points to the worker file provided by react-pdf/node_modules/pdfjs-dist
// Adjust the path if your setup/bundler places it elsewhere
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import styles for react-pdf (optional, but recommended for default UI elements)
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';


export function PdfWorkerConfig({ children }: { children: React.ReactNode }) {
  // This component doesn't render anything itself, just ensures config runs client-side
  return <>{children}</>;
} 