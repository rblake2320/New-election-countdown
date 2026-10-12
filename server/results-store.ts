/**
 * ET-6 result snapshot store — the ONE writer behind admin posting, ingestion adapters and
 * recorded-feed replays (contract v1.2 §2/§3). Append-only: a snapshot is never updated; a
 * correction is a new snapshot that supersedes the old one.
 *
 * PgResultReportStore writes in one transaction: report + lines + derived projections
 * (candidates.votes_received / vote_percentage / is_winner and the legacy election_results row)
 * so existing readers keep working until the UI switches to /results.
 */
import type { Pool, PoolClient } from 'pg';
import { createHash } from 'node:crypto';
import {
  ResultReportError, assertNotFuture, buildResultsPayload, canonicalInputHash, contextMatches, electionContextOf, reportContextOf, revisionFor,
  type ElectionContext, type ResultLineRow, type ResultReportInput, type ResultReportRow, type ResultsPayload,
} from './results-reports';

interface ElectionRow { id: number; state: string; date: Date; type: string; level: string; title: string }
// SQL fragment: report r is bound to the same race context election e currently has.
const CONTEXT_MATCH_SQL = `r.context_state = e.state AND r.context_election_date = e.date::date AND r.context_type = e.type AND r.context_level = e.level AND r.context_office = e.title`;

export interface RecordContext {
  /** admin user id, 'ingest:<adapter>' or 'replay:<drill>' — never from the request body */
  postedBy: string;
  idempotencyKey: string | null;
  /** when given, must equal the election's current latest revision (null = no report yet) */
  expectedRevision?: string | null;
  /** when true the caller passed expectedRevision and wants it enforced */
  enforceRevision?: boolean;
}

export interface RecordOutcome {
  payload: ResultsPayload;
  /** false when an identical snapshot already existed (idempotent replay) */
  created: boolean;
}

export interface ResultsListQuery {
  /** election date (YYYY-MM-DD) — every election on that date */
  date?: string;
  /** explicit election ids (max 600) */
  ids?: number[];
}

/**
 * Batched read (v1.2 amendment, B's load gap). `cursor` is an OPAQUE hash of the committed
 * snapshot set in scope (every election id with its latest revision). Equal cursor → nothing
 * changed (304). Different or unknown cursor → the full batch again with `reset: true`. There
 * is deliberately no delta: an id-based "changed since" can miss a report whose transaction
 * committed late with a lower id.
 */
export interface ResultsListPayload {
  schemaVersion: 1;
  date: string | null;
  cursor: string;
  reset: true;
  /** current snapshots only: every row carries `history: []` (the shared batch schema requires the key, empty) */
  results: ResultsPayload[];
}

export interface EvidenceRecord { sha256: string; size: number; contentType: string; created: boolean }

export interface ResultSource {
  id: string;
  kind: 'official_state_enr' | 'official_state_page' | 'official_county' | 'admin_manual';
  name: string;
  /** null for the admin_manual entry: the admin supplies the official page URL */
  url: string | null;
  state: string;
  electionIds: number[];
}

export interface ResultReportStore {
  recordResultReport(electionId: number, input: ResultReportInput, ctx: RecordContext): Promise<RecordOutcome>;
  getResultsPayload(electionId: number): Promise<ResultsPayload | null>; // null = election does not exist
  listResultsPayloads(query: ResultsListQuery): Promise<ResultsListPayload>;
  /** retain evidence bytes; the server hashes them itself */
  storeResultEvidence(bytes: Buffer, contentType: string, filename: string | null, uploadedBy: string): Promise<EvidenceRecord>;
  /** registered sources for the picker (lane C's manifest + one admin_manual entry per state) */
  listResultSources(state?: string): Promise<ResultSource[]>;
}

const HISTORY_LIMIT = 50;
export const LIST_MAX_IDS = 600;
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_CONTENT_TYPES = ['text/html', 'application/json', 'text/csv', 'application/pdf', 'image/png', 'image/jpeg'] as const;
/** kinds whose reports must point at retained evidence (ingestion adapters retain theirs too, but are not blocked on it) */
const EVIDENCE_REQUIRED_KINDS = new Set(['admin_manual', 'official_state_page']);

