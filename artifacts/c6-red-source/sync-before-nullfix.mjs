// scripts/sync_official_results.ts
import "dotenv/config";
import pg from "pg";
import { open, rename, unlink } from "node:fs/promises";
import { resolve as resolve2 } from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";

// server/official-results-manifest.ts
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { z as z2 } from "zod";

// shared/official-results.ts
import { z } from "zod";
var officialResultsRouteTypes = [
  "generic_results_portal",
  "government_elections_fallback",
  "government_results_archive",
  "government_results_gateway",
  "government_results_history_information",
  "government_results_landing",
  "year_results_landing"
];
var httpsResultsUrl = z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.port;
}, "An HTTPS URL without credentials or a custom port is required");
var officialResultsSourceSchema = z.object({
  targetElectionDate: z.literal("2026-11-03"),
  electionPhase: z.enum(["general", "primary", "runoff", "other"]),
  routeType: z.enum(officialResultsRouteTypes),
  publisher: z.string().min(1).max(512),
  checkedAt: z.string().datetime({ offset: true }),
  routeVerification: z.enum(["worked", "blocked"]),
  status: z.enum(["not_linked", "unknown"]),
  availabilityReason: z.enum([
    "not_linked_in_checked_official_sources",
    "advertised_route_election_not_in_selector",
    "unknown_portal_data_load_failed",
    "unknown_portal_election_context",
    "unknown_results_portal_tls_blocked",
    "unknown_transport_blocked",
    "unknown_election_phase"
  ]),
  governmentUrl: httpsResultsUrl,
  fallbackUrl: httpsResultsUrl.nullable(),
  advertisedGeneralUrl: httpsResultsUrl.nullable(),
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  sourceReviewSha256: z.string().regex(/^[a-f0-9]{64}$/)
}).strict().superRefine((source, ctx) => {
  if (source.status === "not_linked" && (source.electionPhase !== "general" || source.availabilityReason !== "not_linked_in_checked_official_sources" || source.routeVerification !== "worked")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "not_linked requires a checked general-election context" });
  }
});
var officialResultsFieldsSchema = z.object({
  officialResultsUrl: httpsResultsUrl.nullable().default(null),
  officialResultsSource: officialResultsSourceSchema.nullable().default(null)
}).superRefine((fields2, ctx) => {
  if (fields2.officialResultsUrl !== null && fields2.officialResultsSource?.routeVerification !== "worked") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A destination requires verified source metadata" });
  }
});

