'use client';

import { useEffect } from 'react';

// Error categories for better error handling
const ERROR_CATEGORIES = {
  INVOICE_PROCESSING: 'invoice_processing',
  FILE_UPLOAD: 'file_upload',
  AI_INTERACTION: 'ai_interaction',
  AUTHENTICATION: 'authentication',
  UNKNOWN: 'unknown'
} as const;

function categorizeError(error: Error): typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES] {
  const message = error.message.toLowerCase();
  
  if (message.includes('invoice') || message.includes('pdf')) {
    return ERROR_CATEGORIES.INVOICE_PROCESSING;
  }
  if (message.includes('upload') || message.includes('file')) {
    return ERROR_CATEGORIES.FILE_UPLOAD;
  }
  if (message.includes('ai') || message.includes('openai') || message.includes('claude')) {
    return ERROR_CATEGORIES.AI_INTERACTION;
  }
  if (message.includes('auth') || message.includes('permission') || message.includes('access')) {
    return ERROR_CATEGORIES.AUTHENTICATION;
  }
  return ERROR_CATEGORIES.UNKNOWN;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const category = categorizeError(error);
    
    // Enhanced error logging with categorization and context
    console.error('Global error:', {
      category,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }, [error]);

  const errorCategory = categorizeError(error);
  const errorMessages = {
    [ERROR_CATEGORIES.INVOICE_PROCESSING]: 'There was an issue processing the invoice. Please try again or contact support if the issue persists.',
    [ERROR_CATEGORIES.FILE_UPLOAD]: 'We encountered a problem with the file upload. Please ensure your file meets the requirements and try again.',
    [ERROR_CATEGORIES.AI_INTERACTION]: 'The AI processing service is currently experiencing issues. Please try again in a few moments.',
    [ERROR_CATEGORIES.AUTHENTICATION]: 'There was an authentication error. Please try logging in again.',
    [ERROR_CATEGORIES.UNKNOWN]: 'An unexpected error occurred. Our team has been notified.'
  };

  return (
    <html>
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="rounded-lg bg-card p-8 shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Something went wrong!
            </h2>
            <p className="text-muted-foreground mb-4">
              {errorMessages[errorCategory]}
            </p>
            <div className="flex justify-end gap-4">
              <a
                href="/"
                className="text-primary hover:text-primary/90 px-4 py-2"
              >
                Go Home
              </a>
              <button
                onClick={() => reset()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 