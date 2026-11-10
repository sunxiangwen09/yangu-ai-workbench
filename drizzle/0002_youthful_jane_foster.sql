CREATE TABLE `capability_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`reserved_calls` integer NOT NULL,
	`result_json` text NOT NULL,
	`private_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `capability_runs_dedupe_key_unique` ON `capability_runs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_capability_runs_owner_created` ON `capability_runs` (`owner_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `service_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_secret` text NOT NULL,
	`updated_at` text NOT NULL
);