export function sha256Hex(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
export function adminManualSourceId(state: string): string { return `admin_manual:${state}`; }

interface ManifestSourceRow { election_id: number; state: string; publisher: string; route_type: string; government_url: string }
function kindForRoute(routeType: string): ResultSource['kind'] {
  if (/county/i.test(routeType)) return 'official_county';
  if (/enr|clarity|feed|results/i.test(routeType)) return 'official_state_enr';
  return 'official_state_page';
}
function buildSources(rows: ManifestSourceRow[], states: string[], filterState?: string): ResultSource[] {
  const byId = new Map<string, ResultSource>();
  for (const r of rows) {
    if (filterState && r.state !== filterState) continue;
    const existing = byId.get(r.publisher);
    if (existing) { existing.electionIds.push(r.election_id); continue; }
    byId.set(r.publisher, { id: r.publisher, kind: kindForRoute(r.route_type), name: r.publisher, url: r.government_url, state: r.state, electionIds: [r.election_id] });
  }
  for (const st of states) {
    if (filterState && st !== filterState) continue;
    byId.set(adminManualSourceId(st), { id: adminManualSourceId(st), kind: 'admin_manual', name: `Manual entry from an official ${st} page`, url: null, state: st, electionIds: [] });
  }
  return [...byId.values()].sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
}
/** The writer's source rule: id must be registered for the election's state; admin_manual URLs must sit on a manifest host when the state has any. */
function assertSourceRegistered(input: ResultReportInput, state: string, manifestForState: ManifestSourceRow[]): void {
  const src = input.source;
  if (src.kind === 'admin_manual') {
    if (src.id !== adminManualSourceId(state)) throw new ResultReportError(422, 'unknown_source', `admin_manual source id must be ${adminManualSourceId(state)}`);
    const hosts = new Set(manifestForState.map((m) => { try { return new URL(m.government_url).host; } catch { return ''; } }).filter(Boolean));
    if (hosts.size) {
      const host = new URL(src.url).host;
      if (!hosts.has(host)) throw new ResultReportError(422, 'unknown_source', `admin_manual URL host ${host} is not one of the registered official hosts for ${state}`, { allowedHosts: [...hosts] });
    }
    return;
  }
  if (src.kind === 'ap') return; // owner flag is checked by the caller
  if (!manifestForState.some((m) => m.publisher === src.id)) {
    throw new ResultReportError(422, 'unknown_source', `source id ${src.id} is not registered for ${state}`);
  }
}

function stripHistory(p: ResultsPayload): ResultsPayload {
  return { ...p, history: [] };
}

export function snapshotCursor(results: Array<{ electionId: number; revision: string | null }>): string {
  const canon = results.map((r) => `${r.electionId}:${r.revision ?? 'none'}`).sort().join('|');
  return createHash('sha256').update(canon).digest('hex').slice(0, 24);
}

/**
 * Official portals show vote-like placeholder values BEFORE election day (lane C found CA's V26GG
 * page carrying nonzero numbers under an October header). A snapshot whose source time or fetch
 * time precedes the election's own date is never a result, whatever adapter or admin sent it.
 * The election date is a calendar day; anything from 00:00 UTC of that day onward is allowed.
 */
export function assertNotPreElection(input: ResultReportInput, electionDate: Date | string): void {
  const day = new Date(electionDate);
  const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const offending: Array<{ path: string; message: string }> = [];
  if (input.asOf && new Date(input.asOf).getTime() < dayStart) offending.push({ path: 'asOf', message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (new Date(input.retrievedAt).getTime() < dayStart) offending.push({ path: 'retrievedAt', message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (offending.length) throw new ResultReportError(422, 'pre_election_snapshot', 'snapshot predates the election; pre-election portal values are not results', offending);
}

// ---------------------------------------------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------------------------------------------
export class PgResultReportStore implements ResultReportStore {
  constructor(private readonly pool: Pool) {}

  async getResultsPayload(electionId: number): Promise<ResultsPayload | null> {
    const election = await this.pool.query<ElectionRow>('SELECT id, state, date, type, level, title FROM elections WHERE id = $1', [electionId]);
    if (election.rowCount === 0) return null;
    const current = electionContextOf(election.rows[0]);
    const history = await this.pool.query<ResultReportRow>(
      'SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT $2', [electionId, HISTORY_LIMIT]);
    // Current = newest report still bound to the race context the election row has NOW.
    const latest = history.rows.find((r) => contextMatches(reportContextOf(r), current)) ?? null;
    const lines = latest
      ? (await this.pool.query<ResultLineRow>('SELECT * FROM candidate_result_lines WHERE report_id = $1 ORDER BY votes DESC, id', [latest.id])).rows
      : [];
    return buildResultsPayload(electionId, latest, lines, history.rows, current);
  }

  async listResultsPayloads(query: ResultsListQuery): Promise<ResultsListPayload> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.date) { params.push(query.date); where.push(`e.date::date = $${params.length}::date`); }
    if (query.ids) { params.push(query.ids.slice(0, LIST_MAX_IDS)); where.push(`e.id = ANY($${params.length}::int[])`); }
    if (where.length === 0) return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor([]), reset: true, results: [] };
    // Two queries, no N+1: latest CONTEXT-MATCHING report per election via LATERAL, then all lines.
    // A report recorded under a context the election row no longer has is never exported here.
    const latestSql = `
      SELECT e.id AS election_id, e.state AS e_state, e.date AS e_date, e.type AS e_type, e.level AS e_level, e.title AS e_title, r.*
        FROM elections e
        LEFT JOIN LATERAL (SELECT * FROM election_result_reports r WHERE r.election_id = e.id AND ${CONTEXT_MATCH_SQL} ORDER BY r.id DESC LIMIT 1) r ON true
       WHERE ${where.join(' AND ')}
       ORDER BY e.id`;
    type Row = ResultReportRow & { election_id: number; id: number | null; e_state: string; e_date: Date; e_type: string; e_level: string; e_title: string };
    const rows = (await this.pool.query<Row>(latestSql, params)).rows;
    const reportIds = rows.map((r) => r.id).filter((id): id is number => id !== null);
    const lines = reportIds.length
      ? (await this.pool.query<ResultLineRow>('SELECT * FROM candidate_result_lines WHERE report_id = ANY($1::int[]) ORDER BY report_id, votes DESC, id', [reportIds])).rows
      : [];
    const linesByReport = new Map<number, ResultLineRow[]>();
    for (const l of lines) { const arr = linesByReport.get(l.report_id) ?? []; arr.push(l); linesByReport.set(l.report_id, arr); }
    const results = rows.map((r) => {
      const current = electionContextOf({ state: r.e_state, date: r.e_date, type: r.e_type, level: r.e_level, title: r.e_title });
      return stripHistory(buildResultsPayload(r.election_id, r.id === null ? null : r, r.id === null ? [] : linesByReport.get(r.id) ?? [], [], current));
    });
    return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor(results), reset: true, results };
  }

  async recordResultReport(electionId: number, input: ResultReportInput, ctx: RecordContext): Promise<RecordOutcome> {
    const inputSha = canonicalInputHash(input);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialise writers per election so revision checks are exact.
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [20261106, electionId]);

      const election = await client.query<ElectionRow>('SELECT id, state, date, type, level, title FROM elections WHERE id = $1', [electionId]);
      if (election.rowCount === 0) throw new ResultReportError(404, 'election_not_found', `Election ${electionId} not found`);
      if (input.electionId !== electionId) throw new ResultReportError(422, 'invalid_report', 'report electionId does not match the target election', [{ path: 'electionId', message: 'mismatch' }]);
      assertNotFuture(input);
      assertNotPreElection(input, election.rows[0].date);
      const context = electionContextOf(election.rows[0]);
      assertSourceRegistered(input, election.rows[0].state, await this.manifestRows(client, election.rows[0].state));
      if (EVIDENCE_REQUIRED_KINDS.has(input.source.kind) || input.status === 'certified') {
        const ev = await client.query('SELECT 1 FROM result_evidence_blobs WHERE sha256 = $1', [input.sourcePayloadSha256]);
        if (ev.rowCount === 0) throw new ResultReportError(422, 'evidence_missing', 'sourcePayloadSha256 does not reference retained evidence; upload it first (POST /api/admin/results-evidence)');
      }

      // Idempotent replay / conflict
      if (ctx.idempotencyKey) {
        const prior = await client.query<ResultReportRow & { input_sha256: string }>(
          'SELECT * FROM election_result_reports WHERE idempotency_key = $1', [ctx.idempotencyKey]);
        if (prior.rowCount) {
          const row = prior.rows[0];
          if (row.input_sha256 !== inputSha || row.election_id !== electionId) {
            throw new ResultReportError(409, 'idempotency_conflict', 'idempotencyKey was already used with a different payload');
          }
          await client.query('COMMIT');
          return { payload: (await this.getResultsPayload(electionId))!, created: false };
        }
      }
      // Same recorded content from the same source+contest -> idempotent (keyed on the canonical input,
      // not the raw payload hash: one raw file can legitimately carry two revisions).
      const sameSnapshot = await client.query<ResultReportRow>(
        'SELECT * FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND input_sha256 = $3',
        [input.source.id, input.source.sourceContestId, inputSha]);
      if (sameSnapshot.rowCount) {
        if (sameSnapshot.rows[0].election_id !== electionId) throw new ResultReportError(422, 'contest_key_conflict', `source contest ${input.source.sourceContestId} is already bound to election ${sameSnapshot.rows[0].election_id}`);
        await client.query('COMMIT');
        return { payload: (await this.getResultsPayload(electionId))!, created: false };
      }
      // Scope guard: a qualified contest key never binds to a second election (shared raw ids).
      const otherElection = await client.query<{ election_id: number }>(
        'SELECT election_id FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND election_id <> $3 LIMIT 1',
        [input.source.id, input.source.sourceContestId, electionId]);
      if (otherElection.rowCount) throw new ResultReportError(422, 'contest_key_conflict', `source contest ${input.source.sourceContestId} is already bound to election ${otherElection.rows[0].election_id}`, { boundElectionId: otherElection.rows[0].election_id });

      const latest = await client.query<ResultReportRow>(
        'SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT 1', [electionId]);
      const latestRow = latest.rows[0] ?? null;
      if (ctx.enforceRevision && (ctx.expectedRevision ?? null) !== (latestRow?.revision ?? null)) {
        throw new ResultReportError(409, 'stale_revision', 'expectedRevision does not match the current revision', { currentRevision: latestRow?.revision ?? null });
      }
      if (input.supersedesReportId !== null) {
        const sup = await client.query('SELECT 1 FROM election_result_reports WHERE id = $1 AND election_id = $2', [input.supersedesReportId, electionId]);
        if (sup.rowCount === 0) throw new ResultReportError(422, 'invalid_report', 'supersedesReportId is not a report of this election', [{ path: 'supersedesReportId', message: 'unknown report' }]);
      } else if (input.asOf) {
        const newerSameSource = await client.query<{ id: number; as_of: Date }>(
          'SELECT id, as_of FROM election_result_reports WHERE election_id = $1 AND source_id = $2 AND as_of IS NOT NULL AND as_of > $3::timestamptz ORDER BY as_of DESC LIMIT 1',
          [electionId, input.source.id, input.asOf]);
        if (newerSameSource.rowCount) {
          throw new ResultReportError(409, 'older_than_latest', 'a newer snapshot from this source already exists; name it in supersedesReportId for an official correction', { latestReportId: newerSameSource.rows[0].id });
        }
      }

      // Every mapped candidate must belong to this election.
      const mapped = input.candidates.map((c) => c.candidateId).filter((id): id is number => id !== null);
      if (mapped.length) {
        const owned = await client.query<{ id: number }>('SELECT id FROM candidates WHERE election_id = $1 AND id = ANY($2::int[])', [electionId, mapped]);
        const ok = new Set(owned.rows.map((r) => r.id));
        const bad = mapped.filter((id) => !ok.has(id));
        if (bad.length) throw new ResultReportError(422, 'invalid_report', 'candidateId not in this election', bad.map((id) => ({ path: 'candidates', message: `candidate ${id} is not in election ${electionId}` })));
      }

      // Insert the report with a placeholder revision, then set the real one (needs the id).
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO election_result_reports (
           election_id, revision, status, source_id, source_kind, source_name, source_url, source_contest_id,
           source_payload_sha256, input_sha256, as_of, as_of_basis, retrieved_at,
           reporting_percent, reporting_basis, precincts_reporting, precincts_total, total_votes,
           winner_called_source, winner_called_url, winner_called_at, certification_url, certified_at,
           context_state, context_election_date, context_type, context_level, context_office,
           posted_by, idempotency_key, note, supersedes_report_id)
         VALUES ($1, 'pending-' || gen_random_uuid()::text, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
         RETURNING id`,
        [electionId, input.status, input.source.id, input.source.kind, input.source.name, input.source.url, input.source.sourceContestId,
         input.sourcePayloadSha256, inputSha, input.asOf, input.asOfBasis, input.retrievedAt,
         input.reporting?.percent ?? null, input.reporting?.basis ?? null, input.reporting?.precinctsReporting ?? null, input.reporting?.precinctsTotal ?? null, input.totalVotes,
         input.winnerCalledBy?.source ?? null, input.winnerCalledBy?.url ?? null, input.winnerCalledBy?.at ?? null,
         input.certification?.url ?? null, input.certification?.certifiedAt ?? null,
         context.state, context.electionDate, context.type, context.level, context.office,
         ctx.postedBy, ctx.idempotencyKey, input.note, input.supersedesReportId]);
      const reportId = inserted.rows[0].id;
      const revision = revisionFor(reportId, input);
      await client.query('UPDATE election_result_reports SET revision = $1 WHERE id = $2', [revision, reportId]);

      for (const c of input.candidates) {
        await client.query(
          `INSERT INTO candidate_result_lines (report_id, candidate_id, source_candidate_id, name, party, votes, percent, is_winner_declared)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [reportId, c.candidateId, c.sourceCandidateId, c.name, c.party, c.votes, c.percent, c.isWinner === true]);
      }

      await this.syncDerived(client, electionId, input);
      await client.query('COMMIT');
      return { payload: (await this.getResultsPayload(electionId))!, created: true };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async storeResultEvidence(bytes: Buffer, contentType: string, filename: string | null, uploadedBy: string): Promise<EvidenceRecord> {
    const sha256 = sha256Hex(bytes);
    const inserted = await this.pool.query(
      `INSERT INTO result_evidence_blobs (sha256, content_type, filename, size_bytes, bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (sha256) DO NOTHING`,
      [sha256, contentType, filename, bytes.length, bytes, uploadedBy]);
    return { sha256, size: bytes.length, contentType, created: (inserted.rowCount ?? 0) > 0 };
  }

  async listResultSources(state?: string): Promise<ResultSource[]> {
    const rows = await this.manifestRows(this.pool, state);
    const states = (await this.pool.query<{ state: string }>(state ? 'SELECT DISTINCT state FROM elections WHERE state = $1' : 'SELECT DISTINCT state FROM elections', state ? [state] : [])).rows.map((r) => r.state);
    return buildSources(rows, states, state);
  }

  private async manifestRows(q: { query: Pool['query'] }, state?: string): Promise<ManifestSourceRow[]> {
    const sql = `SELECT id AS election_id, state, official_results_source->>'publisher' AS publisher,
                        official_results_source->>'routeType' AS route_type, official_results_source->>'governmentUrl' AS government_url
                   FROM elections
                  WHERE official_results_source IS NOT NULL AND official_results_source->>'routeVerification' = 'worked'
                    ${state ? 'AND state = $1' : ''}
                  ORDER BY state, id`;
    return (await q.query<ManifestSourceRow>(sql, state ? [state] : [])).rows;
  }

  /** Legacy projections so existing readers (candidate cards, election_results) follow the latest snapshot. */
  private async syncDerived(client: PoolClient, electionId: number, input: ResultReportInput): Promise<void> {
    // Clear derived winner flags for the race (a projection flag is never set by anything any more).
    await client.query(
      'UPDATE candidates SET is_winner = false, is_projected_winner = false WHERE election_id = $1 AND (is_winner OR is_projected_winner)', [electionId]);
    for (const c of input.candidates) {
      if (c.candidateId === null) continue;
      await client.query(
        'UPDATE candidates SET votes_received = $1, vote_percentage = $2, is_winner = $3 WHERE id = $4 AND election_id = $5',
        [c.votes, c.percent, c.isWinner === true, c.candidateId, electionId]);
    }
    await client.query(
      `INSERT INTO election_results (election_id, total_votes, reporting_precincts, total_precincts, percent_reporting, is_complete, is_certified, last_updated, results_source)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)
       ON CONFLICT (election_id) DO UPDATE SET
         total_votes = EXCLUDED.total_votes, reporting_precincts = EXCLUDED.reporting_precincts, total_precincts = EXCLUDED.total_precincts,
         percent_reporting = EXCLUDED.percent_reporting, is_certified = EXCLUDED.is_certified, last_updated = EXCLUDED.last_updated, results_source = EXCLUDED.results_source`,
      [electionId, input.totalVotes, input.reporting?.precinctsReporting ?? null, input.reporting?.precinctsTotal ?? null, input.reporting?.percent ?? null,
       input.status === 'certified', input.retrievedAt, input.source.name]);
  }
}

