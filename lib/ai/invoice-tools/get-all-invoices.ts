import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { invoices, line_items } from '../../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const getAllInvoices = tool({
  description: 'Fetches all invoices from the database and displays them in a table. DO NOT describe the data - it will be shown automatically in the table. DO NOT provide explanations or summaries before or after using this tool. Just display the table with minimal text.',
  parameters: z.object({
    limit: z.number().optional().default(50).describe('Maximum number of invoices to retrieve.'),
    includeLineItems: z.boolean().optional().default(true).describe('Whether to include line items for each invoice.'),
  }),
  execute: async ({ limit, includeLineItems }) => {
    console.log(`[Tool Call] getAllInvoices with limit: ${limit}, includeLineItems: ${includeLineItems}`);

    try {
      // Fetch all invoices ordered by created_at descending
      const allInvoices = await db.select()
        .from(invoices)
        .orderBy(desc(invoices.created_at))
        .limit(limit);

      if (allInvoices.length === 0) {
        return { 
          invoices: [],
          message: 'No invoices found.',
          tableComponentProps: {
            componentName: 'InvoiceTable',
            props: { invoices: [] }
          }
        };
      }

      let invoicesWithLineItems = allInvoices;

      // If line items are requested, fetch and associate them with their invoices
      if (includeLineItems) {
        // Get all invoice IDs
        const invoiceIds = allInvoices.map(invoice => invoice.id);
        
        // Fetch all related line items in a single query
        const allLineItems = await db.select()
          .from(line_items)
          .where(inArray(line_items.invoice_id, invoiceIds));
          
        // Associate line items with their invoices
        invoicesWithLineItems = allInvoices.map(invoice => ({
          ...invoice,
          line_items: allLineItems.filter(item => item.invoice_id === invoice.id)
        }));
      }

      const count = invoicesWithLineItems.length;
      const statuses = countStatuses(invoicesWithLineItems);
      
      return {
        invoices: invoicesWithLineItems,
        count,
        statuses,
        message: `${count} invoices displayed.`,
        tableComponentProps: {
          componentName: 'InvoiceTable',
          props: { invoices: invoicesWithLineItems }
        }
      };
    } catch (error) {
      console.error(`[Tool Call] getAllInvoices failed:`, error);
      return {
        invoices: [],
        error: `Failed to retrieve invoices: ${(error as Error).message}`,
        tableComponentProps: {
          componentName: 'InvoiceTable',
          props: { invoices: [] }
        }
      };
    }
  },
});

// Helper function to count invoices by status
function countStatuses(invoices: any[]) {
  const statuses: Record<string, number> = {
    'UPLOADED': 0,
    'PROCESSED': 0,
    'PAID': 0,
    'ERROR': 0
  };
  
  invoices.forEach(invoice => {
    const status = invoice.status || 'UNKNOWN';
    statuses[status] = (statuses[status] || 0) + 1;
  });
  
  return statuses;
} 