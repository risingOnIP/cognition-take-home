CREATE TABLE `kyc_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`national_id_type` text NOT NULL,
	`national_id` text NOT NULL,
	`address` text NOT NULL,
	`email` text NOT NULL,
	`document_type` text NOT NULL,
	`risk_score` integer NOT NULL,
	`risk_level` text NOT NULL,
	`sanctions_hit` integer DEFAULT false NOT NULL,
	`pep_hit` integer DEFAULT false NOT NULL,
	`screening_summary` text,
	`assigned_to` text,
	`status` text NOT NULL,
	`sla_due_at` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`submitted_by` text,
	`submitted_at` text,
	`escalated_by` text,
	`escalated_at` text,
	`decided_by` text,
	`decided_at` text,
	`decision_reason` text
);
--> statement-breakpoint
CREATE INDEX `kyc_cases_status_idx` ON `kyc_cases` (`status`);--> statement-breakpoint
CREATE INDEX `kyc_cases_assigned_to_idx` ON `kyc_cases` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `kyc_cases_sla_idx` ON `kyc_cases` (`sla_due_at`);