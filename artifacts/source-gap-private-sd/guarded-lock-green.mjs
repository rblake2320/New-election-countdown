// scripts/probe_source_gap_guarded_sd.mjs
import pg from "pg";
import { parse } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash as createHash3 } from "node:crypto";

// server/louisiana-house-catalog.ts
var LOUISIANA_HOUSE_SOURCE = Object.freeze({
  name: "Louisiana Secretary of State \u2014 DETAILS FOR U.S. HOUSE RACES IN FALL FINALIZED",
  url: "https://www.sos.la.gov/media/dcvl5ojl/051426-fall-house-races.pdf",
  sha256: "3319c7cba10c5cd5cc74f2a4cfb2d42935e998cbbfb14746ece63050ee8bedb3",
  publishedAt: "2026-05-14",
  ruleUrl: "https://www.sos.la.gov/elections-voting/types-of-elections"
});
function isLouisiana2026HouseOpenPrimary(e) {
  const day2 = e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date.slice(0, 10);
  return e.state === "LA" && day2 === "2026-11-03" && e.level.toLowerCase() === "federal" && Boolean(e.offices?.includes("U.S. House of Representatives"));
}

// server/candidate-nominee-sync.ts
import { createHash } from "node:crypto";
import { z } from "zod";

// server/fec-candidate-sync.ts
var FEC_MASTER_URL = "https://www.fec.gov/files/bulk-downloads/2026/cn26.zip";
var STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
function normalizedCandidateName(name) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// server/candidate-nominee-sync.ts
var states = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
var day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");
var stateCode = z.string().refine((value) => states.has(value), "Expected a US state");
var access = z.enum(["printed", "write_in", "not_specified"]);
var ARIZONA_PIMA_GENERAL_URL = "https://content.civicplus.com/api/assets/az-pimacounty/d2c310c3-ade7-484e-a6f0-1ddaebec0799";
var ARIZONA_PIMA_WRITE_IN_URL = "https://content.civicplus.com/api/assets/az-pimacounty/b54c9e42-8520-4201-be8d-10b859da80df";
var ARIZONA_CCEC_PARTY_IDENTITY_URL = "https://storageccec.blob.core.usgovcloudapi.net/public/docs/1509-1497AllDistrictWebEnglishv2.pdf";
var ARIZONA_CCEC_SHA256 = "67bc4e66b68a5883f6f68a4fa165d807eb4bbf5a78a3640bd3eac9b08273b5fb";
var officialSourceUrl = z.string().url().refine((value) => {
  try {
    const u2 = new URL(value);
    const ncOfficialBucket = u2.hostname === "s3.amazonaws.com" && u2.pathname.startsWith("/dl.ncsbe.gov/Elections/2026/");
    const floridaOfficialPortal = u2.hostname === "dos.elections.myflorida.com" && u2.pathname.startsWith("/candidates/");
    const michiganOfficialPortal = u2.hostname === "mi-boe.entellitrak.com" && u2.pathname === "/etk-mi-boe-prod/page.request.do" && u2.searchParams.get("electionType") === "GEN" && u2.searchParams.get("electionYear") === "2026" && u2.searchParams.get("page") === "page.miboePublicReport";
    const tennesseeOfficialFiles = u2.hostname === "sos-prod.tnsosgovfiles.com" && ["/s3fs-public/document/Governor_Nov2026.xlsx", "/s3fs-public/document/USSenate_Nov2026.xlsx", "/s3fs-public/document/USHouse_Nov2026.xlsx"].includes(u2.pathname);
    const oregonOfficialDirective = ["multco.us", "www.multco.us"].includes(u2.hostname) && u2.pathname === "/file/ballot_directive_-_november_3,_2026_general/download";
    const montanaReviewedBallot = u2.hostname === "missoulacounty.sharepoint.com" && u2.pathname === "/administration/elect/Public/Forms/AllItems.aspx" && u2.searchParams.get("id") === "/administration/elect/Public/Sample Ballots/20261103 Federal General Sample Ballots/01-BONN92.pdf";
    return u2.protocol === "https:" && !u2.username && !u2.password && (!u2.port || u2.port === "443") && (u2.hostname.endsWith(".gov") || /\.state\.[a-z]{2}\.us$/i.test(u2.hostname) || ncOfficialBucket || floridaOfficialPortal || michiganOfficialPortal || tennesseeOfficialFiles || oregonOfficialDirective || montanaReviewedBallot || value === ARIZONA_PIMA_GENERAL_URL || value === ARIZONA_PIMA_WRITE_IN_URL);
  } catch {
    return false;
  }
}, "Expected an official government HTTPS source");
var MASSACHUSETTS_JAMES_IDENTITY_URL = "https://ocpf2.blob.core.windows.net/pdf/filers/19010/19010-cpf101-1-030325.pdf";
var partyEvidenceUrl = z.union([officialSourceUrl, z.literal(ARIZONA_CCEC_PARTY_IDENTITY_URL)]);
var identityEvidenceUrl = z.union([officialSourceUrl, z.literal(MASSACHUSETTS_JAMES_IDENTITY_URL), z.literal(ARIZONA_CCEC_PARTY_IDENTITY_URL)]);
var scopeSchema = z.object({ office: z.enum(["H", "S", "G"]), district: z.string().regex(/^\d{2}$/), partyRaw: z.string().optional(), ballotAccessType: access.optional(), expectedCount: z.number().int().nonnegative() }).strict();
var sourceSchema = z.object({
  id: z.string().min(1),
  state: stateCode,
  kind: z.literal("official_general_candidate_list"),
  name: z.string().min(1),
  url: officialSourceUrl,
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  publishedAt: day.nullable(),
  retrievedAt: z.string().refine((value) => Number.isFinite(new Date(value).getTime()), "Invalid retrieval timestamp"),
  electionDate: day.refine((value) => value.startsWith("2026-"), "Expected 2026 source"),
  completeScopes: z.array(scopeSchema),
  expectedRowCount: z.number().int().nonnegative()
}).strict().superRefine((source, ctx) => {
  let host;
  try {
    host = new URL(source.url).hostname;
  } catch {
    return;
  }
  const expected = host === "mi-boe.entellitrak.com" ? "MI" : host === "dos.elections.myflorida.com" ? "FL" : host === "s3.amazonaws.com" ? "NC" : host === "sos-prod.tnsosgovfiles.com" ? "TN" : ["multco.us", "www.multco.us"].includes(host) ? "OR" : host === "missoulacounty.sharepoint.com" ? "MT" : null;
  if (expected && source.state !== expected) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Delegated source does not match its government authority state", path: ["state"] });
  if ([ARIZONA_PIMA_GENERAL_URL, ARIZONA_PIMA_WRITE_IN_URL].includes(source.url) && source.state !== "AZ") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Reviewed Pima general source must belong to Arizona", path: ["state"] });
});
var rowSchema = z.object({
  sourceId: z.string(),
  state: stateCode,
  office: z.enum(["H", "S", "G"]),
  district: z.string().regex(/^\d{2}$/),
  date: day,
  name: z.string().trim().min(1).max(200),
  partyRaw: z.string(),
  incumbent: z.boolean().nullable().optional(),
  partyBasis: z.enum(["preference", "registration", "filing_method", "source_label"]).optional(),
  partyValue: z.string().trim().max(100).optional(),
  partyLabels: z.array(z.string().trim().min(1).max(100)).min(1).optional(),
  partyEvidence: z.object({ url: partyEvidenceUrl, sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), sourcePage: z.number().int().positive().optional(), title: z.string().min(1) }).strict().optional(),
  identityEvidence: z.object({ url: identityEvidenceUrl, sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), sourcePage: z.number().int().positive().optional(), title: z.string().min(1) }).strict().optional(),
  sourcePage: z.number().int().positive().optional(),
  ticketText: z.string().optional(),
  raceTitle: z.string().optional(),
  ballotAccessType: access.optional(),
  aliases: z.array(z.string().min(1).max(200)).optional(),
  ballotName: z.string().min(1).max(200).optional(),
  identityResolution: z.object({
    kind: z.literal("reviewed_fec_identity"),
    fecCandidateId: z.string().regex(/^[HS]\d[A-Z]{2}\d{5}$/),
    expectedFecPartyRaw: z.enum(["OTH", "IND", "UN", "LIB", "IDP"]),
    expectedStatePartyRaw: z.string().min(1),
    expectedFecName: z.string().trim().min(1).max(200).optional(),
    fecEvidence: z.object({ url: z.string().url(), sha256: z.string().regex(/^[a-f0-9]{64}$/), retrievedAt: z.string().refine((v) => Number.isFinite(new Date(v).getTime())) }).strict()
  }).strict().optional()
}).strict();
var manifestSchema = z.object({ version: z.literal(1), sources: z.array(sourceSchema).min(1), candidates: z.array(rowSchema) }).strict();
function parseNomineeManifest(raw) {
  const m = manifestSchema.parse(raw), sourceIds = /* @__PURE__ */ new Set(), identities = /* @__PURE__ */ new Set();
  const completed = [];
  for (const s of m.sources) {
    if (sourceIds.has(s.id)) throw new Error("duplicate source ID");
    sourceIds.add(s.id);
    const count = m.candidates.filter((r) => r.sourceId === s.id).length;
    if (count === 0 && !s.completeScopes.length) throw new Error("Empty source requires an explicitly complete zero-candidate scope");
    if (s.expectedRowCount != null && count !== s.expectedRowCount) throw new Error("source row count mismatch");
    for (const scope of s.completeScopes) {
      const next = { state: s.state, date: s.electionDate, office: scope.office, district: scope.district, party: scope.partyRaw ? partyKey(scope.partyRaw) : void 0, access: scope.ballotAccessType };
      if (completed.some((p) => p.state === next.state && p.date === next.date && p.office === next.office && p.district === next.district && (!p.party || !next.party || p.party === next.party) && (!p.access || !next.access || p.access === next.access))) throw new Error("overlapping complete source scopes");
      completed.push(next);
      const actual = m.candidates.filter((r) => r.sourceId === s.id && r.office === scope.office && r.district === scope.district && (!scope.partyRaw || partyKey(r.partyRaw) === partyKey(scope.partyRaw)) && (!scope.ballotAccessType || r.ballotAccessType === scope.ballotAccessType)).length;
      if (actual !== scope.expectedCount) throw new Error("source complete-scope row count mismatch");
    }
  }
  for (const r of m.candidates) {
    const source = m.sources.find((s) => s.id === r.sourceId);
    if (!source || source.state !== r.state || source.electionDate !== r.date) throw new Error("candidate does not match its source state/date");
    if (r.identityEvidence?.url === MASSACHUSETTS_JAMES_IDENTITY_URL && (r.state !== "MA" || r.office !== "G" || r.name !== "Andrea Corinne James")) throw new Error("Reviewed OCPF name identity does not match this candidate and office");
    for (const evidence of [r.partyEvidence, r.identityEvidence]) {
      if (evidence?.url !== ARIZONA_CCEC_PARTY_IDENTITY_URL) continue;
      const reviewed = { "Katie Hobbs": { page: 20, party: "DEM" }, "Andy Biggs": { page: 20, party: "REP" }, "Risa Lombardo": { page: 21, party: "GRN", value: "G" }, "Teri Ann Hourihan": { page: 21, party: "NOL" } };
      const identity = reviewed[r.name];
      if (r.state !== "AZ" || r.office !== "G" || r.district !== "00" || r.date !== "2026-11-03" || !identity || evidence.sha256 !== ARIZONA_CCEC_SHA256 || evidence.sourcePage !== identity.page || r.partyRaw !== identity.party || r.partyValue !== void 0 && r.partyValue !== identity.value) throw new Error("Reviewed CCEC evidence does not match its exact candidate, office, party, page and document");
    }
    if (r.office !== "H" && r.district !== "00") throw new Error("Statewide office must use district 00");
    if (r.partyBasis === "filing_method" && r.partyValue) throw new Error("A filing method cannot establish party affiliation");
    if (r.partyLabels && !r.partyLabels.includes(r.partyRaw)) throw new Error("Primary raw party label must be one of the actual ballot lines");
    if (r.partyBasis === "filing_method" && r.partyLabels) throw new Error("Filing-method rows cannot establish party ballot lines");
    if (r.identityResolution) {
      const resolution = r.identityResolution;
      if (resolution.expectedStatePartyRaw !== r.partyRaw) throw new Error("Identity resolution state party label differs from the reviewed row");
      if (resolution.expectedFecName && ![r.name, ...r.aliases ?? []].some((name) => normalizedCandidateName(name) === normalizedCandidateName(resolution.expectedFecName))) throw new Error("Reviewed FEC name must match the official name or a recorded official alias");
      if (r.office === "G" || resolution.fecCandidateId[0] !== r.office) throw new Error("FEC evidence identity office differs from the reviewed row");
      if (resolution.fecCandidateId.slice(2, 4) !== r.state) throw new Error("FEC evidence identity state differs from the reviewed row");
      if (resolution.fecEvidence.url !== `https://www.fec.gov/data/candidate/${resolution.fecCandidateId}/`) throw new Error("FEC evidence URL must identify the exact reviewed identity");
    }
    const key = `${r.state}|${r.office}|${r.district}|${r.date}|${normalizedCandidateName(r.name)}`;
    if (identities.has(key)) throw new Error("duplicate candidate input");
    identities.add(key);
  }
  return m;
}
function party(raw) {
  const wrapped = raw.trim().match(/^(?:\(Registered (.+)\)|Write-In \((.+)\))$/i);
  const p = (wrapped?.[1] ?? wrapped?.[2] ?? raw).trim(), preference = p.match(/^\(Prefers (.+) Party\)$/i);
  const key = (preference?.[1] ?? p).toLowerCase().replace(/\s+party$/, "");
  if (key === "by petition") return void 0;
  return { republican: "R", rep: "R", democratic: "D", democrat: "D", dem: "D", "democratic-npl": "D", "democratic-nonpartisan league": "D", "democratic-farmer-labor": "D", independent: "I", ind: "I", green: "G", gre: "G", libertarian: "L", lib: "L", constitution: "CON", conservative: "CRV" }[key] ?? p;
}
function rowParty(row) {
  return row.partyBasis === "filing_method" ? void 0 : row.partyValue ?? (row.partyLabels ? row.partyLabels.map((label) => party(label) ?? "").join("/") : party(row.partyRaw));
}
function partyComponents(raw) {
  return raw.split(/[\/,]/).map((value) => party(value.trim()) ?? "").filter(Boolean);
}
function partyKey(raw) {
  return (party(raw) ?? "method:by petition").toLowerCase();
}
function snapshotVersion(m, s) {
  return createHash("sha256").update(JSON.stringify({ url: s.url, documentSha: s.sha256, publishedAt: s.publishedAt, electionDate: s.electionDate, completeScopes: s.completeScopes, expectedRowCount: s.expectedRowCount, rows: m.candidates.filter((r) => r.sourceId === s.id).slice().sort((a, b2) => JSON.stringify(a).localeCompare(JSON.stringify(b2))) })).digest("hex");
}
function raceKey(e) {
  if (isLouisiana2026HouseOpenPrimary(e)) return;
  const date = typeof e.date === "string" ? e.date.slice(0, 10) : e.date.toISOString().slice(0, 10);
  if (!["general", "special"].includes(e.type.toLowerCase())) return;
  if (e.offices?.includes("U.S. Senate")) return `${e.state}|S|00|${date}`;
  if (e.offices?.includes("U.S. House of Representatives")) {
    const d = e.title.match(/\b([A-Z]{2})-(\d{2}|AL)\b/);
    if (d && d[1] === e.state) return `${e.state}|H|${d[2] === "AL" ? "00" : d[2]}|${date}`;
  }
  if (e.offices?.some((o) => /^governor$/i.test(o))) return `${e.state}|G|00|${date}`;
}
function reviewedFecIdentityMatches(row, c, sources) {
  const resolution = row.identityResolution;
  const expectedName = normalizedCandidateName(resolution?.expectedFecName ?? row.name);
  if (!resolution || c.data_source !== "fec_bulk" || c.source_status !== "fec_registered" || !["C", "F"].includes(c.fec_status ?? "") || c.fec_candidate_id !== resolution.fecCandidateId || c.party !== party(resolution.expectedFecPartyRaw) || !/^[a-f0-9]{64}$/.test(c.source_file_sha256 ?? "") || normalizedCandidateName(c.name) !== expectedName) return false;
  return sources.some((s) => s.candidate_id === c.id && s.is_current === true && s.source_url === FEC_MASTER_URL && s.source_file_sha256 === c.source_file_sha256 && s.metadata.fecCandidateId === resolution.fecCandidateId && s.metadata.partyRaw === resolution.expectedFecPartyRaw && s.metadata.fecStatus === c.fec_status && s.metadata.electionYear === 2026 && s.metadata.state === row.state && s.metadata.office === row.office && s.metadata.district === row.district && s.metadata.electionId === c.election_id && s.metadata.electionDate === row.date && s.metadata.normalizedName === expectedName);
}
function planNomineeRefresh(m, elections, candidates, fecSources = []) {
  const plan = { actions: [], unresolved: [] };
  const sourceHashes = new Map(m.sources.map((s) => [s.id, snapshotVersion(m, s)]));
  for (const row of m.candidates) {
    const key = `${row.state}|${row.office}|${row.district}|${row.date}`;
    const races = elections.filter((e) => raceKey(e) === key && (!row.raceTitle || e.title === row.raceTitle));
    if (races.length !== 1) {
      plan.unresolved.push({ name: row.name, reason: races.length ? "ambiguous-race" : "missing-race" });
      continue;
    }
    const names = [row.name, row.ballotName, ...row.aliases ?? []].filter((name) => typeof name === "string").map(normalizedCandidateName);
    const matches = candidates.filter((c) => c.election_id === races[0].id && names.includes(normalizedCandidateName(c.name)));
    const affiliation = rowParty(row);
    let sameParty = matches.filter((c) => affiliation === void 0 || affiliation === "" || partyComponents(c.party ?? "").some((value) => partyComponents(affiliation).includes(value)));
    let identityResolutionApplied = false;
    if (row.identityResolution) {
      if (matches.length !== 1 || !reviewedFecIdentityMatches(row, matches[0], fecSources)) {
        plan.unresolved.push({ name: row.name, reason: "fec-identity-resolution-conflict" });
        continue;
      }
      sameParty = matches;
      identityResolutionApplied = true;
    }
    if (sameParty.length > 1) {
      plan.unresolved.push({ name: row.name, reason: "ambiguous-identity" });
      continue;
    }
    if (matches.length && !sameParty.length) {
      plan.unresolved.push({ name: row.name, reason: "party-conflict" });
      continue;
    }
    const source = m.sources.find((s) => s.id === row.sourceId);
    plan.actions.push({ electionId: races[0].id, candidateId: sameParty[0]?.id, party: affiliation === void 0 || affiliation === "" ? sameParty[0]?.party ?? "" : affiliation, record: row, source, versionSha: sourceHashes.get(source.id), ...identityResolutionApplied ? { identityResolutionApplied: true } : {} });
  }
  const sharedIdentities = new Set(plan.actions.filter((a) => a.candidateId != null && plan.actions.filter((b2) => b2.candidateId === a.candidateId).length > 1).map((a) => a.candidateId));
  for (const a of plan.actions.filter((a2) => sharedIdentities.has(a2.candidateId))) plan.unresolved.push({ name: a.record.name, reason: "shared-existing-identity" });
  plan.actions = plan.actions.filter((a) => !sharedIdentities.has(a.candidateId));
  return plan;
}
function assertPublicationFresh(incoming, previous, observed, previousObserved) {
  const previousPublication = typeof previous === "string" && /^\d{4}-\d{2}-\d{2}$/.test(previous) ? previous : null;
  if (previousPublication && (!incoming || incoming < previousPublication)) throw new Error("Older or undated publication cannot replace a newer current general list");
  const previousTime = previousObserved instanceof Date ? previousObserved.getTime() : typeof previousObserved === "string" ? new Date(previousObserved).getTime() : NaN;
  if (incoming === previousPublication && Number.isFinite(previousTime) && new Date(observed).getTime() < previousTime) throw new Error("Older source observation cannot replace a newer general-list snapshot");
}
async function runNomineeRefreshOnce(pool2, m, manifestSha2, apply, operation) {
  if (!/^[a-f0-9]{64}$/.test(manifestSha2)) throw new Error("Reviewed manifest SHA256 required");
  const client = await pool2.connect();
  let sessionAdmission = false;
  try {
    if (apply && operation.beforeApply) {
      const admitted = await client.query("SELECT pg_try_advisory_lock($1) AS admitted", [2026110301]);
      if (admitted.rows[0]?.admitted !== true) throw new Error("Source identity writer is busy; guarded source apply refused before transaction");
      sessionAdmission = true;
    }
    await client.query(apply ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply && operation.beforeApply) await operation.beforeApply(client);
    else if (apply) await client.query("SELECT pg_advisory_xact_lock($1)", [2026110301]);
    const tables = (await client.query("SELECT to_regclass('public.elections') AS elections,to_regclass('public.candidates') AS candidates,to_regclass('public.candidate_source_records') AS sources,to_regclass('public.candidate_ingest_runs') AS audit,to_regclass('public.general_candidate_list_snapshots') AS snapshots")).rows[0];
    if (!tables.elections || !tables.candidates) throw new Error("ElectionTracker schema absent");
    if (apply && (!tables.sources || !tables.audit || !tables.snapshots)) throw new Error("Candidate source and general-list snapshot migrations required");
    const elections = (await client.query("SELECT id,state,title,level,type,date::text AS date,offices FROM elections ORDER BY id")).rows;
    const candidates = (await client.query("SELECT id,election_id,name,party,fec_candidate_id,fec_status,source_file_sha256,data_source,source_status FROM candidates ORDER BY id")).rows;
    const fecSources = m.candidates.some((r) => r.identityResolution) && tables.sources ? (await client.query("SELECT candidate_id,is_current,source_url,source_file_sha256,metadata FROM candidate_source_records WHERE source_layer='fec_registration' AND is_current=true AND source_url=$1", [FEC_MASTER_URL])).rows : [];
    const plan = planNomineeRefresh(m, elections, candidates, fecSources);
    if (plan.unresolved.length) {
      if (apply) throw new Error("Resolve all identity/race conflicts before applying a complete nominee snapshot");
      await client.query("ROLLBACK");
      return plan;
    }
    const previousByAction = /* @__PURE__ */ new Map();
    for (const a of plan.actions) {
      const previous = a.candidateId != null && tables.sources ? (await client.query("SELECT id,source_file_sha256,source_url,source_synced_at,metadata FROM candidate_source_records WHERE candidate_id=$1 AND source_layer=$2 AND is_current=true", [a.candidateId, "general_candidate_list"])).rows : [];
      for (const record of previous) assertPublicationFresh(a.source.publishedAt, record.metadata?.publishedAt, a.source.retrievedAt, record.source_synced_at);
      previousByAction.set(a, previous);
    }
    const receivingScopes = [];
    for (const source of m.sources) for (const scope of source.completeScopes) {
      const raceIds = elections.filter((e) => raceKey(e) === `${source.state}|${scope.office}|${scope.district}|${source.electionDate}`).map((e) => e.id);
      if (raceIds.length !== 1) throw new Error("Complete scope has no unique receiving race");
      const electionId = raceIds[0];
      const current = tables.sources ? (await client.query(`SELECT s.metadata,s.source_synced_at FROM candidate_source_records s JOIN candidates c ON c.id=s.candidate_id WHERE c.election_id=$1 AND s.source_layer='general_candidate_list' AND s.is_current=true
        AND ($2::text IS NULL OR s.metadata->>'partyKey'=$2) AND ($3::text IS NULL OR s.metadata->>'ballotAccessType'=$3)`, [electionId, scope.partyRaw ? partyKey(scope.partyRaw) : null, scope.ballotAccessType ?? null])).rows : [];
      for (const record of current) assertPublicationFresh(source.publishedAt, record.metadata?.publishedAt, source.retrievedAt, record.source_synced_at);
      const snapshots = tables.snapshots ? (await client.query("SELECT id,scope_key,source_url,source_file_sha256,source_synced_at,is_current,metadata FROM general_candidate_list_snapshots WHERE election_id=$1", [electionId])).rows : [];
      const overlappingHistory = snapshots.filter((record) => {
        const old = record.metadata.scope;
        return old.office === scope.office && old.district === scope.district && (!old.partyRaw || !scope.partyRaw || partyKey(old.partyRaw) === partyKey(scope.partyRaw)) && (!old.ballotAccessType || !scope.ballotAccessType || old.ballotAccessType === scope.ballotAccessType);
      });
      for (const record of overlappingHistory) assertPublicationFresh(source.publishedAt, record.metadata.publishedAt, source.retrievedAt, record.source_synced_at);
      const overlaps = overlappingHistory.filter((record) => record.is_current === true);
      receivingScopes.push({ source, scope, electionId, overlaps });
    }
    if (!apply) {
      await client.query("ROLLBACK");
      return plan;
    }
    let inserted = 0, sourceChanges = 0;
    for (const a of plan.actions) {
      if (a.candidateId == null) {
        const added = await client.query(`INSERT INTO candidates(name,party,election_id,is_incumbent,data_source,source_status,normalized_name,ballot_status,source_file_sha256,source_synced_at,polling_support,polling_trend)
          VALUES($1,$2,$3,$4,'state_general_list','general_list_record',$5,'not_certified',$6,$7,NULL,NULL) RETURNING id`, [a.record.name, a.party, a.electionId, a.record.incumbent ?? null, normalizedCandidateName(a.record.name), a.versionSha, a.source.retrievedAt]);
        a.candidateId = added.rows[0].id;
        inserted++;
      }
      const previous = previousByAction.get(a) ?? [];
      if (previous.length === 1 && previous[0].source_file_sha256 === a.versionSha) {
        if (new Date(a.source.retrievedAt).getTime() > new Date(previous[0].source_synced_at).getTime()) {
          await client.query("UPDATE candidate_source_records SET source_synced_at=$2 WHERE id=$1", [previous[0].id, a.source.retrievedAt]);
          sourceChanges++;
        }
        continue;
      }
      await client.query("UPDATE candidate_source_records SET is_current=false WHERE candidate_id=$1 AND source_layer='general_candidate_list' AND source_url=$2 AND is_current=true", [a.candidateId, a.source.url]);
      const metadata = { electionId: a.electionId, state: a.record.state, office: a.record.office, district: a.record.district, electionDate: a.record.date, sourceId: a.source.id, sourceName: a.source.name, sourceKind: a.source.kind, documentSha256: a.source.sha256, publishedAt: a.source.publishedAt, partyRaw: a.record.partyRaw, partyValue: rowParty(a.record) ?? "", partyKey: partyKey(a.record.partyRaw), partyBasis: a.record.partyBasis ?? (/^\(Prefers /i.test(a.record.partyRaw) ? "preference" : /^\(Registered /i.test(a.record.partyRaw) ? "registration" : a.record.partyRaw.toLowerCase() === "by petition" ? "filing_method" : "source_label"), incumbent: a.record.incumbent ?? null, sourcePage: a.record.sourcePage ?? null, ticketText: a.record.ticketText ?? null, ballotName: a.record.ballotName ?? null, legalName: a.record.name, aliases: a.record.aliases ?? [], ballotAccessType: a.record.ballotAccessType ?? "not_specified", ballotCertificationPromoted: false };
      const sourceMetadata = { ...metadata, ...a.record.partyEvidence ? { partyEvidence: a.record.partyEvidence } : {}, ...a.record.identityEvidence ? { identityEvidence: a.record.identityEvidence } : {}, ...a.record.partyLabels ? { partyLabels: a.record.partyLabels } : {}, ...a.record.identityResolution ? { identityResolution: a.record.identityResolution, identityResolutionApplied: a.identityResolutionApplied === true } : {} };
      await client.query(`INSERT INTO candidate_source_records(candidate_id,source_layer,source_url,source_file_sha256,source_synced_at,metadata,is_current)
        VALUES($1,'general_candidate_list',$2,$3,$4,$5::jsonb,true) ON CONFLICT(candidate_id,source_layer,source_url,source_file_sha256)
        DO UPDATE SET is_current=true,source_synced_at=EXCLUDED.source_synced_at,metadata=EXCLUDED.metadata`, [a.candidateId, a.source.url, a.versionSha, a.source.retrievedAt, JSON.stringify(sourceMetadata)]);
      sourceChanges++;
    }
    for (const { source, scope, electionId, overlaps } of receivingScopes) {
      const actions = plan.actions.filter((a) => a.source.id === source.id && a.record.office === scope.office && a.record.district === scope.district && (!scope.partyRaw || partyKey(a.record.partyRaw) === partyKey(scope.partyRaw)) && (!scope.ballotAccessType || a.record.ballotAccessType === scope.ballotAccessType));
      const keep = actions.map((a) => a.candidateId);
      const versionSha = snapshotVersion(m, source);
      const scopeKey = [scope.office, scope.district, scope.partyRaw ? partyKey(scope.partyRaw) : "*", scope.ballotAccessType ?? "*"].join("|");
      const deactivated = await client.query(`UPDATE candidate_source_records s SET is_current=false FROM candidates c WHERE s.candidate_id=c.id AND c.election_id=$1 AND s.source_layer='general_candidate_list' AND s.is_current=true
        AND (NOT(c.id=ANY($2::int[])) OR s.source_url<>$4 OR s.source_file_sha256<>$5) AND ($3::text IS NULL OR s.metadata->>'partyKey'=$3)
        AND ($6::text IS NULL OR s.metadata->>'ballotAccessType'=$6)`, [electionId, keep, scope.partyRaw ? partyKey(scope.partyRaw) : null, source.url, versionSha, scope.ballotAccessType ?? null]);
      sourceChanges += deactivated.rowCount ?? 0;
      if (overlaps.length === 1 && overlaps[0].scope_key === scopeKey && overlaps[0].source_url === source.url && overlaps[0].source_file_sha256 === versionSha) {
        if (new Date(source.retrievedAt).getTime() > new Date(overlaps[0].source_synced_at).getTime()) await client.query("UPDATE general_candidate_list_snapshots SET source_synced_at=$2 WHERE id=$1", [overlaps[0].id, source.retrievedAt]);
        continue;
      }
      if (overlaps.length) await client.query("UPDATE general_candidate_list_snapshots SET is_current=false WHERE id=ANY($1::int[])", [overlaps.map((r) => r.id)]);
      await client.query(`INSERT INTO general_candidate_list_snapshots(election_id,scope_key,source_url,source_file_sha256,source_synced_at,metadata,is_current)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,true) ON CONFLICT(election_id,scope_key,source_url,source_file_sha256)
        DO UPDATE SET is_current=true,source_synced_at=EXCLUDED.source_synced_at,metadata=EXCLUDED.metadata`, [electionId, scopeKey, source.url, versionSha, source.retrievedAt, JSON.stringify({ sourceId: source.id, sourceName: source.name, sourceKind: source.kind, publishedAt: source.publishedAt, documentSha256: source.sha256, state: source.state, electionDate: source.electionDate, scope })]);
    }
    plan.candidateInserts = inserted;
    plan.sourceChanges = sourceChanges;
    const receipt = await client.query(`INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt)
      VALUES('general_candidate_list','urn:electiontracker:reviewed-general-list-manifest',$1,now(),$2::jsonb) RETURNING id`, [manifestSha2, JSON.stringify({ candidateInserts: inserted, sourceChanges, unresolved: plan.unresolved, sources: m.sources.map((s) => ({ id: s.id, url: s.url, publishedAt: s.publishedAt, completeScopes: s.completeScopes })) })]);
    plan.auditId = receipt.rows[0].id;
    await client.query("COMMIT");
    return plan;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
    });
    throw error;
  } finally {
    let cleanupError;
    if (sessionAdmission) {
      try {
        const released = await client.query("SELECT pg_advisory_unlock($1) AS released", [2026110301]);
        if (released.rows[0]?.released !== true) cleanupError = new Error("Guarded source admission lock cleanup failed");
      } catch {
        cleanupError = new Error("Guarded source admission connection failed during cleanup");
      }
    }
    client.release(Boolean(cleanupError));
    if (cleanupError) throw cleanupError;
  }
}
async function runNomineeRefresh(pool2, m, manifestSha2, apply, operation = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runNomineeRefreshOnce(pool2, m, manifestSha2, apply, operation);
    } catch (error) {
      if (attempt >= 2 || !["40001", "40P01"].includes(error.code ?? "")) throw error;
      await new Promise((resolve2) => setTimeout(resolve2, 50 * (attempt + 1)));
    }
  }
}

