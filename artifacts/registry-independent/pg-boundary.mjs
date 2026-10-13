// artifacts/registry-independent/pg-boundary.ts
import { Client } from "pg";
import { createHash as createHash3 } from "node:crypto";

// server/results-store.ts
import { createHash as createHash2 } from "node:crypto";

// server/results-source-registry.ts
function dayOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function hostOf(url2) {
  try {
    const u = new URL(url2);
    return u.protocol === "https:" ? u.host.toLowerCase() : null;
  } catch {
    return null;
  }
}
var ResultsSourceRegistry = class {
  constructor() {
    this.sources = /* @__PURE__ */ new Map();
  }
  /** Register (or replace) a reviewed source. Throws on an unusable entry so a bad startup fails loudly. */
  register(source) {
    if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(source.id)) throw new Error(`source id ${JSON.stringify(source.id)} is not a valid registry id`);
    if (source.id.startsWith("admin_manual:")) throw new Error("admin_manual:<ST> ids are reserved for admin posting");
    if (!/^[A-Z]{2}$/.test(source.state)) throw new Error(`source ${source.id}: state must be a two-letter code`);
    const urls = source.allowedUrls ?? [];
    const hosts = (source.allowedHosts ?? []).map((h) => h.toLowerCase());
    if (!urls.length && !hosts.length) throw new Error(`source ${source.id}: allowedUrls or allowedHosts is required`);
    for (const u of urls) if (hostOf(u) === null) throw new Error(`source ${source.id}: allowed URL must be https: ${u}`);
    if (source.electionDate !== void 0 && !/^\d{4}-\d{2}-\d{2}$/.test(source.electionDate)) throw new Error(`source ${source.id}: electionDate must be YYYY-MM-DD`);
    if (!source.electionDate && !source.electionIds?.length) throw new Error(`source ${source.id}: electionDate or electionIds is required`);
    this.sources.set(source.id, { ...source, allowedUrls: urls, allowedHosts: hosts });
  }
  unregister(id2) {
    this.sources.delete(id2);
  }
  clear() {
    this.sources.clear();
  }
  get(id2) {
    return this.sources.get(id2);
  }
  list(state) {
    return [...this.sources.values()].filter((s) => !state || s.state === state).sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
  }
  /** Every declared constraint must match; explicit IDs narrow the state/date/phase scope. */
  admittedFor(election) {
    const day = dayOf(election.date);
    return this.list().filter((s) => {
      if (s.electionIds !== void 0 && !s.electionIds.includes(election.id)) return false;
      if (s.state !== (election.state ?? "")) return false;
      if (s.electionDate !== void 0 && s.electionDate !== day) return false;
      return s.phase === void 0 || s.phase === election.type;
    });
  }
  /**
   * Does a report's `source` block match the registered entry? Returns null when it matches, else the reason.
   * Used by the writer so a caller cannot evade evidence rules by relabelling a kind or pointing at a foreign URL.
   */
  mismatch(source) {
    const reg = this.sources.get(source.id);
    if (!reg) return "not_registered";
    if (source.kind !== reg.kind) return `kind ${source.kind} differs from registered kind ${reg.kind}`;
    const host = hostOf(source.url);
    if (host === null) return "url must be https";
    if (reg.allowedUrls.includes(source.url)) return null;
    if (reg.allowedHosts.includes(host)) return null;
    return `url ${source.url} is not an allowed URL/host for ${reg.id}`;
  }
};
var resultsSourceRegistry = new ResultsSourceRegistry();

// server/results-reports.ts
import { z as z3 } from "zod";
import { createHash } from "node:crypto";

// shared/live-election-results.ts
import { z as z2 } from "zod";

