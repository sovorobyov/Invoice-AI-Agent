import { tool } from 'ai';
import { z } from 'zod';
import { type Attachment } from 'ai';

// TODO: Implement actual validation logic

export const validateInvoice = tool({
  description: 'Validates if the attached file appears to be a valid invoice and not another document type (e.g., receipt, statement). Checks basic structure or keywords.',
  parameters: z.object({
    attachment: z.object({
        url: z.string().describe('The data URL or path of the file.'),
        contentType: z.string().optional().describe('The MIME type of the file.'),
        name: z.string().optional().describe('The name of the file.'),
    }).describe('The file attachment to validate.'),
  }),
  execute: async ({ attachment }) => {
    console.log(`[Tool Call] validateInvoice for: ${attachment.name}`)
    // --- Basic Content Type Validation --- 
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    let isValid = false;
    let message = `File type (${attachment.contentType || 'unknown'}) is not supported for invoices.`;

    if (attachment.contentType && supportedTypes.includes(attachment.contentType)) {
        // Basic check passed. Assume it might be an invoice for now.
        // TODO: Implement more robust validation (e.g., keyword check, OCR, lightweight AI check)
        isValid = true;
        message = 'File type accepted. Proceeding with extraction.';
    } else {
        console.warn(`[validateInvoice] Unsupported content type: ${attachment.contentType}`);
    }

    return { 
        isValid: isValid,
        message: message
    };
  },
}); 