import { env } from 'cloudflare:workers';

import type {
  ClientProfileData,
  ClientProfileStatus,
} from '@/lib/client-profile';

export type ClientProfileRow = {
  id: string;
  status: ClientProfileStatus;
  profile_version: number;
  profile_json: string;
  created_at: string;
  updated_at: string;
};

export async function ensureClientProfileSchema() {
  const database = env.DB;
  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS client_profiles (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        status TEXT NOT NULL,
        profile_version INTEGER NOT NULL DEFAULT 1,
        profile_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_client_profiles_owner_updated
      ON client_profiles(owner_user_id, updated_at)
    `),
    database.prepare('PRAGMA optimize'),
  ]);
}

export async function listClientProfileRows(ownerUserId: string) {
  await ensureClientProfileSchema();
  return env.DB.prepare(
    `SELECT id, status, profile_version, profile_json, created_at, updated_at
     FROM client_profiles
     WHERE owner_user_id = ?
     ORDER BY updated_at DESC`,
  )
    .bind(ownerUserId)
    .all<ClientProfileRow>();
}

export async function insertClientProfileRow(input: {
  id: string;
  ownerUserId: string;
  data: ClientProfileData;
  status: ClientProfileStatus;
  now: string;
}) {
  await ensureClientProfileSchema();
  return env.DB.prepare(
    `INSERT INTO client_profiles (
      id, owner_user_id, display_name, industry, status,
      profile_version, profile_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      input.ownerUserId,
      input.data.workspaceName || input.data.brandName || '未命名客户',
      input.data.industry,
      input.status,
      1,
      JSON.stringify(input.data),
      input.now,
      input.now,
    )
    .run();
}

export async function findClientProfileRow(id: string, ownerUserId: string) {
  await ensureClientProfileSchema();
  return env.DB.prepare(
    `SELECT id, status, profile_version, profile_json, created_at, updated_at
     FROM client_profiles
     WHERE id = ? AND owner_user_id = ?`,
  )
    .bind(id, ownerUserId)
    .first<ClientProfileRow>();
}

export async function updateClientProfileRow(input: {
  id: string;
  ownerUserId: string;
  expectedVersion: number;
  nextVersion: number;
  data: ClientProfileData;
  status: ClientProfileStatus;
  now: string;
}) {
  return env.DB.prepare(
    `UPDATE client_profiles
     SET display_name = ?, industry = ?, status = ?, profile_version = ?,
         profile_json = ?, updated_at = ?
     WHERE id = ? AND owner_user_id = ? AND profile_version = ?`,
  )
    .bind(
      input.data.workspaceName || input.data.brandName || '未命名客户',
      input.data.industry,
      input.status,
      input.nextVersion,
      JSON.stringify(input.data),
      input.now,
      input.id,
      input.ownerUserId,
      input.expectedVersion,
    )
    .run();
}