// shared/official-results.ts
import { z } from "zod";
var resultsTimestamp = z.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)), "A parseable timestamp with a valid timezone offset is required");
var officialResultsRouteTypes = [
  "generic_results_portal",
  "government_elections_fallback",
  "government_results_archive",
  "government_results_gateway",
  "government_results_history_information",
  "government_results_landing",
  "year_results_landing",
  "election_specific_results"
];
var httpsResultsUrl = z.string().url().max(2048).refine((value) => {
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" && !url2.username && !url2.password && !url2.port;
  } catch {
    return false;
  }
}, "An HTTPS URL without credentials or a custom port is required");
var resultPhase = z.enum(["general", "primary", "runoff", "other"]);
var resultDigest = z.string().regex(/^[a-f0-9]{64}$/);
var publishedResultsReceiptSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/),
  outcome: z.literal("worked"),
  electionDate: z.literal("2026-11-03"),
  electionPhase: resultPhase,
  destinationUrl: httpsResultsUrl,
  sourceUrl: httpsResultsUrl,
  contextVerified: z.literal(true),
  resultsObserved: z.literal(true),
  observedElectionLabel: z.string().trim().min(5).max(1024),
  checkedAt: resultsTimestamp
}).strict();
var resultsPublicationEvidenceSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/),
  electionDate: z.literal("2026-11-03"),
  electionPhase: resultPhase,
  destinationUrl: httpsResultsUrl,
  officialElectionLabel: z.string().trim().min(5).max(1024),
  officialContextVerified: z.literal(true),
  officialContextReceiptSha256: resultDigest,
  receivingOutcome: z.literal("worked"),
  receivingResultsObserved: z.literal(true),
  receivingReceiptSha256: resultDigest,
  receivingCheckedAt: resultsTimestamp
}).strict();
var officialResultsSourceSchema = z.object({
  targetElectionDate: z.literal("2026-11-03"),
  electionPhase: resultPhase,
  routeType: z.enum(officialResultsRouteTypes),
  publisher: z.string().min(1).max(512),
  checkedAt: resultsTimestamp,
  routeVerification: z.enum(["worked", "blocked"]),
  status: z.enum(["not_linked", "unknown", "published"]),
  availabilityReason: z.enum([
    "not_linked_in_checked_official_sources",
    "advertised_route_election_not_in_selector",
    "unknown_portal_data_load_failed",
    "unknown_portal_election_context",
    "unknown_results_portal_tls_blocked",
    "unknown_transport_blocked",
    "unknown_election_phase",
    "published_for_target_election"
  ]),
  governmentUrl: httpsResultsUrl,
  fallbackUrl: httpsResultsUrl.nullable(),
  advertisedGeneralUrl: httpsResultsUrl.nullable(),
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/),
  publicationEvidence: resultsPublicationEvidenceSchema.optional()
}).strict().superRefine((source, ctx) => {
  if (source.status === "not_linked" && (source.electionPhase !== "general" || source.availabilityReason !== "not_linked_in_checked_official_sources" || source.routeVerification !== "worked")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "not_linked requires a checked general-election context" });
  }
  if (source.status === "published") {
    const proof = source.publicationEvidence;
    if (source.routeType !== "election_specific_results" || source.routeVerification !== "worked" || source.availabilityReason !== "published_for_target_election" || !proof || proof.electionDate !== source.targetElectionDate || proof.electionPhase !== source.electionPhase || proof.receivingCheckedAt !== source.checkedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Published requires a verified exact-date/phase specific results receipt" });
    }
  } else if (source.routeType === "election_specific_results" || source.publicationEvidence || source.availabilityReason === "published_for_target_election") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Specific publication evidence cannot be asserted on pending or unknown routes" });
  }
});
var officialResultsFieldsSchema = z.object({
  officialResultsUrl: httpsResultsUrl.nullable().default(null),
  officialResultsSource: officialResultsSourceSchema.nullable().default(null)
}).superRefine((fields, ctx) => {
  if (fields.officialResultsUrl !== null && fields.officialResultsSource?.routeVerification !== "worked") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A destination requires verified source metadata" });
  }
  if (fields.officialResultsSource?.status === "published" && fields.officialResultsUrl !== fields.officialResultsSource.publicationEvidence?.destinationUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Published destination must match the observed receiving receipt" });
  }
});

