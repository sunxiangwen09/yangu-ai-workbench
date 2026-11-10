CREATE TABLE `research_preferences` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`preset` text NOT NULL,
	`max_works` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
