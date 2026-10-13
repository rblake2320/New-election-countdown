import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';

export const votingIntentionInputSchema = z.object({
  candidateId: z.number().int().positive().max(2147483647).nullable().optional(),
  partyPreference: z.enum(['Democratic', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other', 'Undecided', 'D', 'R', 'I', 'G', 'L', 'O']).nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).nullable().optional(),
}).strict().refine(input => input.candidateId != null || input.partyPreference != null, 'Choose a candidate or party preference');
export class VotingIntentionError extends Error {
  constructor(public readonly status: 400 | 404 | 422 | 503, public readonly code: string, message: string) { super(message); this.name = 'VotingIntentionError'; }
}
interface IntentionRow { id: number; election_id: number; candidate_id: number | null; party_preference: string | null; confidence: string | null; is_likely_voter?: boolean | null; created_at: Date; updated_at: Date | null }
function publicRecord(row: IntentionRow) {
  return { id: row.id, electionId: row.election_id, candidateId: row.candidate_id, partyPreference: row.party_preference, confidence: row.confidence, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at?.toISOString() ?? null };
}

/** A voluntary authenticated preference, kept separate from polls and official results.
 * The body cannot supply an actor/session identity. One current row per subject/race
 * is serialized across processes; retrying a committed request never adds a vote. */
export class VotingIntentionsService {
  constructor(private readonly pool: Pool) {}
  async record(electionId: number, actor: string, raw: unknown) {
    if (!Number.isSafeInteger(electionId) || electionId < 1 || electionId > 2147483647) throw new VotingIntentionError(400, 'invalid_election_id', 'A complete election identifier is required');
    if (!actor || actor.length > 200) throw new VotingIntentionError(400, 'invalid_actor', 'Authenticated subject is required');
    const parsed = votingIntentionInputSchema.safeParse(raw);
    if (!parsed.success) throw new VotingIntentionError(422, 'invalid_intention', 'Choose a valid candidate or party preference and confidence');
    const input = parsed.data;
    // Stored auth subject ids are opaque random identifiers. This private
    // pseudonymous key survives signing-key rotation and is never exported.
    // It is not a claim that an authenticated preference is anonymous.
    const subject = createHash('sha256').update('voting-intention\0' + actor).digest('hex');
    const client = await this.pool.connect().catch(() => { throw new VotingIntentionError(503, 'intention_store_unavailable', 'Voting preference storage is unavailable'); });
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`intention:${subject}:${electionId}`]);
      const election = await client.query('SELECT id FROM elections WHERE id=$1 FOR KEY SHARE', [electionId]);
      if (!election.rowCount) throw new VotingIntentionError(404, 'election_not_found', 'Election not found');
      if (input.candidateId != null) {
        const candidate = await client.query('SELECT election_id FROM candidates WHERE id=$1 FOR KEY SHARE', [input.candidateId]);
        if (!candidate.rowCount || candidate.rows[0].election_id !== electionId) throw new VotingIntentionError(422, 'candidate_not_in_election', 'The candidate is not recorded for this election');
      }
      const existing = await client.query<IntentionRow>('SELECT id,election_id,candidate_id,party_preference,confidence,is_likely_voter,created_at,updated_at FROM user_voting_intentions WHERE election_id=$1 AND session_id=$2 ORDER BY updated_at DESC NULLS LAST,id DESC LIMIT 1 FOR UPDATE', [electionId, subject]);
      const old = existing.rows[0];
      const values = [input.candidateId ?? null, input.partyPreference ?? null, input.confidence ?? null];
      let row: IntentionRow;
      if (old && old.candidate_id === values[0] && old.party_preference === values[1] && old.confidence === values[2] && old.is_likely_voter === null) row = old;
      else if (old) row = (await client.query<IntentionRow>('UPDATE user_voting_intentions SET candidate_id=$1,party_preference=$2,confidence=$3,is_likely_voter=NULL,updated_at=now() WHERE id=$4 RETURNING id,election_id,candidate_id,party_preference,confidence,created_at,updated_at', [...values, old.id])).rows[0];
      else row = (await client.query<IntentionRow>('INSERT INTO user_voting_intentions(election_id,session_id,candidate_id,party_preference,confidence,is_likely_voter) VALUES($1,$2,$3,$4,$5,NULL) RETURNING id,election_id,candidate_id,party_preference,confidence,created_at,updated_at', [electionId, subject, ...values])).rows[0];
      const intention = publicRecord(row);
      await client.query('COMMIT');
      return { created: !old, intention };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error instanceof VotingIntentionError) throw error;
      throw new VotingIntentionError(503, 'intention_store_unavailable', 'Voting preference storage is unavailable');
    } finally { client.release(); }
  }
}