// shared/live-election-results.ts
var liveResultSourceKinds = ["official_state_enr", "official_state_page", "official_county", "ap", "admin_manual"];
var liveResultReportingBases = ["precincts", "ballots", "votes", "source_unspecified"];
var liveResultAsOfBases = ["source_timestamp", "source_publication_time", "not_provided"];
var count = z2.number().int().nonnegative().safe();
var id = count.refine((value) => value > 0, "A positive identifier is required");
var percent = z2.number().finite().min(0).max(100);
var timestamp = resultsTimestamp;
var digest = z2.string().regex(/^[a-f0-9]{64}$/);
var token = z2.string().trim().min(1).max(256);
var shortText = z2.string().trim().min(1).max(512);
var calendarDate = z2.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = /* @__PURE__ */ new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "An actual calendar date is required");
var liveResultElectionContextSchema = z2.object({
  state: z2.string().regex(/^[A-Z]{2}$/),
  electionDate: calendarDate,
  type: token,
  level: token,
  office: shortText
}).strict();
var liveResultSourceSchema = z2.object({
  id: token,
  kind: z2.enum(liveResultSourceKinds),
  name: shortText,
  url: httpsResultsUrl,
  sourceContestId: token
}).strict();
var liveResultReportingSchema = z2.object({
  percent: percent.nullable(),
  basis: z2.enum(liveResultReportingBases),
  precinctsReporting: count.nullable(),
  precinctsTotal: count.nullable()
}).strict().superRefine((value, ctx) => {
  if (value.precinctsReporting !== null && value.precinctsTotal !== null && value.precinctsReporting > value.precinctsTotal) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["precinctsReporting"], message: "Reported precincts exceed the source total" });
  }
});
var liveResultCandidateSchema = z2.object({
  candidateId: id.nullable(),
  sourceCandidateId: token,
  name: shortText,
  party: shortText.nullable(),
  votes: count,
  percent: percent.nullable(),
  isWinner: z2.boolean()
}).strict();
var winnerSchema = z2.object({ source: shortText, url: httpsResultsUrl, at: timestamp }).strict();
var certificationSchema = z2.object({ url: httpsResultsUrl, certifiedAt: timestamp.nullable() }).strict();
var liveResultHistorySchema = z2.object({
  reportId: id,
  revision: token,
  asOf: timestamp.nullable(),
  status: z2.enum(["unofficial", "certified"]),
  percent: percent.nullable(),
  sourceId: token,
  sourceUrl: httpsResultsUrl,
  contextMatch: z2.boolean()
}).strict();
var resultFields = {
  schemaVersion: z2.literal(1),
  electionId: id,
  status: z2.enum(["none", "unofficial", "certified"]),
  reporting: liveResultReportingSchema.nullable(),
  source: liveResultSourceSchema.nullable(),
  sourcePayloadSha256: digest.nullable(),
  asOf: timestamp.nullable(),
  asOfBasis: z2.enum(liveResultAsOfBases).nullable(),
  retrievedAt: timestamp.nullable(),
  totalVotes: count.nullable(),
  candidates: z2.array(liveResultCandidateSchema).max(5e3),
  winnerCalledBy: winnerSchema.nullable(),
  certification: certificationSchema.nullable(),
  supersedesReportId: id.nullable()
};
var resultObject = z2.object(resultFields).strict();
function validateRecorded(value, ctx) {
  const issue = (path, message) => ctx.addIssue({ code: z2.ZodIssueCode.custom, path, message });
  if (value.status === "none") return;
  for (const field of ["source", "sourcePayloadSha256", "retrievedAt", "asOfBasis"]) {
    if (value[field] === null) issue([field], "An observed result requires source provenance");
  }
  if (value.asOf === null && value.asOfBasis !== "not_provided") issue(["asOfBasis"], "An absent source timestamp must be not_provided");
  if (value.asOf !== null && (value.asOfBasis === null || value.asOfBasis === "not_provided")) issue(["asOfBasis"], "A source timestamp requires its actual basis");
  if (value.asOf !== null && value.retrievedAt !== null && Date.parse(value.asOf) > Date.parse(value.retrievedAt)) issue(["asOf"], "Source as-of time is after retrieval");
  if (value.status === "certified" && value.certification === null) issue(["certification"], "Certification requires exact-race official evidence");
  if (value.status !== "certified" && value.certification !== null) issue(["certification"], "Certification evidence requires certified status");
  if (value.source?.kind === "ap" && value.status === "certified") issue(["status"], "AP cannot establish official certification");
  if (value.certification?.certifiedAt && value.retrievedAt && Date.parse(value.certification.certifiedAt) > Date.parse(value.retrievedAt)) issue(["certification", "certifiedAt"], "Certification time is after retrieval");
  if (value.winnerCalledBy && value.retrievedAt && Date.parse(value.winnerCalledBy.at) > Date.parse(value.retrievedAt)) issue(["winnerCalledBy", "at"], "Official decision time is after retrieval");
  const winners = value.candidates.filter((candidate) => candidate.isWinner);
  if (winners.length && value.winnerCalledBy === null) issue(["winnerCalledBy"], "Only an explicit official declaration may mark a winner");
  if (!winners.length && value.winnerCalledBy !== null) issue(["winnerCalledBy"], "An official winner declaration must name a recorded option");
  const options = /* @__PURE__ */ new Set();
  const boundCandidates = /* @__PURE__ */ new Set();
  value.candidates.forEach((candidate, index) => {
    if (options.has(candidate.sourceCandidateId)) issue(["candidates", index, "sourceCandidateId"], "Duplicate source ballot option");
    options.add(candidate.sourceCandidateId);
    if (candidate.candidateId !== null) {
      if (boundCandidates.has(candidate.candidateId)) issue(["candidates", index, "candidateId"], "Duplicate candidate binding");
      boundCandidates.add(candidate.candidateId);
    }
  });
}
var liveElectionResultsSchema = resultObject.extend({
  reportId: id.nullable(),
  revision: token.nullable(),
  electionContext: liveResultElectionContextSchema.nullable(),
  history: z2.array(liveResultHistorySchema).max(1e4),
  stale: z2.boolean().default(false),
  staleSince: timestamp.nullable().default(null)
}).strict().superRefine((value, ctx) => {
  validateRecorded(value, ctx);
  if (value.status === "none") {
    for (const field of ["reportId", "revision", "reporting", "source", "sourcePayloadSha256", "asOf", "asOfBasis", "retrievedAt", "totalVotes", "winnerCalledBy", "certification", "supersedesReportId", "staleSince", "electionContext"]) {
      if (value[field] !== null) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: [field], message: "No ingested result requires null metadata" });
    }
    if (value.candidates.length || value.stale) ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "No ingested result cannot contain counts or a stale snapshot" });
    value.history.forEach((entry, index) => {
      if (entry.contextMatch) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["history", index, "contextMatch"], message: "A matching recorded snapshot cannot be represented as none" });
    });
  } else {
    if (value.reportId === null || value.revision === null) ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Recorded results require a persisted report and revision" });
    if (value.electionContext === null) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["electionContext"], message: "Recorded results require their immutable race context" });
    if (value.stale !== (value.staleSince !== null)) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["staleSince"], message: "Stale snapshots require the actual failure time" });
  }
});
var liveResultReportInputSchema = resultObject.extend({
  status: z2.enum(["unofficial", "certified"]),
  expectedRevision: token.nullable(),
  idempotencyKey: z2.string().trim().min(1).max(128).regex(/^[A-Za-z0-9:_-]+$/),
  note: z2.string().trim().max(4e3).nullable()
}).strict().superRefine(validateRecorded);
var liveResultsBatchSchema = z2.object({
  schemaVersion: z2.literal(1),
  date: calendarDate.nullable(),
  results: z2.array(liveElectionResultsSchema).max(2e3),
  cursor: token,
  reset: z2.literal(true)
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  value.results.forEach((row, index) => {
    if (ids.has(row.electionId)) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["results", index, "electionId"], message: "Duplicate contest in batch" });
    ids.add(row.electionId);
    if (row.history.length) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["results", index, "history"], message: "Batch contains current snapshots only; history belongs to the detail read" });
    if (value.date !== null && row.electionContext !== null && row.electionContext.electionDate !== value.date) ctx.addIssue({ code: z2.ZodIssueCode.custom, path: ["results", index, "electionContext", "electionDate"], message: "Recorded contest does not belong to the requested date" });
  });
});

