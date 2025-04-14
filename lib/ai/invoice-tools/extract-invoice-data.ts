import { tool } from 'ai';
import { z } from 'zod';
import { type Attachment } from 'ai';
import { generateObject } from 'ai';
import { myProvider } from '../models'; // Import configured provider

// TODO: Implement actual AI extraction logic

// Define the Zod schema for the expected output structure
export const InvoiceDataSchema = z.object({
  customer_name: z.string().optional().describe('The name of the customer being billed.'),
  vendor_name: z.string().optional().describe('The name of the vendor issuing the invoice.'),
  invoice_number: z.string().optional().describe('The unique identifier for the invoice.'),
  invoice_date: z.string().optional().describe('The date the invoice was issued (YYYY-MM-DD).'),
  due_date: z.string().optional().describe('The date the payment is due (YYYY-MM-DD).'),
  amount: z.number().optional().describe('The total amount due on the invoice.'),
  line_items: z.array(z.object({
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the item.'),
    unit_price: z.number().optional().describe('Price per unit of the item.'),
    total: z.number().optional().describe('Total price for the line item (quantity * unit_price).'),
  })).optional().describe('List of line items on the invoice.'),
});

export const extractInvoiceData = tool({
  description: 'Extracts key information (customer name, vendor name, invoice number, dates, amount, line items) from a validated invoice file using AI.',
  parameters: z.object({
     attachment: z.object({
        url: z.string().describe('The data URL or path of the validated invoice file.'),
        contentType: z.string().optional().describe('The MIME type of the file.'),
        name: z.string().optional().describe('The name of the file.'),
    }).describe('The validated invoice attachment to process.'),
  }),
  execute: async ({ attachment }) => {
    console.log(`[Tool Call] extractInvoiceData starting for: ${attachment.name}`);
    // Simulate streaming update
    // dataStream?.appendMessageAnnotation({ tool_call_id, type: 'tool_status', status: 'running', data: 'Extracting invoice details...' });

    if (!attachment.url || !attachment.contentType) {
      return { error: 'Attachment URL or content type missing.' };
    }

    // Extract base64 content from data URL
    const base64Data = attachment.url.split(',')[1];
    if (!base64Data) {
        return { error: 'Could not extract base64 data from URL.' };
    }

    try {
      const { object: extractedData } = await generateObject({
        model: myProvider.languageModel('claude-3.5-sonnet'),
        schema: InvoiceDataSchema,
        prompt: `You are an expert invoice processing AI. Extract the key information from the following invoice. The file is provided as a base64 encoded string. Respond ONLY with the JSON object matching the provided schema. Invoice Content (base64): ${base64Data}`,
        // Include the content type if needed by the model (Claude might use it)
        // messages: [
        //     { role: 'user', content: [ { type: 'image', image: attachment.url } ]}
        // ] // Alternative for models supporting direct image URLs/data
      });

      console.log(`[Tool Call] extractInvoiceData succeeded for: ${attachment.name}`);
      return { 
        ...extractedData,
        message: 'Invoice data extracted successfully.'
      };
    } catch (error) {
        console.error(`[Tool Call] extractInvoiceData failed for ${attachment.name}:`, error);
        return { error: 'AI extraction failed. Please check the model or prompt.' };
    }
  },
}); 