// scripts/source_data_rollback.ts
import { createHash as createHash2 } from "node:crypto";
import { resolve, relative } from "node:path";

// server/official-results-manifest.ts
import { z as z3 } from "zod";

// shared/official-results.ts
import { z as z2 } from "zod";
var resultsTimestamp = z2.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)), "A parseable timestamp with a valid timezone offset is required");
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
var httpsResultsUrl = z2.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}, "An HTTPS URL without credentials or a custom port is required");
var resultPhase = z2.enum(["general", "primary", "runoff", "other"]);
var resultDigest = z2.string().regex(/^[a-f0-9]{64}$/);
var publishedResultsReceiptSchema = z2.object({
  state: z2.string().regex(/^[A-Z]{2}$/),
  outcome: z2.literal("worked"),
  electionDate: z2.literal("2026-11-03"),
  electionPhase: resultPhase,
  destinationUrl: httpsResultsUrl,
  sourceUrl: httpsResultsUrl,
  contextVerified: z2.literal(true),
  resultsObserved: z2.literal(true),
  observedElectionLabel: z2.string().trim().min(5).max(1024),
  checkedAt: resultsTimestamp
}).strict();
var resultsPublicationEvidenceSchema = z2.object({
  state: z2.string().regex(/^[A-Z]{2}$/),
  electionDate: z2.literal("2026-11-03"),
  electionPhase: resultPhase,
  destinationUrl: httpsResultsUrl,
  officialElectionLabel: z2.string().trim().min(5).max(1024),
  officialContextVerified: z2.literal(true),
  officialContextReceiptSha256: resultDigest,
  receivingOutcome: z2.literal("worked"),
  receivingResultsObserved: z2.literal(true),
  receivingReceiptSha256: resultDigest,
  receivingCheckedAt: resultsTimestamp
}).strict();
var officialResultsSourceSchema = z2.object({
  targetElectionDate: z2.literal("2026-11-03"),
  electionPhase: resultPhase,
  routeType: z2.enum(officialResultsRouteTypes),
  publisher: z2.string().min(1).max(512),
  checkedAt: resultsTimestamp,
  routeVerification: z2.enum(["worked", "blocked"]),
  status: z2.enum(["not_linked", "unknown", "published"]),
  availabilityReason: z2.enum([
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
  documentSha256: z2.string().regex(/^[a-f0-9]{64}$/).nullable(),
  sourceReviewSha256: z2.string().regex(/^[a-f0-9]{64}$/),
  publicationEvidence: resultsPublicationEvidenceSchema.optional()
}).strict().superRefine((source, ctx) => {
  if (source.status === "not_linked" && (source.electionPhase !== "general" || source.availabilityReason !== "not_linked_in_checked_official_sources" || source.routeVerification !== "worked")) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "not_linked requires a checked general-election context" });
  }
  if (source.status === "published") {
    const proof = source.publicationEvidence;
    if (source.routeType !== "election_specific_results" || source.routeVerification !== "worked" || source.availabilityReason !== "published_for_target_election" || !proof || proof.electionDate !== source.targetElectionDate || proof.electionPhase !== source.electionPhase || proof.receivingCheckedAt !== source.checkedAt) {
      ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Published requires a verified exact-date/phase specific results receipt" });
    }
  } else if (source.routeType === "election_specific_results" || source.publicationEvidence || source.availabilityReason === "published_for_target_election") {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Specific publication evidence cannot be asserted on pending or unknown routes" });
  }
});
var officialResultsFieldsSchema = z2.object({
  officialResultsUrl: httpsResultsUrl.nullable().default(null),
  officialResultsSource: officialResultsSourceSchema.nullable().default(null)
}).superRefine((fields, ctx) => {
  if (fields.officialResultsUrl !== null && fields.officialResultsSource?.routeVerification !== "worked") {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "A destination requires verified source metadata" });
  }
  if (fields.officialResultsSource?.status === "published" && fields.officialResultsUrl !== fields.officialResultsSource.publicationEvidence?.destinationUrl) {
    ctx.addIssue({ code: z2.ZodIssueCode.custom, message: "Published destination must match the observed receiving receipt" });
  }
});