// server/results-reports.ts
var RESULTS_SCHEMA_VERSION = 1;
function narrowRecorded(r) {
  if (r.source === null || r.sourcePayloadSha256 === null || r.retrievedAt === null || r.asOfBasis === null) {
    throw new ResultReportError(422, "invalid_report", "a recorded result requires source provenance", [{ path: "source", message: "An observed result requires source provenance" }]);
  }
  return r;
}
var resultReportInputSchema = z3.preprocess(
  (v) => v && typeof v === "object" ? { expectedRevision: null, idempotencyKey: "adapter", ...v } : v,
  liveResultReportInputSchema
).transform((r) => narrowRecorded(stripAdminFields(r)));
function stripAdminFields(r) {
  const { expectedRevision: _e, idempotencyKey: _k, ...rest } = r;
  return rest;
}
function electionContextOf(e) {
  return { state: e.state, electionDate: new Date(e.date).toISOString().slice(0, 10), type: e.type, level: e.level, office: e.title };
}
function reportContextOf(r) {
  return { state: r.context_state, electionDate: new Date(r.context_election_date).toISOString().slice(0, 10), type: r.context_type, level: r.context_level, office: r.context_office };
}
function contextMatches(a, b) {
  return a.state === b.state && a.electionDate === b.electionDate && a.type === b.type && a.level === b.level && a.office === b.office;
}
var iso = (v) => v == null ? null : new Date(v).toISOString();
var num = (v) => v == null ? null : Number(v);
function emptyResultsPayload(electionId) {
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    electionId,
    reportId: null,
    revision: null,
    status: "none",
    reporting: null,
    source: null,
    sourcePayloadSha256: null,
    asOf: null,
    asOfBasis: null,
    retrievedAt: null,
    totalVotes: null,
    candidates: [],
    winnerCalledBy: null,
    certification: null,
    supersedesReportId: null,
    stale: false,
    staleSince: null,
    electionContext: null,
    history: []
  };
}
function buildResultsPayload(electionId, latest, lines, history, current) {
  const annotated = history.filter((h) => latest === null || h.id !== latest.id).map((h) => ({
    reportId: h.id,
    revision: h.revision,
    asOf: iso(h.as_of),
    status: h.status,
    percent: num(h.reporting_percent),
    sourceId: h.source_id,
    sourceUrl: h.source_url,
    contextMatch: contextMatches(reportContextOf(h), current)
  }));
  if (!latest) return { ...emptyResultsPayload(electionId), history: annotated };
  return {
    schemaVersion: RESULTS_SCHEMA_VERSION,
    electionId,
    reportId: latest.id,
    revision: latest.revision,
    status: latest.status,
    reporting: latest.reporting_basis === null && latest.reporting_percent === null && latest.precincts_reporting === null && latest.precincts_total === null ? null : { percent: num(latest.reporting_percent), basis: latest.reporting_basis ?? "source_unspecified", precinctsReporting: latest.precincts_reporting, precinctsTotal: latest.precincts_total },
    source: { id: latest.source_id, kind: latest.source_kind, name: latest.source_name, url: latest.source_url, sourceContestId: latest.source_contest_id },
    sourcePayloadSha256: latest.source_payload_sha256,
    asOf: iso(latest.as_of),
    asOfBasis: latest.as_of_basis,
    retrievedAt: iso(latest.retrieved_at),
    totalVotes: num(latest.total_votes),
    candidates: lines.map((l) => ({
      candidateId: l.candidate_id,
      sourceCandidateId: l.source_candidate_id,
      name: l.name,
      party: l.party,
      votes: Number(l.votes),
      percent: num(l.percent),
      isWinner: l.is_winner_declared === true
    })),
    winnerCalledBy: latest.winner_called_source && latest.winner_called_url && latest.winner_called_at ? { source: latest.winner_called_source, url: latest.winner_called_url, at: iso(latest.winner_called_at) } : null,
    certification: latest.certification_url ? { url: latest.certification_url, certifiedAt: iso(latest.certified_at) } : null,
    supersedesReportId: latest.supersedes_report_id,
    stale: false,
    staleSince: null,
    electionContext: reportContextOf(latest),
    history: annotated
  };
}
function revisionFor(reportId, input) {
  return `r${reportId}-${canonicalInputHash(input).slice(0, 8)}`;
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value;
  const keys = Object.keys(obj).filter((k) => obj[k] !== void 0).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}
function canonicalInputHash(input) {
  const { note: _n, supersedesReportId: _s, ...rest } = input;
  return createHash("sha256").update(stableStringify(rest)).digest("hex");
}
var ResultReportError = class extends Error {
  constructor(status, publicCode, message, details) {
    super(message);
    this.status = status;
    this.publicCode = publicCode;
    this.details = details;
  }
};
function assertNotFuture(input, now = Date.now()) {
  if (new Date(input.retrievedAt).getTime() > now + 5 * 60 * 1e3) {
    throw new ResultReportError(422, "invalid_report", "retrievedAt is in the future", [{ path: "retrievedAt", message: "retrievedAt is in the future" }]);
  }
}

