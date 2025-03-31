import { type Message, streamText, type JSONValue } from 'ai';
import { myProvider } from '@/lib/ai/models';
import {
  invoiceSystemPrompt,
  invoiceExtractionPrompt,
  invoiceValidationPrompt,
  invoiceErrorPrompt,
} from '@/lib/ai/prompts/invoice';
import type {
  ExtractedInvoiceData,
  InvoiceValidationResult,
  ProcessingContext,
  ProcessingState,
} from '@/lib/types/invoice';
import { DataStreamWriter } from 'ai';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

export class InvoiceProcessor {
  private context: ProcessingContext;
  private dataStream: DataStreamWriter;
  private pdfContent: string | null = null;

  constructor(
    fileUrl: string,
    fileName: string,
    fileType: string,
    dataStream: DataStreamWriter
  ) {
    console.log('Initializing InvoiceProcessor:', {
      fileName,
      fileType,
      fileUrl: fileUrl.substring(0, 50) + '...' // Truncate for logging
    });

    this.context = {
      fileUrl,
      fileName,
      fileType,
      state: {
        stage: 'validating',
        progress: 0,
        message: 'Starting document validation...',
      },
    };
    this.dataStream = dataStream;
  }

  private async extractPdfContent(): Promise<string> {
    if (this.pdfContent !== null) {
      return this.pdfContent;
    }

    try {
      console.log('Reading PDF file:', this.context.fileUrl);
      const dataBuffer = await fs.readFile(this.context.fileUrl);
      
      console.log('Parsing PDF content...');
      const data = await pdfParse(dataBuffer);
      
      this.pdfContent = data.text;
      console.log('PDF content extracted successfully');
      
      return this.pdfContent;
    } catch (error) {
      console.error('Failed to extract PDF content:', error);
      throw new Error('Failed to read or parse the PDF file');
    }
  }

  private updateState(update: Partial<ProcessingContext['state']>) {
    this.context.state = { ...this.context.state, ...update };
    
    // Ensure we only send JSON-compatible values
    const stateData: JSONValue = {
      stage: this.context.state.stage,
      progress: this.context.state.progress,
      message: this.context.state.message,
      error: this.context.state.error || null,
    };
    
    console.log('Invoice processing state update:', stateData);
    
    this.dataStream.writeData({
      type: 'processing-state',
      data: stateData,
    });
  }

  private async handleError(error: Error) {
    console.error('Invoice processing error:', {
      error: error.message,
      stack: error.stack,
      context: {
        fileName: this.context.fileName,
        stage: this.context.state.stage,
        progress: this.context.state.progress
      }
    });

    try {
      const { fullStream } = await streamText({
        model: myProvider.languageModel('chat-model-large'),
        system: invoiceSystemPrompt,
        messages: [
          {
            role: 'user',
            content: invoiceErrorPrompt.replace('{error}', error.message),
          },
        ],
      });

      let errorMessage = '';
      for await (const chunk of fullStream) {
        if (chunk.type === 'text-delta') {
          errorMessage += chunk.textDelta;
        }
      }

      this.updateState({
        stage: 'error',
        message: errorMessage,
        error: error.message,
      });
    } catch (aiError) {
      console.error('Failed to generate error message:', aiError);
      this.updateState({
        stage: 'error',
        message: 'Failed to process invoice. Please try again.',
        error: error.message,
      });
    }

    throw error;
  }

  async validateDocument(): Promise<InvoiceValidationResult> {
    try {
      console.log('Starting document validation for:', this.context.fileName);
      
      this.updateState({
        stage: 'validating',
        progress: 25,
        message: 'Analyzing document type and structure...',
      });

      // Extract PDF content
      const pdfContent = await this.extractPdfContent();

      const { fullStream } = await streamText({
        model: myProvider.languageModel('chat-model-large'),
        system: invoiceSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `${invoiceValidationPrompt}\n\nDocument Content:\n${pdfContent}`,
          },
        ],
      });

      let validationResponse = '';
      for await (const chunk of fullStream) {
        if (chunk.type === 'text-delta') {
          validationResponse += chunk.textDelta;
        }
      }

      console.log('Validation response received:', validationResponse);

      const validationResult: InvoiceValidationResult = JSON.parse(validationResponse);
      this.context.validationResult = validationResult;

      console.log('Document validation result:', {
        fileName: this.context.fileName,
        isValid: validationResult.is_valid,
        isInvoice: validationResult.is_invoice,
        errors: validationResult.validation_errors
      });

      this.updateState({
        progress: 50,
        message: validationResult.is_valid
          ? 'Document validated successfully.'
          : 'Document validation failed.',
      });

      return validationResult;
    } catch (error) {
      console.error('Document validation failed:', {
        error,
        fileName: this.context.fileName
      });
      await this.handleError(error as Error);
      throw error;
    }
  }

  async extractInformation(): Promise<ExtractedInvoiceData> {
    try {
      console.log('Starting information extraction for:', this.context.fileName);
      
      this.updateState({
        stage: 'extracting',
        progress: 60,
        message: 'Extracting invoice information...',
      });

      // Extract PDF content
      const pdfContent = await this.extractPdfContent();

      const { fullStream } = await streamText({
        model: myProvider.languageModel('chat-model-large'),
        system: invoiceSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `${invoiceExtractionPrompt}\n\nDocument Content:\n${pdfContent}`,
          },
        ],
      });

      let extractionResponse = '';
      for await (const chunk of fullStream) {
        if (chunk.type === 'text-delta') {
          extractionResponse += chunk.textDelta;
        }
      }

      console.log('Extraction response received:', extractionResponse);

      const extractedData: ExtractedInvoiceData = JSON.parse(extractionResponse);
      this.context.extractedData = extractedData;

      console.log('Information extraction completed:', {
        fileName: this.context.fileName,
        vendor: extractedData.vendor.name,
        invoiceNumber: extractedData.invoice.number,
        lineItems: extractedData.line_items.length
      });

      this.updateState({
        progress: 90,
        message: 'Information extracted successfully.',
      });

      return extractedData;
    } catch (error) {
      console.error('Information extraction failed:', {
        error,
        fileName: this.context.fileName
      });
      await this.handleError(error as Error);
      throw error;
    }
  }

  async process(): Promise<ProcessingContext> {
    try {
      console.log('Starting invoice processing for:', this.context.fileName);
      
      const validationResult = await this.validateDocument();

      if (!validationResult.is_valid || !validationResult.is_invoice) {
        const error = new Error(
          'Invalid document: ' + validationResult.validation_errors.join(', ')
        );
        console.error('Validation failed:', {
          fileName: this.context.fileName,
          errors: validationResult.validation_errors
        });
        throw error;
      }

      const extractedData = await this.extractInformation();

      console.log('Invoice processing completed successfully:', {
        fileName: this.context.fileName,
        vendor: extractedData.vendor.name,
        invoiceNumber: extractedData.invoice.number
      });

      this.updateState({
        stage: 'complete',
        progress: 100,
        message: 'Invoice processed successfully.',
      });

      return this.context;
    } catch (error) {
      await this.handleError(error as Error);
      throw error;
    }
  }
} 