// ---------------------------------------------------------------------------------------------
// In-memory (MemStorage) — same semantics, no projections, used by unit tests and memory mode
// ---------------------------------------------------------------------------------------------
export class MemResultReportStore implements ResultReportStore {
  private nextId = 1;
  private reports: Array<ResultReportRow & { input_sha256: string }> = [];
  private lines = new Map<number, ResultLineRow[]>();

  constructor(
    private readonly electionExists: (id: number) => boolean,
    private readonly candidateBelongs: (candidateId: number, electionId: number) => boolean,
    private readonly electionIdsOn: (date: string) => number[] = () => [],
    private readonly electionDate: (id: number) => Date | string | null = () => null,
    private readonly electionContext: (id: number) => ElectionContext | null = () => null,
    private readonly manifest: () => ManifestSourceRow[] = () => [],
  ) {}

  private readonly evidence = new Map<string, { contentType: string; size: number }>();

  private currentContext(electionId: number): ElectionContext {
    return this.electionContext(electionId) ?? { state: '', electionDate: '', type: '', level: '', office: '' };
  }

  async storeResultEvidence(bytes: Buffer, contentType: string, _filename: string | null, _uploadedBy: string): Promise<EvidenceRecord> {
    const sha256 = sha256Hex(bytes);
    const created = !this.evidence.has(sha256);
    if (created) this.evidence.set(sha256, { contentType, size: bytes.length });
    return { sha256, size: bytes.length, contentType, created };
  }

