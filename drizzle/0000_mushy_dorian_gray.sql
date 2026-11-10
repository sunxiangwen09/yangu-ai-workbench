CREATE TABLE `client_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`industry` text NOT NULL,
	`status` text NOT NULL,
	`profile_version` integer DEFAULT 1 NOT NULL,
	`profile_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_client_profiles_owner_updated` ON `client_profiles` (`owner_user_id`,`updated_at`);