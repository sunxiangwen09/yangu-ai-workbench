import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const researchPreferences = sqliteTable('research_preferences', {
  ownerUserId: text('owner_user_id').primaryKey(),
  preset: text('preset').notNull(),
  maxWorks: integer('max_works').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

export const serviceCredentials = sqliteTable('service_credentials', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  provider: text('provider').notNull(),
  encryptedSecret: text('encrypted_secret').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const capabilityRuns = sqliteTable(
  'capability_runs',
  {
    id: text('id').primaryKey(),
    dedupeKey: text('dedupe_key').notNull().unique(),
    ownerUserId: text('owner_user_id').notNull(),
    action: text('action').notNull(),
    status: text('status').notNull(),
    reservedCalls: integer('reserved_calls').notNull(),
    resultJson: text('result_json').notNull(),
    privateJson: text('private_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_capability_runs_owner_created').on(
      table.ownerUserId,
      table.createdAt,
    ),
  ],
);

export const clientProfiles = sqliteTable(
  'client_profiles',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    displayName: text('display_name').notNull(),
    industry: text('industry').notNull(),
    status: text('status').notNull(),
    profileVersion: integer('profile_version').notNull().default(1),
    profileJson: text('profile_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_client_profiles_owner_updated').on(
      table.ownerUserId,
      table.updatedAt,
    ),
  ],
);
