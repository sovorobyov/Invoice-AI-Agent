import { tool } from 'ai';
import { z } from 'zod';

// TODO: Implement actual summary generation or retrieval

export const summarizeInvoiceData = tool({
  description: 'Provides a concise summary of the saved invoice data to the user.',
  parameters: z.object({
    invoiceId: z.number().describe('The ID of the saved invoice in the database.'),
    // Optionally pass saved data if easier than re-querying
    // savedData: ExtractedInvoiceDataSchema.optional().describe('The data that was just saved.')
  }),
  execute: async ({ invoiceId }) => {
    console.log(`[Tool Call] summarizeInvoiceData for ID: ${invoiceId}`);

    // TODO: Optionally fetch saved data using invoiceId for a more detailed summary

    const summaryMessage = `Successfully processed and saved invoice with ID: ${invoiceId}. You can view it in the invoice management table.`;

    // dataStream?.appendMessageAnnotation({ tool_call_id, type: 'tool_status', status: 'complete', data: summaryMessage });

    return { summary: summaryMessage };
  },
}); 