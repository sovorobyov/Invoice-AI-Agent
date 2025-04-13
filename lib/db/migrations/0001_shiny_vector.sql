CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_name` text,
	`vendor_name` text,
	`invoice_number` text,
	`invoice_date` integer,
	`due_date` integer,
	`amount` real,
	`status` text DEFAULT 'UPLOADED' NOT NULL,
	`file_path` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `line_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text,
	`quantity` integer,
	`unit_price` real,
	`total` real,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `token_usage` (
	`id` integer PRIMARY KEY NOT NULL,
	`invoice_id` integer NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
