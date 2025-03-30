import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from 'drizzle-orm';
import { invoices } from './invoice';

export const tokenUsage = sqliteTable('token_usage', {
  id: text('id').primaryKey().notNull(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cost: real('cost').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type TokenUsage = InferSelectModel<typeof tokenUsage>; 