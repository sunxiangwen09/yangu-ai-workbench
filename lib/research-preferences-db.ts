import { env } from 'cloudflare:workers';
import {
  DEFAULT_RESEARCH_POLICY,
  parseResearchPolicy,
  type ResearchPolicy,
  type SavedResearchPolicy,
} from './research-policy';

export async function readResearchPreferences(
  ownerUserId: string,
): Promise<SavedResearchPolicy> {
  const row = await env.DB.prepare(
    'SELECT preset, max_works, revision FROM research_preferences WHERE owner_user_id = ?',
  )
    .bind(ownerUserId)
    .first<{ preset: string; max_works: number; revision: number }>();
  if (!row) return { policy: { ...DEFAULT_RESEARCH_POLICY }, revision: 0 };
  const policy = parseResearchPolicy({
    preset: row.preset,
    maxWorks: row.max_works,
  });
  if (!policy) throw new Error('Invalid saved research policy');
  return { policy, revision: row.revision };
}

export async function writeResearchPreferences(
  ownerUserId: string,
  policy: ResearchPolicy,
  expectedRevision: number,
) {
  const now = new Date().toISOString();
  const result =
    expectedRevision === 0
      ? await env.DB.prepare(`INSERT INTO research_preferences
        (owner_user_id, preset, max_works, revision, updated_at) VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(owner_user_id) DO NOTHING`)
          .bind(ownerUserId, policy.preset, policy.maxWorks, now)
          .run()
      : await env.DB.prepare(`UPDATE research_preferences SET preset = ?, max_works = ?, revision = revision + 1, updated_at = ?
        WHERE owner_user_id = ? AND revision = ?`)
          .bind(
            policy.preset,
            policy.maxWorks,
            now,
            ownerUserId,
            expectedRevision,
          )
          .run();
  return result.meta.changes > 0;
}
