import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { invoices, line_items } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { InvoiceDataSchema } from './extract-invoice-data';

// Define schema for extracted data (matching extractInvoiceData output)
// Reusing the schema from extract-invoice-data.ts

// Define TypeScript type from the Zod schema

export const saveInvoiceToDb = tool({
  description: 'Saves the extracted invoice data (header and line items) to the database. Performs duplicate checks before saving.',
  parameters: z.object({
    extractedData: InvoiceDataSchema.describe('The extracted invoice data from the AI.'),
    // Optionally include attachment reference if needed for file path
    // attachment: z.object({ url: z.string(), name: z.string().optional(), contentType: z.string().optional() }).optional(), 
  }),
  execute: async ({ extractedData }) => {
    console.log(`[Tool Call] saveInvoiceToDb attempting for: `, extractedData);
    const { vendor_name, invoice_number, amount, line_items: itemsToInsert, ...invoiceHeader } = extractedData;
    console.log(`[Tool Call] saveInvoiceToDb attempting for: ${invoice_number || 'Unknown Invoice'}`);

    try {
      // 1. Duplicate Check (Vendor Name, Invoice Number, Amount)
      if (vendor_name && invoice_number && amount) {
        const existing = await db.select()
          .from(invoices)
          .where(
            and(
              eq(invoices.vendor_name, vendor_name),
              eq(invoices.invoice_number, invoice_number),
              eq(invoices.amount, amount)
            )
          ).limit(1);

        if (existing.length > 0) {
          console.log(`[Tool Call] Duplicate invoice found for ${invoice_number}.`);
          return {
            success: false,
            invoiceId: existing[0].id,
            message: `Duplicate: This invoice (Vendor: ${vendor_name}, Number: ${invoice_number}, Amount: ${amount}) appears to already exist in the system with ID ${existing[0].id}.`
          };
        }
      }

      // 2. Insert Invoice and Line Items in Transaction
      let insertedInvoiceId: number | undefined;
      await db.transaction(async (tx) => {
        // Insert invoice header
        const result = await tx.insert(invoices).values({
            ...invoiceHeader,
            vendor_name, // Ensure these are included
            invoice_number,
            amount,
            status: 'PROCESSED', // Set initial status
            // TODO: Convert date strings to Date objects if schema expects them
            invoice_date: invoiceHeader.invoice_date && !isNaN(Date.parse(invoiceHeader.invoice_date)) ? new Date(invoiceHeader.invoice_date) : undefined,
            due_date: invoiceHeader.due_date && !isNaN(Date.parse(invoiceHeader.due_date)) ? new Date(invoiceHeader.due_date) : undefined,
            created_at: new Date(), // Set creation timestamp
            updated_at: new Date(), // Set updated timestamp
        }).returning({ id: invoices.id });

        if (!result || result.length === 0) {
            throw new Error('Failed to insert invoice header.');
        }
        insertedInvoiceId = result[0].id;

        // Insert line items if they exist
        if (itemsToInsert && itemsToInsert.length > 0) {
          await tx.insert(line_items).values(
            itemsToInsert.map((item) => ({
                ...item,
                invoice_id: insertedInvoiceId!,
            }))
          );
        }
      });

      if (insertedInvoiceId === undefined) {
          throw new Error('Transaction failed, invoice ID not obtained.');
      }

      console.log(`[Tool Call] Successfully saved invoice ID: ${insertedInvoiceId}`);
      return {
        success: true,
        invoiceId: insertedInvoiceId,
        message: `Invoice ${invoice_number || 'Unknown'} saved successfully with ID ${insertedInvoiceId}.`
      };

    } catch (error) {
      console.error(`[Tool Call] saveInvoiceToDb failed for ${invoice_number || 'Unknown Invoice'}:`, error);
      return {
        success: false,
        message: `Error saving invoice to database: ${(error as Error).message}`
      };
    }
  },
}); 