// server/results-store.ts
var CONTEXT_MATCH_SQL = `r.context_state = e.state AND r.context_election_date = e.date::date AND r.context_type = e.type AND r.context_level = e.level AND r.context_office = e.title`;
var HISTORY_LIMIT = 50;
var LIST_MAX_IDS = 600;
var EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
var EVIDENCE_REQUIRED_KINDS = /* @__PURE__ */ new Set(["admin_manual", "official_state_page"]);
function sha256Hex(bytes) {
  return createHash2("sha256").update(bytes).digest("hex");
}
function adminManualSourceId(state) {
  return `admin_manual:${state}`;
}
function kindForRoute(routeType) {
  if (/county/i.test(routeType)) return "official_county";
  if (/enr|clarity|feed|results/i.test(routeType)) return "official_state_enr";
  return "official_state_page";
}
function buildSources(rows, states, filterState) {
  const byId = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (filterState && r.state !== filterState) continue;
    const existing = byId.get(r.publisher);
    if (existing) {
      existing.electionIds.push(r.election_id);
      if (r.status === "published") existing.published = true;
      continue;
    }
    byId.set(r.publisher, { id: r.publisher, kind: kindForRoute(r.route_type), name: r.publisher, url: r.government_url, state: r.state, electionIds: [r.election_id], registeredBy: "manifest", published: r.status === "published" });
  }
  for (const reg of resultsSourceRegistry.list(filterState)) {
    const existing = byId.get(reg.id);
    if (existing) {
      existing.registeredBy = "both";
      for (const id2 of reg.electionIds ?? []) if (!existing.electionIds.includes(id2)) existing.electionIds.push(id2);
      continue;
    }
    byId.set(reg.id, { id: reg.id, kind: reg.kind, name: reg.name, url: reg.allowedUrls?.[0] ?? null, state: reg.state, electionIds: [...reg.electionIds ?? []], registeredBy: "registry", published: false });
  }
  for (const st of states) {
    if (filterState && st !== filterState) continue;
    byId.set(adminManualSourceId(st), { id: adminManualSourceId(st), kind: "admin_manual", name: `Manual entry from an official ${st} page`, url: null, state: st, electionIds: [], registeredBy: "manifest", published: false });
  }
  return [...byId.values()].sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id));
}
function assertSourceRegistered(input, state, manifestForState, race) {
  const src = input.source;
  if (src.kind === "admin_manual") {
    if (src.id !== adminManualSourceId(state)) throw new ResultReportError(422, "unknown_source", `admin_manual source id must be ${adminManualSourceId(state)}`);
    const hosts2 = /* @__PURE__ */ new Set();
    for (const m of manifestForState) {
      try {
        hosts2.add(new URL(m.government_url).host.toLowerCase());
      } catch {
      }
    }
    for (const r of resultsSourceRegistry.list(state)) {
      for (const h of r.allowedHosts ?? []) hosts2.add(h);
      for (const u of r.allowedUrls ?? []) {
        try {
          hosts2.add(new URL(u).host.toLowerCase());
        } catch {
        }
      }
    }
    if (hosts2.size) {
      const host2 = new URL(src.url).host.toLowerCase();
      if (!hosts2.has(host2)) throw new ResultReportError(422, "unknown_source", `admin_manual URL host ${host2} is not one of the registered official hosts for ${state}`, { allowedHosts: [...hosts2] });
    }
    return;
  }
  if (src.kind === "ap") return;
  const reg = resultsSourceRegistry.get(src.id);
  if (reg) {
    if (reg.state !== state) throw new ResultReportError(422, "unknown_source", `source id ${src.id} is registered for ${reg.state}, not ${state}`);
    const admitted = resultsSourceRegistry.admittedFor({ id: race.id, state, date: race.date ?? "", type: race.type }).some((r) => r.id === reg.id);
    if (!admitted) throw new ResultReportError(422, "source_mismatch", `source ${src.id} is registered for ${reg.electionDate ?? "explicit elections"}${reg.phase ? " " + reg.phase : ""}, not for election ${race.id}`, { registeredFor: { electionDate: reg.electionDate ?? null, phase: reg.phase ?? null, electionIds: reg.electionIds ?? [] } });
    const problem = resultsSourceRegistry.mismatch(src);
    if (problem) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: ${problem}`);
    return;
  }
  const manifest = manifestForState.filter((m) => m.publisher === src.id);
  if (!manifest.length) throw new ResultReportError(422, "unknown_source", `source id ${src.id} is not registered for ${state}`);
  const expectedKind = kindForRoute(manifest[0].route_type);
  if (src.kind !== expectedKind) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: kind ${src.kind} differs from the manifest kind ${expectedKind}`);
  let host;
  try {
    const u = new URL(src.url);
    if (u.protocol !== "https:") throw new Error("not https");
    host = u.host.toLowerCase();
  } catch {
    throw new ResultReportError(422, "source_mismatch", `source ${src.id}: url must be https`);
  }
  const hosts = new Set(manifest.map((m) => {
    try {
      return new URL(m.government_url).host.toLowerCase();
    } catch {
      return "";
    }
  }).filter(Boolean));
  if (hosts.size && !hosts.has(host)) throw new ResultReportError(422, "source_mismatch", `source ${src.id}: url host ${host} is not the manifest host`, { allowedHosts: [...hosts] });
}
function stripHistory(p) {
  return { ...p, history: [] };
}
function snapshotCursor(results) {
  const canon = results.map((r) => `${r.electionId}:${r.revision ?? "none"}`).sort().join("|");
  return createHash2("sha256").update(canon).digest("hex").slice(0, 24);
}
function assertNotPreElection(input, electionDate) {
  const day = new Date(electionDate);
  const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const offending = [];
  if (input.asOf && new Date(input.asOf).getTime() < dayStart) offending.push({ path: "asOf", message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (new Date(input.retrievedAt).getTime() < dayStart) offending.push({ path: "retrievedAt", message: `precedes the election day ${new Date(dayStart).toISOString().slice(0, 10)}` });
  if (offending.length) throw new ResultReportError(422, "pre_election_snapshot", "snapshot predates the election; pre-election portal values are not results", offending);
}
var PgResultReportStore = class {
  constructor(pool) {
    this.pool = pool;
  }
  async getResultsPayload(electionId) {
    const election = await this.pool.query("SELECT id, state, date, type, level, title FROM elections WHERE id = $1", [electionId]);
    if (election.rowCount === 0) return null;
    const current = electionContextOf(election.rows[0]);
    const history = await this.pool.query(
      "SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT $2",
      [electionId, HISTORY_LIMIT]
    );
    const latest = history.rows.find((r) => contextMatches(reportContextOf(r), current)) ?? null;
    const lines = latest ? (await this.pool.query("SELECT * FROM candidate_result_lines WHERE report_id = $1 ORDER BY votes DESC, id", [latest.id])).rows : [];
    return buildResultsPayload(electionId, latest, lines, history.rows, current);
  }
  async listResultsPayloads(query) {
    const where = [];
    const params = [];
    if (query.date) {
      params.push(query.date);
      where.push(`e.date::date = $${params.length}::date`);
    }
    if (query.ids) {
      params.push(query.ids.slice(0, LIST_MAX_IDS));
      where.push(`e.id = ANY($${params.length}::int[])`);
    }
    if (where.length === 0) return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor([]), reset: true, results: [] };
    const latestSql = `
      SELECT e.id AS e_id, e.state AS e_state, e.date AS e_date, e.type AS e_type, e.level AS e_level, e.title AS e_title, r.*
        FROM elections e
        LEFT JOIN LATERAL (SELECT * FROM election_result_reports r WHERE r.election_id = e.id AND ${CONTEXT_MATCH_SQL} ORDER BY r.id DESC LIMIT 1) r ON true
       WHERE ${where.join(" AND ")}
       ORDER BY e.id`;
    const rows = (await this.pool.query(latestSql, params)).rows;
    const reportIds = rows.map((r) => r.id).filter((id2) => id2 !== null);
    const lines = reportIds.length ? (await this.pool.query("SELECT * FROM candidate_result_lines WHERE report_id = ANY($1::int[]) ORDER BY report_id, votes DESC, id", [reportIds])).rows : [];
    const linesByReport = /* @__PURE__ */ new Map();
    for (const l of lines) {
      const arr = linesByReport.get(l.report_id) ?? [];
      arr.push(l);
      linesByReport.set(l.report_id, arr);
    }
    const results = rows.map((r) => {
      const current = electionContextOf({ state: r.e_state, date: r.e_date, type: r.e_type, level: r.e_level, title: r.e_title });
      return stripHistory(buildResultsPayload(r.e_id, r.id === null ? null : r, r.id === null ? [] : linesByReport.get(r.id) ?? [], [], current));
    });
    return { schemaVersion: 1, date: query.date ?? null, cursor: snapshotCursor(results), reset: true, results };
  }
  async recordResultReport(electionId, input, ctx) {
    const inputSha = canonicalInputHash(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261106, electionId]);
      const election = await client.query("SELECT id, state, date, type, level, title FROM elections WHERE id = $1", [electionId]);
      if (election.rowCount === 0) throw new ResultReportError(404, "election_not_found", `Election ${electionId} not found`);
      if (input.electionId !== electionId) throw new ResultReportError(422, "invalid_report", "report electionId does not match the target election", [{ path: "electionId", message: "mismatch" }]);
      assertNotFuture(input);
      assertNotPreElection(input, election.rows[0].date);
      const context = electionContextOf(election.rows[0]);
      assertSourceRegistered(input, election.rows[0].state, await this.manifestRows(client, election.rows[0].state), { id: electionId, date: election.rows[0].date, type: election.rows[0].type });
      if (EVIDENCE_REQUIRED_KINDS.has(input.source.kind) || input.status === "certified") {
        const ev = await client.query("SELECT 1 FROM result_evidence_blobs WHERE sha256 = $1", [input.sourcePayloadSha256]);
        if (ev.rowCount === 0) throw new ResultReportError(422, "evidence_missing", "sourcePayloadSha256 does not reference retained evidence; upload it first (POST /api/admin/results-evidence)");
      }
      if (ctx.idempotencyKey) {
        const prior = await client.query(
          "SELECT * FROM election_result_reports WHERE idempotency_key = $1",
          [ctx.idempotencyKey]
        );
        if (prior.rowCount) {
          const row = prior.rows[0];
          if (row.input_sha256 !== inputSha || row.election_id !== electionId) {
            throw new ResultReportError(409, "idempotency_conflict", "idempotencyKey was already used with a different payload");
          }
          await client.query("COMMIT");
          return { payload: await this.getResultsPayload(electionId), created: false };
        }
      }
      const sameSnapshot = await client.query(
        "SELECT * FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND input_sha256 = $3",
        [input.source.id, input.source.sourceContestId, inputSha]
      );
      if (sameSnapshot.rowCount) {
        if (sameSnapshot.rows[0].election_id !== electionId) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${sameSnapshot.rows[0].election_id}`);
        await client.query("COMMIT");
        return { payload: await this.getResultsPayload(electionId), created: false };
      }
      const otherElection = await client.query(
        "SELECT election_id FROM election_result_reports WHERE source_id = $1 AND source_contest_id = $2 AND election_id <> $3 LIMIT 1",
        [input.source.id, input.source.sourceContestId, electionId]
      );
      if (otherElection.rowCount) throw new ResultReportError(422, "contest_key_conflict", `source contest ${input.source.sourceContestId} is already bound to election ${otherElection.rows[0].election_id}`, { boundElectionId: otherElection.rows[0].election_id });
      const latest = await client.query(
        "SELECT * FROM election_result_reports WHERE election_id = $1 ORDER BY id DESC LIMIT 1",
        [electionId]
      );
      const latestRow = latest.rows[0] ?? null;
      if (ctx.enforceRevision && (ctx.expectedRevision ?? null) !== (latestRow?.revision ?? null)) {
        throw new ResultReportError(409, "stale_revision", "expectedRevision does not match the current revision", { currentRevision: latestRow?.revision ?? null });
      }
      if (input.supersedesReportId !== null) {
        const sup = await client.query("SELECT 1 FROM election_result_reports WHERE id = $1 AND election_id = $2", [input.supersedesReportId, electionId]);
        if (sup.rowCount === 0) throw new ResultReportError(422, "invalid_report", "supersedesReportId is not a report of this election", [{ path: "supersedesReportId", message: "unknown report" }]);
      } else if (input.asOf) {
        const newerSameSource = await client.query(
          "SELECT id, as_of FROM election_result_reports WHERE election_id = $1 AND source_id = $2 AND as_of IS NOT NULL AND as_of > $3::timestamptz ORDER BY as_of DESC LIMIT 1",
          [electionId, input.source.id, input.asOf]
        );
        if (newerSameSource.rowCount) {
          throw new ResultReportError(409, "older_than_latest", "a newer snapshot from this source already exists; name it in supersedesReportId for an official correction", { latestReportId: newerSameSource.rows[0].id });
        }
      }
      const mapped = input.candidates.map((c2) => c2.candidateId).filter((id2) => id2 !== null);
      if (mapped.length) {
        const owned = await client.query("SELECT id FROM candidates WHERE election_id = $1 AND id = ANY($2::int[])", [electionId, mapped]);
        const ok = new Set(owned.rows.map((r) => r.id));
        const bad = mapped.filter((id2) => !ok.has(id2));
        if (bad.length) throw new ResultReportError(422, "invalid_report", "candidateId not in this election", bad.map((id2) => ({ path: "candidates", message: `candidate ${id2} is not in election ${electionId}` })));
      }
      const inserted = await client.query(
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
        [
          electionId,
          input.status,
          input.source.id,
          input.source.kind,
          input.source.name,
          input.source.url,
          input.source.sourceContestId,
          input.sourcePayloadSha256,
          inputSha,
          input.asOf,
          input.asOfBasis,
          input.retrievedAt,
          input.reporting?.percent ?? null,
          input.reporting?.basis ?? null,
          input.reporting?.precinctsReporting ?? null,
          input.reporting?.precinctsTotal ?? null,
          input.totalVotes,
          input.winnerCalledBy?.source ?? null,
          input.winnerCalledBy?.url ?? null,
          input.winnerCalledBy?.at ?? null,
          input.certification?.url ?? null,
          input.certification?.certifiedAt ?? null,
          context.state,
          context.electionDate,
          context.type,
          context.level,
          context.office,
          ctx.postedBy,
          ctx.idempotencyKey,
          input.note,
          input.supersedesReportId
        ]
      );
      const reportId = inserted.rows[0].id;
      const revision = revisionFor(reportId, input);
      await client.query("UPDATE election_result_reports SET revision = $1 WHERE id = $2", [revision, reportId]);
      for (const c2 of input.candidates) {
        await client.query(
          `INSERT INTO candidate_result_lines (report_id, candidate_id, source_candidate_id, name, party, votes, percent, is_winner_declared)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [reportId, c2.candidateId, c2.sourceCandidateId, c2.name, c2.party, c2.votes, c2.percent, c2.isWinner === true]
        );
      }
      await this.syncDerived(client, electionId, input);
      await client.query("COMMIT");
      return { payload: await this.getResultsPayload(electionId), created: true };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => void 0);
      throw error;
    } finally {
      client.release();
    }
  }
  async storeResultEvidence(bytes, contentType, filename, uploadedBy) {
    const sha256 = sha256Hex(bytes);
    const inserted = await this.pool.query(
      `INSERT INTO result_evidence_blobs (sha256, content_type, filename, size_bytes, bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (sha256) DO NOTHING`,
      [sha256, contentType, filename, bytes.length, bytes, uploadedBy]
    );
    return { sha256, size: bytes.length, contentType, created: (inserted.rowCount ?? 0) > 0 };
  }
  async listResultSources(state) {
    const rows = await this.manifestRows(this.pool, state);
    const states = (await this.pool.query(state ? "SELECT DISTINCT state FROM elections WHERE state = $1" : "SELECT DISTINCT state FROM elections", state ? [state] : [])).rows.map((r) => r.state);
    return buildSources(rows, states, state);
  }
  async manifestRows(q, state) {
    const sql = `SELECT id AS election_id, state, official_results_source->>'publisher' AS publisher,
                        official_results_source->>'routeType' AS route_type, official_results_source->>'governmentUrl' AS government_url, official_results_source->>'status' AS status
                   FROM elections
                  WHERE official_results_source IS NOT NULL AND official_results_source->>'routeVerification' = 'worked'
                    ${state ? "AND state = $1" : ""}
                  ORDER BY state, id`;
    return (await q.query(sql, state ? [state] : [])).rows;
  }
  /** Legacy projections so existing readers (candidate cards, election_results) follow the latest snapshot. */
  async syncDerived(client, electionId, input) {
    await client.query(
      "UPDATE candidates SET is_winner = false, is_projected_winner = false WHERE election_id = $1 AND (is_winner OR is_projected_winner)",
      [electionId]
    );
    for (const c2 of input.candidates) {
      if (c2.candidateId === null) continue;
      await client.query(
        "UPDATE candidates SET votes_received = $1, vote_percentage = $2, is_winner = $3 WHERE id = $4 AND election_id = $5",
        [c2.votes, c2.percent, c2.isWinner === true, c2.candidateId, electionId]
      );
    }
    await client.query(
      `INSERT INTO election_results (election_id, total_votes, reporting_precincts, total_precincts, percent_reporting, is_complete, is_certified, last_updated, results_source)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)
       ON CONFLICT (election_id) DO UPDATE SET
         total_votes = EXCLUDED.total_votes, reporting_precincts = EXCLUDED.reporting_precincts, total_precincts = EXCLUDED.total_precincts,
         percent_reporting = EXCLUDED.percent_reporting, is_certified = EXCLUDED.is_certified, last_updated = EXCLUDED.last_updated, results_source = EXCLUDED.results_source`,
      [
        electionId,
        input.totalVotes,
        input.reporting?.precinctsReporting ?? null,
        input.reporting?.precinctsTotal ?? null,
        input.reporting?.percent ?? null,
        input.status === "certified",
        input.retrievedAt,
        input.source.name
      ]
    );
  }
};

