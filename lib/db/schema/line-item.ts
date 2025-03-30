import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from 'drizzle-orm';
import { invoices } from './invoice';

export const lineItems = sqliteTable('line_items', {
  id: text('id').primaryKey().notNull(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type LineItem = InferSelectModel<typeof lineItems>; 