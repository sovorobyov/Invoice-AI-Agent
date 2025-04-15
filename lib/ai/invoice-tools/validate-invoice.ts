import { tool } from 'ai';
import { z } from 'zod';
import { type Attachment } from 'ai';
import { generateObject } from 'ai';
import { myProvider } from '../models'; // Import configured provider

// Schema for the AI's validation result
const ValidationResultSchema = z.object({
  isInvoice: z.boolean().describe('Whether the document appears to be an invoice.'),
  confidenceScore: z.number().min(0).max(100).describe('Confidence level (0-100) that this is an invoice.'),
  issues: z.string().optional().describe('Any reasons why this might not be a processable invoice (e.g., blurry, missing key fields, wrong document type).'),
});

export const validateInvoice = tool({
  description: 'Uses AI to validate if the attached file is likely an invoice and notes potential issues.',
  parameters: z.object({
    attachment: z.object({
      url: z.string().describe('The data URL or path of the file.'),
      contentType: z.string().optional().describe('The MIME type of the file.'),
      name: z.string().optional().describe('The name of the file.')
    }).describe('The file attachment to validate.'),
  }),
  execute: async ({ attachment }) => {
    console.log(`[Tool Call] validateInvoice starting AI validation for: ${attachment.name || 'unnamed file'}`);

    if (!attachment.url) {
      console.error('[Tool Call] validateInvoice failed: Missing attachment URL.');
      return { isValid: false, message: 'Missing attachment URL.', attachment: undefined };
    }
    
    // Basic type check before sending to AI
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!attachment.contentType || !supportedTypes.includes(attachment.contentType)) {
      const message = `File type (${attachment.contentType || 'unknown'}) is not supported. Supported: PDF, JPEG, PNG.`;
      console.warn(`[Tool Call] validateInvoice failed: ${message}`);
      return { isValid: false, message, attachment: undefined };
    }

    try {
      const { object: validationResult } = await generateObject({
        model: myProvider.languageModel('claude-3.5-sonnet'), // Or another suitable model
        schema: ValidationResultSchema,
        messages: [
            {
                role: 'user',
                content: 'Please validate the attached document.',
                experimental_attachments: [attachment] // Pass the attachment correctly
            }
        ]
      });

      const isValid = validationResult.isInvoice && validationResult.confidenceScore >= 85; // Example threshold
      const message = isValid 
        ? `Validation successful (Confidence: ${validationResult.confidenceScore}%). ${validationResult.issues || 'No immediate issues noted.'}` 
        : `Document might not be a valid invoice (Confidence: ${validationResult.confidenceScore}%). Issues: ${validationResult.issues || 'Type mismatch or low confidence.'}`;
      
      console.log(`[Tool Call] validateInvoice result for ${attachment.name || 'unnamed file'}: isValid=${isValid}, Score=${validationResult.confidenceScore}, Issues='${validationResult.issues || 'None'}'`);

      return { 
        isValid: isValid,
        message: message,
        attachment: isValid ? attachment : undefined // Only pass attachment if valid
      };

    } catch (error: any) {
      console.error(`[Tool Call] validateInvoice AI validation failed for ${attachment.name || 'unnamed file'}:`, error);
      return { 
        isValid: false, 
        message: `AI validation failed: ${error.message || 'Unknown error'}`,
        attachment: undefined 
      };
    }
  },
}); 