// artifacts/registry-independent/pg-boundary.ts
var url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "et6-prod-109656-3a740d1d-db" || url.pathname !== "/et6_receiving") throw Error("private guard");
var c = new Client({ connectionString: url.href });
await c.connect();
var tables = ["elections", "candidates", "candidate_source_records", "general_candidate_list_snapshots", "candidate_ingest_runs", "election_catalog_correction_runs", "official_results_sync_runs", "election_result_reports", "candidate_result_lines", "result_evidence_blobs", "election_results"];
async function digests() {
  const out = {};
  for (const t of tables) {
    const q = await c.query(`SELECT to_jsonb(t) AS row FROM public.${t} t ORDER BY to_jsonb(t)::text`);
    out[t] = { count: q.rowCount, sha256: createHash3("sha256").update(JSON.stringify(q.rows)).digest("hex") };
  }
  return out;
}
var before = await digests();
var cases = [];
var rollback = false;
try {
  await c.query("BEGIN");
  const race = (await c.query("SELECT id,state,date,type FROM elections WHERE date < CURRENT_DATE AND state IS NOT NULL ORDER BY id LIMIT 1")).rows[0];
  if (!race) throw Error("no past race");
  const day = race.date.toISOString().slice(0, 10);
  const source = { id: "private-registry-boundary", name: "PRIVATE TEST ONLY", kind: "official_state_enr", state: race.state, electionIds: [race.id], electionDate: day, phase: race.type, allowedUrls: ["https://example.invalid/results"] };
  const proxy = { query: (...args) => c.query(...args), connect: async () => ({ query: (sql, ...args) => c.query(sql === "BEGIN" ? "SAVEPOINT writer" : sql === "COMMIT" ? "RELEASE SAVEPOINT writer" : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT writer" : sql, ...args), release: () => {
  } }) };
  const store = new PgResultReportStore(proxy);
  const input = { schemaVersion: 1, electionId: race.id, status: "unofficial", reporting: { percent: null, basis: null, precinctsReporting: null, precinctsTotal: null }, source: { id: source.id, kind: source.kind, name: source.name, url: source.allowedUrls[0], sourceContestId: "private-boundary" }, sourcePayloadSha256: "a".repeat(64), asOf: null, asOfBasis: "not_provided", retrievedAt: (/* @__PURE__ */ new Date()).toISOString(), totalVotes: 1, candidates: [{ candidateId: null, sourceCandidateId: "private-fixture", name: "PRIVATE TEST ONLY", party: null, votes: 1, percent: null, isWinner: false }], winnerCalledBy: null, certification: null, note: null, supersedesReportId: null };
  for (const [name, patch] of [["id", { electionIds: [999999] }], ["state", { state: race.state === "NC" ? "LA" : "NC" }], ["date", { electionDate: "1900-01-01" }], ["phase", { phase: "not-the-race-phase" }]]) {
    resultsSourceRegistry.clear();
    resultsSourceRegistry.register({ ...source, ...patch });
    const prior = await digests();
    let refusal = null;
    try {
      await store.recordResultReport(race.id, input, { postedBy: "private-boundary", idempotencyKey: null });
    } catch (e) {
      refusal = { status: e.status, code: e.publicCode };
    }
    const unchanged2 = JSON.stringify(prior) === JSON.stringify(await digests());
    const worked = refusal?.status === 422 && ["source_mismatch", "unknown_source"].includes(refusal.code) && unchanged2;
    cases.push({ name, refusal, unchanged: unchanged2, worked });
    if (!worked) throw Error("boundary failed " + name);
  }
  resultsSourceRegistry.clear();
  resultsSourceRegistry.register(source);
  const outcome = await store.recordResultReport(race.id, input, { postedBy: "private-boundary", idempotencyKey: null });
  cases.push({ name: "valid-control", created: outcome.created, worked: outcome.created === true });
  if (!outcome.created) throw Error("control failed");
} finally {
  await c.query("ROLLBACK");
  rollback = true;
}
var after = await digests();
await c.end();
var unchanged = JSON.stringify(before) === JSON.stringify(after);
console.log(JSON.stringify({ outcome: unchanged && cases.every((x) => x.worked) ? "Worked" : "Failed", cases, rollback, before, after, unchanged, sequenceCaveat: "PostgreSQL result sequence increments are not transactional; source table rows are unchanged." }, null, 2));
if (!unchanged) process.exitCode = 1;