// server/official-results-manifest.ts
var RESULTS_DATE = "2026-11-03";
var RESULTS_STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ").sort();
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.entries(value).sort(([a], [b2]) => a < b2 ? -1 : a > b2 ? 1 : 0).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  }
  return JSON.stringify(value);
}
var hashSchema = z3.string().regex(/^[a-f0-9]{64}$/);
var entrySchema = z3.object({
  state: z3.enum(RESULTS_STATES),
  officialResultsUrl: httpsResultsUrl.nullable(),
  source: officialResultsSourceSchema
}).strict().superRefine((entry, ctx) => {
  if (entry.officialResultsUrl !== null !== (entry.source.routeVerification === "worked")) {
    ctx.addIssue({ code: z3.ZodIssueCode.custom, message: "Blocked routes must have a null destination" });
  }
});
var resultsManifestSchema = z3.object({
  version: z3.literal(1),
  targetElectionDate: z3.literal(RESULTS_DATE),
  reviews: z3.array(z3.object({ file: z3.string(), sha256: hashSchema }).strict()).min(1),
  states: z3.array(entrySchema).length(50)
}).strict().superRefine((manifest2, ctx) => {
  if (manifest2.states.map((s) => s.state).sort().join(" ") !== RESULTS_STATES.join(" ")) {
    ctx.addIssue({ code: z3.ZodIssueCode.custom, message: "Exactly the 50 unique reviewed states are required" });
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
  return createHash2("sha256").update(canonical(value)).digest("hex");
}
async function guard(client, expected, authorize2 = requirePrivateDatabase) {
  authorize2(expected);
  const actual = (await client.query("SELECT current_database() AS database,inet_server_port() AS port")).rows[0];
  authorize2(actual.database);
  const transport = client;
  if (actual.database !== expected || !["localhost", "127.0.0.1", "::1"].includes(transport.host) || transport.port !== 5432 || actual.port !== 5432) throw new SourceReleaseRefused("DATABASE_MISMATCH", "Connection is not the exact approved local target");
}
async function snapshot(client, database2, allowMissing = false, authorize2 = requirePrivateDatabase) {
  await guard(client, database2, authorize2);
  const tables = {};
  for (const table of DATA_TABLES) {
    const found = (await client.query("SELECT to_regclass($1) AS target", ["public." + table])).rows[0].target;
    if (!found) {
      if (!allowMissing) throw new SourceReleaseRefused("MISSING_SOURCE_SCHEMA", "Required source-only table is absent: " + table);
      tables[table] = [];
      continue;
    }
    tables[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM public.${table} t ORDER BY t.id`)).rows.map((r) => r.row);
  }
  return { version: 1, database: database2, tables, hash: sourceHash(tables) };
}
var PRIVATE_ROOT = resolve("C:/.codex/private/election-source-backups");

// scripts/probe_source_gap_guarded_sd.mjs
var database = "et_sol_data_6c78a3148c6b";
var dir = "artifacts/source-gap-private-sd";
var baseline = "1322b3367130f43557be09f22033d9481b087d66d54f2bb74ada567f16c88eb2";
var env = parse(readFileSync("D:/projects/New-election-countdown/.env"));
var u = new URL(env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) || u.port !== "5432") throw new Error("Approved local5432 required");
u.pathname = "/" + database;
u.searchParams.set("options", "-c timezone=UTC");
var pool = new pg.Pool({ connectionString: u.toString(), max: 4 });
var single = new pg.Pool({ connectionString: u.toString(), max: 1 });
var authorize = (name) => {
  if (name !== database) throw new Error("Exact private database required");
};
var capture = async () => {
  const c = await pool.connect();
  try {
    await guard(c, database, authorize);
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const s = await snapshot(c, database, false, authorize);
    await c.query("ROLLBACK");
    return s;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {
    });
    throw e;
  } finally {
    c.release();
  }
};
var b = readFileSync(dir + "/incremental-manifest.json");
var manifestSha = createHash3("sha256").update(b).digest("hex");
if (manifestSha !== "f83bee609922a2213213d26fdd956c248a69a14718936ff2f39a757c0821223a") throw new Error("Manifest byte pin changed");
var manifest = parseNomineeManifest(JSON.parse(b));
var result = { runtimeImporterHead: "72f7e8e6e5ac3fb93a7d31993c094565c1de1310", database, manifestSha, checks: [], nomineeApplicationWrites: 0 };
var check = (scenario, ok, details = {}) => result.checks.push({ scenario, outcome: ok ? "Worked" : "Failed", ...details });
async function forced(p, expected) {
  const seen = { callbackCalled: false };
  try {
    await runNomineeRefresh(p, manifest, manifestSha, true, { beforeApply: async (c) => {
      seen.callbackCalled = true;
      await c.query("LOCK TABLE " + DATA_TABLES.map((t) => "public." + t).join(",") + " IN SHARE ROW EXCLUSIVE MODE");
      await guard(c, database, authorize);
      const s = await snapshot(c, database, false, authorize);
      seen.snapshotHash = s.hash;
      if (s.hash !== expected) throw Object.assign(new Error("Preimage differs"), { code: "PREIMAGE_DRIFT" });
      throw Object.assign(new Error("Private injected callback refusal before all application writes"), { code: "INJECTED_CALLBACK_REFUSAL" });
    } });
    seen.code = "UNEXPECTED_COMMIT";
  } catch (e) {
    seen.code = e.code ?? null;
    seen.message = e.message;
  }
  return seen;
}
async function freshLock() {
  const c = new pg.Client({ connectionString: u.toString() });
  try {
    await c.connect();
    await guard(c, database, authorize);
    const pid = (await c.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    const admitted = (await c.query("SELECT pg_try_advisory_lock($1) AS admitted", [2026110301])).rows[0].admitted;
    let released = null;
    if (admitted) released = (await c.query("SELECT pg_advisory_unlock($1) AS released", [2026110301])).rows[0].released;
    return { pid, admitted, released };
  } finally {
    await c.end();
  }
}
async function markerRace(kind) {
  const c = await pool.connect();
  let marker, open = false, attempt;
  const seen = { kind };
  try {
    await guard(c, database, authorize);
    await c.query("BEGIN");
    open = true;
    if (kind === "advisory") await c.query("SELECT pg_advisory_xact_lock($1)", [2026110301]);
    marker = (await c.query("INSERT INTO candidate_ingest_runs(source_layer,source_url,source_file_sha256,applied_at,receipt) VALUES('private_gate_control','urn:private:sd-guarded-control',$1,now(),$2::jsonb) RETURNING id", ["e".repeat(64), JSON.stringify({ purpose: "PRIVATE LOCK/SNAPSHOT CONTROL - NOT OFFICIAL INGEST", kind })])).rows[0].id;
    attempt = forced(pool, baseline);
    if (kind === "advisory") {
      const started = performance.now();
      seen.attempt = await attempt;
      seen.durationMs = performance.now() - started;
      check("busy admission refuses before BEGIN/callback/writes", seen.attempt.callbackCalled === false && /writer is busy/.test(seen.attempt.message) && seen.durationMs < 1e3, seen);
    } else {
      seen.waitObserved = false;
      for (let i = 0; i < 100; i++) {
        const q = await c.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='relation' AND relation='public.candidate_ingest_runs'::regclass AND granted=false AND pid<>pg_backend_pid() AND database=(SELECT oid FROM pg_database WHERE datname=current_database())");
        if (q.rows[0].n) {
          seen.waitObserved = true;
          break;
        }
        await new Promise((resolve2) => setTimeout(resolve2, 20));
      }
      if (!seen.waitObserved) throw new Error("Actual source table wait not observed");
    }
    await c.query("COMMIT");
    open = false;
    seen.actualCommittedHash = (await capture()).hash;
    if (kind === "advisory") {
      seen.retry = await forced(pool, baseline);
      check("after marker commit fresh retry rejects actual committed drift", seen.retry.code === "PREIMAGE_DRIFT" && seen.retry.snapshotHash === seen.actualCommittedHash && seen.actualCommittedHash !== baseline, seen);
    } else {
      seen.attempt = await attempt;
      check("plain table writer commit visible after first table-lock query", seen.attempt.code === "PREIMAGE_DRIFT" && seen.attempt.snapshotHash === seen.actualCommittedHash && seen.actualCommittedHash !== baseline, seen);
    }
    const lock = await freshLock();
    check("fresh connection acquires admission after " + kind + " refusal", lock.admitted === true && lock.released === true, lock);
  } finally {
    if (open) await c.query("ROLLBACK");
    c.release();
    if (attempt) await attempt;
    if (marker) await pool.query("DELETE FROM candidate_ingest_runs WHERE id=$1 AND source_layer='private_gate_control' AND source_url='urn:private:sd-guarded-control'", [marker]);
    check("marker cleanup exact baseline after " + kind, (await capture()).hash === baseline);
  }
}
try {
  result.beforeHash = (await capture()).hash;
  if (result.beforeHash !== baseline) throw new Error("Baseline drift");
  const stale = await forced(pool, "0".repeat(64));
  check("wrong expected preimage refuses before source/audit writes", stale.code === "PREIMAGE_DRIFT" && (await capture()).hash === baseline, stale);
  await markerRace("advisory");
  await markerRace("table");
  for (let i = 0; i < 3; i++) {
    const refusal = await forced(single, baseline);
    check("same pool1 callback refusal " + i, refusal.code === "INJECTED_CALLBACK_REFUSAL" && (await capture()).hash === baseline, refusal);
    const lock = await freshLock();
    check("no reentrant admission depth after pool1 refusal " + i, lock.admitted && lock.released, lock);
  }
  result.afterHash = (await capture()).hash;
  check("all original source data/audit rows preserved", result.afterHash === baseline);
} catch (e) {
  check("guard probe execution", false, { code: e.code ?? null, message: e.message });
} finally {
  result.outcome = result.checks.every((c) => c.outcome === "Worked") ? "Worked" : "Failed";
  writeFileSync(dir + "/guarded-lock-green.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  await single.end();
  await pool.end();
  if (result.outcome !== "Worked") process.exitCode = 1;
}
