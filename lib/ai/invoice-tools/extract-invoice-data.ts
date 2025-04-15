import { CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { type Attachment } from 'ai';
import { generateObject } from 'ai';
import { myProvider } from '../models'; // Import configured provider

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
      url: z.string().describe('The URL of the validated invoice file.'),
      contentType: z.string().optional().describe('The MIME type of the file.'),
      name: z.string().optional().describe('The name of the file.'),
    }).describe('The validated invoice attachment to process.'),
  }),
  execute: async ({ attachment }) => {
    console.log(`[Tool Call] extractInvoiceData starting for: ${attachment.name || 'unnamed file'}`);

    if (!attachment.url) {
      console.log(`[Tool Call] extractInvoiceData failed: Attachment URL missing.`);
      return { error: 'Attachment URL missing.' };
    }

    try {
      console.log(`Using Claude to extract data from invoice document`);

      // Using the object generation approach with Claude to parse the invoice
      const { object: extractedData } = await generateObject({
        model: myProvider.languageModel('claude-3.5-sonnet'),
        schema: InvoiceDataSchema,
        messages: [
          {
            role: 'user',
            content: 'Extract all key information from this invoice document including customer name, vendor name, invoice number, dates, amount, and all line items with descriptions, quantities, unit prices, and totals.',
            experimental_attachments: [{
              url: attachment.url,
              contentType: attachment.contentType || 'application/pdf',
              name: attachment.name || 'invoice.pdf'
            }]
          }
        ]
      });

      console.log(`[Tool Call] extractInvoiceData succeeded for: ${attachment.name || 'unnamed file'}`);
      return { 
        ...extractedData,
        message: 'Invoice data extracted successfully.'
      };
    } catch (error: any) {
      console.error(`[Tool Call] extractInvoiceData failed:`, error);
      return { error: `AI extraction failed: ${error.message || 'Unknown error'}` };
    }
  },
});