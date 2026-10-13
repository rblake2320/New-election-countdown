// scripts/finish_source_gap_receipt_sd.mjs
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join } from "node:path";

// scripts/source_data_rollback.ts
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync, openSync, fsyncSync, closeSync } from "node:fs";
import { resolve, relative } from "node:path";

// server/official-results-manifest.ts
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
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port;
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

// server/official-results-manifest.ts
var RESULTS_DATE = "2026-11-03";
var RESULTS_STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ").sort();
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  }
  return JSON.stringify(value);
}
var hashSchema = z2.string().regex(/^[a-f0-9]{64}$/);
var entrySchema = z2.object({
  state: z2.enum(RESULTS_STATES),
  officialResultsUrl: httpsResultsUrl.nullable(),
  source: officialResultsSourceSchema
}).strict().superRefine((entry, ctx) => {
  if (entry.officialResultsUrl !== null !== (entry.source.routeVerification === "worked")) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Blocked routes must have a null destination" });
  }
});
var resultsManifestSchema = z2.object({
  version: z2.literal(1),
  targetElectionDate: z2.literal(RESULTS_DATE),
  reviews: z2.array(z2.object({ file: z2.string(), sha256: hashSchema }).strict()).min(1),
  states: z2.array(entrySchema).length(50)
}).strict().superRefine((manifest, ctx) => {
  if (manifest.states.map((s) => s.state).sort().join(" ") !== RESULTS_STATES.join(" ")) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Exactly the 50 unique reviewed states are required" });
  }
});

// scripts/source_data_rollback.ts
var DATA_TABLES = ["elections", "candidates", "candidate_source_records", "general_candidate_list_snapshots", "candidate_ingest_runs", "election_catalog_correction_runs", "official_results_sync_runs"];
var SourceReleaseRefused = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "SourceReleaseRefused";
  }
};
function requirePrivateDatabase(name) {
  if (!/^et_sol_data_[a-z0-9_]+$/.test(name)) throw new SourceReleaseRefused("PRIVATE_DATABASE_REQUIRED", "Only the approved source-data private database prefix is writable");
}
function sourceHash(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
var PRIVATE_ROOT = resolve("C:/.codex/private/election-source-backups");
function requirePrivatePath(path) {
  const rel = relative(PRIVATE_ROOT, resolve(path));
  if (!rel || rel.startsWith("..") || resolve(path) === PRIVATE_ROOT) throw new SourceReleaseRefused("PRIVATE_BACKUP_PATH_REQUIRED", "Raw row images must remain under the owner-restricted backup root");
}
function validateSourceSnapshot(value, authorize = requirePrivateDatabase) {
  const s = value;
  if (!s || typeof s !== "object" || s.version !== 1 || typeof s.database !== "string" || !s.tables || typeof s.tables !== "object" || Object.keys(s.tables).sort().join("|") !== [...DATA_TABLES].sort().join("|") || DATA_TABLES.some((t) => !Array.isArray(s.tables[t])) || sourceHash(s.tables) !== s.hash) throw new SourceReleaseRefused("SNAPSHOT_HASH_MISMATCH", "Private row-image schema/hash is invalid");
  authorize(s.database);
  return s;
}
function loadPrivateSnapshot(path, authorize = requirePrivateDatabase) {
  requirePrivatePath(path);
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new SourceReleaseRefused("INVALID_SNAPSHOT_JSON", "Private row-image JSON is incomplete or malformed; its contents are never printed");
    throw error;
  }
  return validateSourceSnapshot(value, authorize);
}

// scripts/finish_source_gap_receipt_sd.mjs
var dir = "artifacts/source-gap-private-sd";
var receipt = JSON.parse(readFileSync2(dir + "/full-private-gate.json"));
if (receipt.outcome !== "Worked" || receipt.database !== "et_sol_data_6c78a3148c6b") throw new Error("Successful actual private receipt required");
var backup = join("C:/.codex/private/election-source-backups", receipt.privateBackupRunId);
var before = loadPrivateSnapshot(join(backup, "before.json"));
var after = loadPrivateSnapshot(join(backup, "after-apply.json"));
if (before.hash !== receipt.checks[0].actual || after.hash !== receipt.afterApplyHash) throw new Error("Raw private snapshot binding differs");
var oldIds = new Set(before.tables.candidates.map((c) => c.id));
var states = ["SC", "FL", "GA", "MN", "AR", "AZ", "IL"];
receipt.apply.actualNewProfilesByState = Object.fromEntries(states.map((state) => [state, after.tables.candidates.filter((c) => !oldIds.has(c.id) && after.tables.elections.some((e) => e.id === c.election_id && e.state === state)).length]));
for (const stage of ["plan", "apply", "repeat"]) for (const value of Object.values(receipt[stage].byState)) {
  value.unboundActions = value.newProfiles;
  delete value.newProfiles;
}
if (Object.values(receipt.apply.actualNewProfilesByState).reduce((a, b) => a + b, 0) !== receipt.apply.candidateInserts) throw new Error("Actual inserted rows do not conserve the application count");
receipt.actualCountDerivation = "Independent original and after-apply owner-restricted full row snapshots; no new database operations. unboundActions reports planner IDs before binding, not actual insertion count.";
writeFileSync2(dir + "/full-private-gate.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ outcome: "Worked", actualNewProfilesByState: receipt.apply.actualNewProfilesByState, actualInserted: receipt.apply.candidateInserts, noDatabaseOperations: true }));