// server/official-results-manifest.ts
var RESULTS_DATE = "2026-11-03";
var RESULTS_STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ").sort();
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
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
function governmentUrl(value) {
  const url = httpsResultsUrl.parse(value);
  const host = new URL(url).hostname.toLowerCase();
  if (!(host.endsWith(".gov") || ["electionstats.state.ma.us", "mvic.sos.state.mi.us"].includes(host))) {
    throw new Error("This source snapshot admits only reviewed government routes");
  }
  return url;
}
function manifestFromReviews(reviews) {
  const states = [];
  for (const review of reviews) {
    const document = JSON.parse(review.bytes.toString("utf8"));
    if (document.kind !== "official_results_route_review" || document.targetElectionDate !== RESULTS_DATE || !Array.isArray(document.records)) {
      throw new Error("Not a reviewed November 3 official-results inventory");
    }
    for (const record of document.records) {
      const verified = ["worked", "worked_primary_source_web_fetch"].includes(record.verification?.outcome);
      if (!verified && record.verification?.outcome !== "blocked") throw new Error("Missing source verification");
      const source = officialResultsSourceSchema.parse({
        targetElectionDate: RESULTS_DATE,
        electionPhase: "general",
        routeType: record.routeType,
        publisher: record.publisher,
        checkedAt: record.verification.checkedAt,
        routeVerification: verified ? "worked" : "blocked",
        status: verified && record.generalPublicationStatus === "not_linked_in_checked_official_sources" ? "not_linked" : "unknown",
        availabilityReason: record.generalPublicationStatus,
        governmentUrl: governmentUrl(record.officialGovernmentPage),
        fallbackUrl: record.fallbackGovernmentUrl === null ? null : governmentUrl(record.fallbackGovernmentUrl),
        advertisedGeneralUrl: record.nov3GeneralSpecificUrl === null ? null : governmentUrl(record.nov3GeneralSpecificUrl),
        documentSha256: record.verification.originalResponseSha256,
        sourceReviewSha256: sha256(review.bytes)
      });
      states.push(entrySchema.parse({
        state: record.state,
        officialResultsUrl: verified ? governmentUrl(record.recommendedUrl) : null,
        source
      }));
    }
  }
  states.sort((a, b) => a.state.localeCompare(b.state));
  return resultsManifestSchema.parse({
    version: 1,
    targetElectionDate: RESULTS_DATE,
    reviews: reviews.map((r) => ({ file: r.file, sha256: sha256(r.bytes) })),
    states
  });
}
async function loadResultsManifest(path) {
  const bytes = await readFile(path);
  const manifest = resultsManifestSchema.parse(JSON.parse(bytes.toString("utf8")));
  const directory = await realpath(dirname(resolve(path)));
  const reviews = [];
  for (const review of manifest.reviews) {
    if (isAbsolute(review.file) || review.file.includes("\\")) throw new Error("Review paths must be relative");
    const actual = await realpath(resolve(directory, review.file));
    const rel = relative(directory, actual);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Review path escapes manifest directory");
    const proof = await readFile(actual);
    if (sha256(proof) !== review.sha256) throw new Error("Source review bytes changed");
    reviews.push({ file: review.file, bytes: proof });
  }
  if (canonical(manifestFromReviews(reviews)) !== canonical(manifest)) throw new Error("Manifest differs from reviewed source facts");
  return { manifest, manifestSha256: sha256(bytes) };
}
function sourceForElection(entry, electionType) {
  const type = electionType.trim().toLowerCase();
  const electionPhase = type === "general" ? "general" : type.includes("primary") ? "primary" : type.includes("runoff") ? "runoff" : "other";
  return officialResultsSourceSchema.parse({
    ...entry.source,
    electionPhase,
    ...electionPhase === "general" ? {} : { status: "unknown", availabilityReason: "unknown_election_phase" }
  });
}

