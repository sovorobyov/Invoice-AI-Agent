import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  foreignKey,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { type InferSelectModel, sql } from 'drizzle-orm';

export const chat = sqliteTable('Chat', {
  id: text('id').primaryKey().notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  title: text('title').notNull(),
  visibility: text('visibility')
    .notNull()
    .default('private')
    .$type<'public' | 'private'>(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = sqliteTable('Message', {
  id: text('id').primaryKey().notNull(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: blob('content', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = sqliteTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: text('id').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind')
      .notNull()
      .default('text')
      .$type<'text' | 'code' | 'image' | 'sheet'>(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: text('id').notNull(),
    documentId: text('documentId').notNull(),
    documentCreatedAt: integer('documentCreatedAt', {
      mode: 'timestamp',
    }).notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: integer('isResolved', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey(() => ({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    })),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey(),
  customer_name: text('customer_name'),
  vendor_name: text('vendor_name'),
  invoice_number: text('invoice_number'),
  invoice_date: integer('invoice_date', { mode: 'timestamp' }),
  due_date: integer('due_date', { mode: 'timestamp' }),
  amount: real('amount'),
  status: text('status')
    .$type<'UPLOADED' | 'ERROR' | 'PROCESSED' | 'PAID'>()
    .notNull()
    .default('UPLOADED'),
  file_path: text('file_path'),
  error_message: text('error_message'),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Invoice = InferSelectModel<typeof invoices>;

export const line_items = sqliteTable(
  'line_items',
  {
    id: integer('id').primaryKey(),
    invoice_id: integer('invoice_id')
      .notNull()
      .references(() => invoices.id),
    description: text('description'),
    quantity: integer('quantity'),
    unit_price: real('unit_price'),
    total: real('total'),
  },
  (table) => ({
    invoiceFk: foreignKey({
      columns: [table.invoice_id],
      foreignColumns: [invoices.id],
    }),
  }),
);

export type LineItem = InferSelectModel<typeof line_items>;

export const token_usage = sqliteTable(
  'token_usage',
  {
    id: integer('id').primaryKey(),
    invoice_id: integer('invoice_id')
      .notNull()
      .references(() => invoices.id),
    input_tokens: integer('input_tokens'),
    output_tokens: integer('output_tokens'),
    cost: real('cost'),
    created_at: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    invoiceFk: foreignKey({
      columns: [table.invoice_id],
      foreignColumns: [invoices.id],
    }),
  }),
);

export type TokenUsage = InferSelectModel<typeof token_usage>;
