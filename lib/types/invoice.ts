export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  confidence: number;
}

export interface ExtractedInvoiceData {
  customer: {
    name: string;
    confidence: number;
  };
  vendor: {
    name: string;
    confidence: number;
  };
  invoice: {
    number: string;
    confidence: number;
    date: string;
    date_confidence: number;
    due_date: string;
    due_date_confidence: number;
    total_amount: number;
    total_amount_confidence: number;
  };
  line_items: InvoiceLineItem[];
}

export interface InvoiceValidationResult {
  is_valid: boolean;
  is_invoice: boolean;
  missing_fields: string[];
  validation_errors: string[];
  warnings: string[];
  confidence: number;
}

export interface ProcessingState {
  stage: 'validating' | 'extracting' | 'storing' | 'error' | 'complete';
  progress: number;
  message: string;
  error?: string;
}

export interface ProcessingContext {
  fileUrl: string;
  fileName: string;
  fileType: string;
  state: ProcessingState;
  extractedData?: ExtractedInvoiceData;
  validationResult?: InvoiceValidationResult;
} 