// server/official-results-sync.ts
import { randomUUID } from "node:crypto";
import { z as z3 } from "zod";
var RESULTS_WRITER_LOCK = 2026110301;
var digestSchema = z3.string().regex(/^[a-f0-9]{64}$/);
var fields = (row) => ({
  official_results_url: row.official_results_url ?? null,
  official_results_source: row.official_results_source ?? null
});
function catalogHash(rows) {
  return sha256(canonical(rows));
}
function afterChanges(rows, changes) {
  const updates = new Map(changes.map((change) => [change.id, change.after]));
  return rows.map((row) => updates.has(row.id) ? { ...row, ...updates.get(row.id) } : row);
}
function planResults(rows, manifest, manifestSha256) {
  digestSchema.parse(manifestSha256);
  manifest = resultsManifestSchema.parse(manifest);
  const entries = new Map(manifest.states.map((entry) => [entry.state, entry]));
  const stateCounts = Object.fromEntries(RESULTS_STATES.map((state) => [state, 0]));
  const changes = [];
  for (const row of rows) {
    if (row.date.slice(0, 10) !== RESULTS_DATE || !entries.has(row.state)) continue;
    stateCounts[row.state]++;
    const entry = entries.get(row.state);
    const source = sourceForElection(entry, row.type);
    const before = fields(row);
    if (before.official_results_source !== null) {
      const previous = officialResultsSourceSchema.parse(before.official_results_source);
      if (new Date(previous.checkedAt).getTime() > new Date(source.checkedAt).getTime()) {
        throw new Error(`Newer results-source evidence exists for election ${row.id}`);
      }
    }
    const after = { official_results_url: entry.officialResultsUrl, official_results_source: source };
    if (canonical(before) !== canonical(after)) changes.push({ id: row.id, before, after });
  }
  const missing = RESULTS_STATES.filter((state) => stateCounts[state] === 0);
  if (missing.length) throw new Error("No November 3 receiving elections for reviewed states: " + missing.join(","));
  return {
    version: 1,
    operation: "apply",
    manifestSha256,
    preimageSha256: catalogHash(rows),
    postimageSha256: catalogHash(afterChanges(rows, changes)),
    targetCount: Object.values(stateCounts).reduce((sum, count) => sum + count, 0),
    stateCounts,
    changes,
    rollbackOf: null
  };
}
async function snapshot(client) {
  const result = await client.query(
    "SELECT to_jsonb(e) AS row FROM public.elections e ORDER BY e.id"
  );
  return result.rows.map((record) => record.row);
}
async function requireMigration(client) {
  const result = await client.query(`SELECT to_regclass('public.elections') AS elections,
    to_regclass('public.official_results_sync_runs') AS audit,
    (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public'
      AND table_name='elections' AND column_name IN ('official_results_url','official_results_source')) AS columns`);
  if (!result.rows[0].elections || !result.rows[0].audit || result.rows[0].columns !== 2) {
    throw new Error("Run migrations/20261011_official_results_routes.sql before source sync");
  }
}
async function rollbackPlan(client, rows, runId) {
  const result = await client.query("SELECT * FROM public.official_results_sync_runs WHERE id=$1", [runId]);
  const run = result.rows[0];
  if (!run || run.operation !== "apply") throw new Error("Rollback requires a committed apply run");
  const rolledBack = await client.query("SELECT id FROM public.official_results_sync_runs WHERE rollback_of=$1", [runId]);
  if (rolledBack.rowCount) throw new Error("Apply run has already been rolled back");
  if (catalogHash(rows) !== run.postimage_sha256) throw new Error("Rollback refused: catalog changed after this run");
  const changes = run.changes.map((change) => ({ id: change.id, before: change.after, after: change.before }));
  const postimageSha256 = catalogHash(afterChanges(rows, changes));
  if (postimageSha256 !== run.preimage_sha256) throw new Error("Rollback audit preimage mismatch");
  return {
    version: 1,
    operation: "rollback",
    manifestSha256: run.manifest_sha256,
    preimageSha256: run.postimage_sha256,
    postimageSha256,
    targetCount: run.target_count,
    stateCounts: {},
    changes,
    rollbackOf: runId
  };
}
async function syncOfficialResults(pool2, options) {
  const mode = options.mode ?? "dry-run";
  if (mode === "apply") {
    digestSchema.parse(options.expectedManifestSha256);
    digestSchema.parse(options.expectedPreimageSha256);
  }
  if (!options.rollbackRunId && (!options.manifest || !options.manifestSha256)) throw new Error("Source manifest required");
  if (options.rollbackRunId && options.manifest) throw new Error("Rollback does not consume a new source manifest");
  const client = await pool2.connect();
  try {
    await client.query(mode === "apply" ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await requireMigration(client);
    if (mode === "apply") {
      await client.query("SELECT pg_advisory_xact_lock($1)", [RESULTS_WRITER_LOCK]);
      await client.query("LOCK TABLE public.elections IN SHARE ROW EXCLUSIVE MODE");
    }
    const before = await snapshot(client);
    const plan = options.rollbackRunId ? await rollbackPlan(client, before, options.rollbackRunId) : planResults(before, options.manifest, options.manifestSha256);
    if (mode === "apply" && options.expectedManifestSha256 !== plan.manifestSha256) throw new Error("Manifest SHA guard rejected this apply");
    if (mode === "apply" && options.expectedPreimageSha256 !== plan.preimageSha256) throw new Error("Catalog preimage guard rejected this apply");
    const runId = mode === "apply" ? randomUUID() : null;
    if (mode === "apply") {
      let written = 0;
      for (const change of plan.changes) {
        officialResultsFieldsSchema.parse({
          officialResultsUrl: change.after.official_results_url,
          officialResultsSource: change.after.official_results_source
        });
        const result = await client.query(
          `UPDATE public.elections
          SET official_results_url=$1, official_results_source=$2::jsonb WHERE id=$3
          AND official_results_url IS NOT DISTINCT FROM $4
          AND official_results_source IS NOT DISTINCT FROM $5::jsonb RETURNING id`,
          [
            change.after.official_results_url,
            JSON.stringify(change.after.official_results_source),
            change.id,
            change.before.official_results_url,
            JSON.stringify(change.before.official_results_source)
          ]
        );
        if (result.rowCount !== 1) throw new Error("Results fields changed while applying election " + change.id);
        if (++written === options.faultAfterWrites) throw new Error("Injected C6 rollback acceptance failure");
      }
      const after = await snapshot(client);
      if (catalogHash(after) !== plan.postimageSha256) throw new Error("Postimage differs: unrelated fields or catalog membership changed");
      await client.query(
        `INSERT INTO public.official_results_sync_runs
        (id,operation,manifest_sha256,preimage_sha256,postimage_sha256,target_count,changed_count,changes,rollback_of)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
        [
          runId,
          plan.operation,
          plan.manifestSha256,
          plan.preimageSha256,
          plan.postimageSha256,
          plan.targetCount,
          plan.changes.length,
          JSON.stringify(plan.changes),
          plan.rollbackOf
        ]
      );
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }
    return { ...plan, mode, changedCount: plan.changes.length, runId };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }
    throw error;
  } finally {
    client.release();
  }
}

// scripts/sync_official_results.ts
var args = process.argv.slice(2);
var allowed = /* @__PURE__ */ new Set(["--apply", "--manifest", "--expect-sha256", "--expect-preimage-sha256", "--receipt", "--rollback-run"]);
var values = /* @__PURE__ */ new Map();
for (let index = 0; index < args.length; index++) {
  const key = args[index];
  if (!allowed.has(key) || values.has(key)) throw new Error("Unknown or repeated CLI argument");
  if (key === "--apply") values.set(key, "true");
  else {
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error("CLI argument requires a value: " + key);
    values.set(key, value);
  }
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (values.has("--rollback-run") && values.has("--manifest")) throw new Error("Rollback cannot specify a manifest");
if (!values.has("--receipt")) throw new Error("--receipt requires a new retained evidence file");
var destination = resolve2(values.get("--receipt"));
var temporary = destination + ".tmp-" + randomUUID2();
var reservation = await open(destination, "wx", 384);
await reservation.close();
var pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
var committed = false;
try {
  const proof = values.has("--rollback-run") ? {} : await loadResultsManifest(values.get("--manifest") ?? "data/official-results/2026-11-03.json");
  const receipt = await syncOfficialResults(pool, {
    ...proof,
    mode: values.has("--apply") ? "apply" : "dry-run",
    expectedManifestSha256: values.get("--expect-sha256"),
    expectedPreimageSha256: values.get("--expect-preimage-sha256"),
    rollbackRunId: values.get("--rollback-run")
  });
  committed = receipt.mode === "apply";
  const output = await open(temporary, "wx", 384);
  try {
    await output.writeFile(JSON.stringify(receipt, null, 2) + "\n");
    await output.sync();
  } finally {
    await output.close();
  }
  await rename(temporary, destination);
  console.log(JSON.stringify({
    mode: receipt.mode,
    operation: receipt.operation,
    runId: receipt.runId,
    targetCount: receipt.targetCount,
    changedCount: receipt.changedCount,
    manifestSha256: receipt.manifestSha256,
    preimageSha256: receipt.preimageSha256,
    postimageSha256: receipt.postimageSha256,
    receipt: destination
  }));
} catch (error) {
  console.error(committed ? "C6 apply committed; receipt export failed. Recover the durable DB audit before retrying." : "C6 operation refused or rolled back. Inspect the source/guard/migration and retained private diagnostics.");
  if (!committed) await unlink(destination).catch(() => {
  });
  await unlink(temporary).catch(() => {
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
