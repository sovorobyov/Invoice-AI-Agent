import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from 'drizzle-orm';

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().notNull(),
  customerName: text('customer_name').notNull(),
  vendorName: text('vendor_name').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: integer('invoice_date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
  amount: real('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Invoice = InferSelectModel<typeof invoices>; 