CREATE TABLE `kyc_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`national_id` text NOT NULL,
	`address` text NOT NULL,
	`email` text NOT NULL,
	`document_type` text NOT NULL,
	`risk_level` text NOT NULL,
	`screening_hits` text NOT NULL,
	`assigned_to` text,
	`status` text NOT NULL,
	`sla_due_at` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`escalated_by` text,
	`escalated_at` text,
	`decided_by` text,
	`decided_at` text
);
--> statement-breakpoint
CREATE INDEX `kyc_cases_status_idx` ON `kyc_cases` (`status`);--> statement-breakpoint
CREATE INDEX `kyc_cases_assigned_to_idx` ON `kyc_cases` (`assigned_to`);