  async listResultSources(state?: string): Promise<ResultSource[]> {
    const rows = this.manifest();
    const states = [...new Set([...rows.map((r) => r.state), ...(state ? [state] : [])])];
    return buildSources(rows, states, state);
  }

  async listResultsPayloads(query: ResultsListQuery): Promise<ResultsListPayload> {
    let ids: number[] = [];
    if (query.date) ids = this.electionIdsOn(query.date);
    if (query.ids) ids = query.ids.slice(0, LIST_MAX_IDS).filter((id) => this.electionExists(id));
    const results: ResultsPayload[] = [];
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
      const p = await this.getResultsPayload(id);
      if (p) results.push(stripHistory(p));
    }
    return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor(results), reset: true, results };
  }

  async getResultsPayload(electionId: number): Promise<ResultsPayload | null> {
    if (!this.electionExists(electionId)) return null;
    const current = this.currentContext(electionId);
    const history = this.reports.filter((r) => r.election_id === electionId).sort((a, b) => b.id - a.id).slice(0, HISTORY_LIMIT);
    const latest = history.find((r) => contextMatches(reportContextOf(r), current)) ?? null;
    return buildResultsPayload(electionId, latest, latest ? [...(this.lines.get(latest.id) ?? [])].sort((a, b) => Number(b.votes) - Number(a.votes)) : [], history, current);
  }

  async recordResultReport(electionId: number, input: ResultReportInput, ctx: RecordContext): Promise<RecordOutcome> {
    if (!this.electionExists(electionId)) throw new ResultReportError(404, 'election_not_found', `Election ${electionId} not found`);
    if (input.electionId !== electionId) throw new ResultReportError(422, 'invalid_report', 'report electionId does not match the target election', [{ path: 'electionId', message: 'mismatch' }]);
    assertNotFuture(input);
    const date = this.electionDate(electionId);
    if (date) assertNotPreElection(input, date);
    const state = this.currentContext(electionId).state;
    assertSourceRegistered(input, state, this.manifest().filter((m) => m.state === state));
    if ((EVIDENCE_REQUIRED_KINDS.has(input.source.kind) || input.status === 'certified') && !this.evidence.has(input.sourcePayloadSha256)) {
      throw new ResultReportError(422, 'evidence_missing', 'sourcePayloadSha256 does not reference retained evidence; upload it first (POST /api/admin/results-evidence)');
    }
    const inputSha = canonicalInputHash(input);
    if (ctx.idempotencyKey) {
      const prior = this.reports.find((r) => r.idempotency_key === ctx.idempotencyKey);
      if (prior) {
        if (prior.input_sha256 !== inputSha || prior.election_id !== electionId) throw new ResultReportError(409, 'idempotency_conflict', 'idempotencyKey was already used with a different payload');
        return { payload: (await this.getResultsPayload(electionId))!, created: false };
      }
    }
    const same = this.reports.find((r) => r.source_id === input.source.id && r.source_contest_id === input.source.sourceContestId && r.input_sha256 === inputSha);
    if (same) {
      if (same.election_id !== electionId) throw new ResultReportError(422, 'contest_key_conflict', `source contest ${input.source.sourceContestId} is already bound to election ${same.election_id}`);
      return { payload: (await this.getResultsPayload(electionId))!, created: false };
    }
    const other = this.reports.find((r) => r.source_id === input.source.id && r.source_contest_id === input.source.sourceContestId && r.election_id !== electionId);
    if (other) throw new ResultReportError(422, 'contest_key_conflict', `source contest ${input.source.sourceContestId} is already bound to election ${other.election_id}`, { boundElectionId: other.election_id });
    const latest = this.reports.filter((r) => r.election_id === electionId).sort((a, b) => b.id - a.id)[0] ?? null;
    if (ctx.enforceRevision && (ctx.expectedRevision ?? null) !== (latest?.revision ?? null)) {
      throw new ResultReportError(409, 'stale_revision', 'expectedRevision does not match the current revision', { currentRevision: latest?.revision ?? null });
    }
    if (input.supersedesReportId !== null) {
      if (!this.reports.some((r) => r.id === input.supersedesReportId && r.election_id === electionId)) throw new ResultReportError(422, 'invalid_report', 'supersedesReportId is not a report of this election', [{ path: 'supersedesReportId', message: 'unknown report' }]);
    } else if (input.asOf) {
      const newer = this.reports.find((r) => r.election_id === electionId && r.source_id === input.source.id && r.as_of && new Date(r.as_of) > new Date(input.asOf!));
      if (newer) throw new ResultReportError(409, 'older_than_latest', 'a newer snapshot from this source already exists; name it in supersedesReportId for an official correction', { latestReportId: newer.id });
    }
    const bad = input.candidates.map((c) => c.candidateId).filter((id): id is number => id !== null && !this.candidateBelongs(id, electionId));
    if (bad.length) throw new ResultReportError(422, 'invalid_report', 'candidateId not in this election', bad.map((id) => ({ path: 'candidates', message: `candidate ${id} is not in election ${electionId}` })));

    const id = this.nextId++;
    const context = this.currentContext(electionId);
    const row: ResultReportRow & { input_sha256: string } = {
      id, election_id: electionId, revision: revisionFor(id, input), status: input.status,
      context_state: context.state, context_election_date: context.electionDate, context_type: context.type, context_level: context.level, context_office: context.office,
      source_id: input.source.id, source_kind: input.source.kind, source_name: input.source.name, source_url: input.source.url, source_contest_id: input.source.sourceContestId,
      source_payload_sha256: input.sourcePayloadSha256, input_sha256: inputSha, as_of: input.asOf, as_of_basis: input.asOfBasis, retrieved_at: input.retrievedAt,
      reporting_percent: input.reporting?.percent ?? null, reporting_basis: input.reporting?.basis ?? null,
      precincts_reporting: input.reporting?.precinctsReporting ?? null, precincts_total: input.reporting?.precinctsTotal ?? null, total_votes: input.totalVotes,
      winner_called_source: input.winnerCalledBy?.source ?? null, winner_called_url: input.winnerCalledBy?.url ?? null, winner_called_at: input.winnerCalledBy?.at ?? null,
      certification_url: input.certification?.url ?? null, certified_at: input.certification?.certifiedAt ?? null,
      posted_by: ctx.postedBy, idempotency_key: ctx.idempotencyKey, note: input.note, supersedes_report_id: input.supersedesReportId, created_at: new Date(),
    };
    this.reports.push(row);
    this.lines.set(id, input.candidates.map((c, i) => ({
      id: id * 1000 + i, report_id: id, candidate_id: c.candidateId, source_candidate_id: c.sourceCandidateId, name: c.name, party: c.party,
      votes: c.votes, percent: c.percent, is_winner_declared: c.isWinner === true,
    })));
    return { payload: (await this.getResultsPayload(electionId))!, created: true };
  }
}
