import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getJson } from "@/lib/queryClient";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { ChevronLeft, Save, AlertTriangle, Shield } from "lucide-react";
import { Link } from "wouter";
import {
  liveResultAsOfBases,
  liveResultReportInputSchema,
  liveResultReportingBases,
  liveResultSourceKinds,
  type LiveElectionResultsResponse,
} from "@shared/live-election-results";
import { useLiveElectionResults } from "@/lib/live-results";
import { LiveResultView } from "@/components/live-result-view";

// ET-6 v1.2 admin posting (POST /api/elections/:id/results). The form records what
// an official source published: no computed percentages, no projections, and a
// winner only with the official declaration. It loads the latest recorded report
// (or the race's candidates when none exists) and never overwrites a newer one.

interface Election { id: number; title: string; location: string; state: string; date: string; type: string; level: string }
interface Candidate { id: number; name: string; party: string | null }

interface Line { candidateId: number | null; sourceCandidateId: string; name: string; party: string; votes: string; percent: string; isWinner: boolean }
interface Draft {
  electionId: number;
  baseRevision: string | null;
  status: "unofficial" | "certified";
  sourceId: string; sourceKind: string; sourceName: string; sourceUrl: string; sourceContestId: string;
  payloadSha256: string; payloadName: string;
  asOf: string; asOfBasis: string; retrievedAt: string;
  reportingPercent: string; reportingBasis: string; precinctsReporting: string; precinctsTotal: string;
  totalVotes: string;
  lines: Line[];
  winnerSource: string; winnerUrl: string; winnerAt: string;
  certificationUrl: string; certifiedAt: string;
  supersedesReportId: string;
  note: string;
  idempotencyKey: string;
}

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** A draft that starts from the latest recorded report, or from the race's candidates. */
export function draftFromServer(electionId: number, current: LiveElectionResultsResponse | undefined, candidates: Candidate[]): Draft {
  const r = current && current.status !== "none" ? current : null;
  return {
    electionId,
    baseRevision: current?.revision ?? null,
    status: r?.status === "certified" ? "certified" : "unofficial",
    sourceId: r?.source?.id ?? "", sourceKind: r?.source?.kind ?? "admin_manual", sourceName: r?.source?.name ?? "",
    sourceUrl: r?.source?.url ?? "", sourceContestId: r?.source?.sourceContestId ?? "",
    // A new report needs its own source snapshot; the previous hash is not reused.
    payloadSha256: "", payloadName: "",
    asOf: "", asOfBasis: "not_provided", retrievedAt: "",
    reportingPercent: str(r?.reporting?.percent), reportingBasis: r?.reporting?.basis ?? "source_unspecified",
    precinctsReporting: str(r?.reporting?.precinctsReporting), precinctsTotal: str(r?.reporting?.precinctsTotal),
    totalVotes: str(r?.totalVotes),
    lines: r
      ? r.candidates.map(c => ({ candidateId: c.candidateId, sourceCandidateId: c.sourceCandidateId, name: c.name, party: c.party ?? "", votes: String(c.votes), percent: str(c.percent), isWinner: c.isWinner }))
      : candidates.map(c => ({ candidateId: c.id, sourceCandidateId: "", name: c.name, party: c.party ?? "", votes: "", percent: "", isWinner: false })),
    winnerSource: r?.winnerCalledBy?.source ?? "", winnerUrl: r?.winnerCalledBy?.url ?? "", winnerAt: toLocalInput(r?.winnerCalledBy?.at ?? null),
    certificationUrl: r?.certification?.url ?? "", certifiedAt: toLocalInput(r?.certification?.certifiedAt ?? null),
    supersedesReportId: "",
    note: "",
    idempotencyKey: newKey(),
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** The POST body exactly as the contract defines it (validated before sending). */
export function draftToInput(d: Draft) {
  const winners = d.lines.some(l => l.isWinner);
  return {
    schemaVersion: 1 as const,
    electionId: d.electionId,
    status: d.status,
    reporting: { percent: num(d.reportingPercent), basis: d.reportingBasis, precinctsReporting: num(d.precinctsReporting), precinctsTotal: num(d.precinctsTotal) },
    source: { id: d.sourceId.trim(), kind: d.sourceKind, name: d.sourceName.trim(), url: d.sourceUrl.trim(), sourceContestId: d.sourceContestId.trim() },
    sourcePayloadSha256: d.payloadSha256 || null,
    asOf: fromLocalInput(d.asOf),
    asOfBasis: d.asOf ? d.asOfBasis : "not_provided",
    retrievedAt: d.retrievedAt || null,
    totalVotes: num(d.totalVotes),
    candidates: d.lines.map(l => ({ candidateId: l.candidateId, sourceCandidateId: l.sourceCandidateId.trim(), name: l.name.trim(), party: l.party.trim() || null, votes: l.votes.trim() === "" ? NaN : Number(l.votes), percent: num(l.percent), isWinner: l.isWinner })),
    winnerCalledBy: winners || d.winnerSource || d.winnerUrl ? { source: d.winnerSource.trim(), url: d.winnerUrl.trim(), at: fromLocalInput(d.winnerAt) } : null,
    certification: d.status === "certified" ? { url: d.certificationUrl.trim(), certifiedAt: fromLocalInput(d.certifiedAt) } : null,
    supersedesReportId: num(d.supersedesReportId),
    expectedRevision: d.baseRevision,
    idempotencyKey: d.idempotencyKey,
    note: d.note.trim() || null,
  };
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const POST_ERRORS: Record<string, string> = {
  stale_revision: "Someone recorded a newer report for this race since you loaded it. Reload the latest report before posting.",
  idempotency_conflict: "This submission key was already used for different values. Reload and post again.",
  older_than_latest: "These counts are older than the latest report from the same source. Name the report you are correcting to post an official correction.",
  invalid_report: "The server refused the report:",
};

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export default function AdminResultsEntry() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user || undefined);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  // Hooks run on every render; the access check below only changes what renders.
  const { data: elections = [], isLoading: electionsLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    enabled: isAdmin,
    select: data => {
      const now = Date.now(), week = 7 * 24 * 60 * 60 * 1000;
      return data.filter(e => Math.abs(new Date(e.date).getTime() - now) <= week)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
  });
  const { data: candidates, isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/elections", selectedElectionId, "candidates"],
    queryFn: ({ signal }) => getJson<Candidate[]>(`/api/elections/${selectedElectionId}/candidates`, signal),
    enabled: isAdmin && !!selectedElectionId,
  });
  const current = useLiveElectionResults(isAdmin && selectedElectionId ? selectedElectionId : 0, false);
  const currentResult = current.data?.data;

  // Load the race's latest report into the form once both reads have arrived, and
  // whenever the race changes. Unsaved edits are never replaced by a refetch.
  useEffect(() => {
    if (!selectedElectionId || !candidates || !currentResult || currentResult.electionId !== selectedElectionId) return;
    if (draft && draft.electionId === selectedElectionId && (dirty || draft.baseRevision === currentResult.revision)) return;
    setDraft(draftFromServer(selectedElectionId, currentResult, candidates));
    setDirty(false);
    setIssues([]);
  }, [selectedElectionId, candidates, currentResult, dirty, draft]);

  const newerOnServer = !!(draft && dirty && currentResult && currentResult.electionId === draft.electionId && currentResult.revision !== draft.baseRevision);
  const lineTotal = useMemo(() => draft?.lines.reduce((s, l) => s + (Number(l.votes) || 0), 0) ?? 0, [draft]);

  const edit = (patch: Partial<Draft>) => { setDraft(d => (d ? { ...d, ...patch } : d)); setDirty(true); };
  const editLine = (i: number, patch: Partial<Line>) => {
    setDraft(d => (d ? { ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : d));
    setDirty(true);
  };
  const openRace = (id: number | null) => { setSelectedElectionId(id); setDraft(null); setDirty(false); setIssues([]); };
  const switchTo = (id: number) => {
    if (dirty && draft && id !== draft.electionId) { setPendingSwitch(id); return; }
    openRace(id);
  };
  const reloadLatest = async () => {
    setDirty(false); setDraft(null); setIssues([]);
    await current.refetch();
  };

  const submit = async () => {
    if (!draft) return;
    let parsed: ReturnType<typeof liveResultReportInputSchema.safeParse>;
    try {
      parsed = liveResultReportInputSchema.safeParse(draftToInput(draft));
    } catch {
      // The shared URL check throws on text that is not a URL at all.
      setIssues(["Every URL field (source, winner declaration, certification) must be a full https:// address."]);
      return;
    }
    if (!parsed.success) {
      setIssues(parsed.error.issues.map(i => `${i.path.join(".") || "report"}: ${i.message}`));
      return;
    }
    setIssues([]);
    setPosting(true);
    try {
      const res = await fetch(`/api/elections/${draft.electionId}/results`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await res.json().catch(() => null) as { code?: string; error?: string; details?: { path: string; message: string }[] } | null;
      if (res.status === 201 || res.status === 200) {
        toast({ title: res.status === 201 ? "Report recorded" : "Already recorded", description: "The public results now show this report." });
        setDirty(false); setDraft(null);
        qc.invalidateQueries({ queryKey: ["/api/results"] });
        await current.refetch();
        return;
      }
      const code = payload?.code ?? "";
      setIssues(code === "invalid_report" && payload?.details?.length
        ? [POST_ERRORS.invalid_report, ...payload.details.map(d => `${d.path}: ${d.message}`)]
        : [POST_ERRORS[code] ?? `The report was not recorded (${res.status}${payload?.error ? `: ${payload.error}` : ""}).`]);
    } catch {
      setIssues(["The report was not recorded: the server could not be reached."]);
    } finally {
      setPosting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Administrative privileges required</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Recording election results is restricted to administrators.</AlertDescription>
            </Alert>
            <Button variant="outline" asChild className="mt-6">
              <Link href="/"><ChevronLeft className="w-4 h-4 mr-2" />Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Record Official Results</h1>
          <p className="text-muted-foreground mt-1">Enter counts exactly as an official source published them. Nothing here is estimated or projected.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/"><ChevronLeft className="w-4 h-4 mr-2" />Back to Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Race</CardTitle>
          <CardDescription>Elections from 7 days ago to 7 days ahead</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={v => switchTo(Number(v))} value={selectedElectionId?.toString()} disabled={electionsLoading}>
            <SelectTrigger aria-label="Race" data-testid="select-election"><SelectValue placeholder={electionsLoading ? "Loading races..." : "Choose a race..."} /></SelectTrigger>
            <SelectContent>
              {elections.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.title} ({e.state})</SelectItem>)}
            </SelectContent>
          </Select>
          {!electionsLoading && elections.length === 0 && <p className="text-sm text-muted-foreground">No elections from 7 days ago to 7 days ahead.</p>}
          {pendingSwitch !== null && (
            <Alert role="alert">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                You have unsaved changes for this race.
                <Button size="sm" variant="destructive" onClick={() => { const id = pendingSwitch; setPendingSwitch(null); openRace(id); }}>Discard and switch</Button>
                <Button size="sm" variant="outline" onClick={() => setPendingSwitch(null)}>Keep editing</Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedElectionId && !current.error && (current.isLoading || candidatesLoading) && <p className="text-muted-foreground">Loading the latest recorded report...</p>}
      {selectedElectionId && current.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {current.error.message} The form stays closed so nothing is posted over an unknown report.
            <Button size="sm" variant="outline" onClick={() => current.refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}

      {draft && currentResult && draft.electionId === selectedElectionId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Currently published</CardTitle>
              <CardDescription>{currentResult.revision ? `Revision ${currentResult.revision}` : "No report recorded yet"}</CardDescription>
            </CardHeader>
            <CardContent><LiveResultView result={currentResult} /></CardContent>
          </Card>

          {newerOnServer && (
            <Alert role="alert">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                A newer report ({currentResult.revision ?? "none"}) was recorded after you started editing. Your changes are kept, but posting is blocked until you reload.
                <Button size="sm" variant="outline" onClick={reloadLatest}>Reload latest (discards your changes)</Button>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>New report</CardTitle>
              <CardDescription>Fields left blank are posted as "not stated by the source".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 font-semibold">Source</legend>
                <div><Label htmlFor="src-id">Registered source ID</Label><Input id="src-id" value={draft.sourceId} onChange={e => edit({ sourceId: e.target.value })} /></div>
                <div>
                  <Label htmlFor="src-kind">Source type</Label>
                  <select id="src-kind" className={selectClass} value={draft.sourceKind} onChange={e => edit({ sourceKind: e.target.value })}>
                    {liveResultSourceKinds.map(k => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="src-name">Source name</Label><Input id="src-name" value={draft.sourceName} onChange={e => edit({ sourceName: e.target.value })} /></div>
                <div><Label htmlFor="src-url">Official results URL (https)</Label><Input id="src-url" type="url" value={draft.sourceUrl} onChange={e => edit({ sourceUrl: e.target.value })} /></div>
                <div><Label htmlFor="src-contest">Source contest ID</Label><Input id="src-contest" value={draft.sourceContestId} onChange={e => edit({ sourceContestId: e.target.value })} /></div>
                <div>
                  <Label htmlFor="src-file">Official results file or page snapshot</Label>
                  <Input id="src-file" type="file" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    edit({ payloadSha256: await sha256Hex(f), payloadName: f.name, retrievedAt: new Date().toISOString() });
                  }} />
                  {draft.payloadSha256 && <p className="mt-1 break-all text-xs text-muted-foreground">{draft.payloadName}: SHA-256 {draft.payloadSha256}</p>}
                </div>
                <div><Label htmlFor="as-of">Time the source gives for these counts</Label><Input id="as-of" type="datetime-local" value={draft.asOf} onChange={e => edit({ asOf: e.target.value, asOfBasis: e.target.value ? (draft.asOfBasis === "not_provided" ? "source_timestamp" : draft.asOfBasis) : "not_provided" })} /></div>
                <div>
                  <Label htmlFor="as-of-basis">What that time is</Label>
                  <select id="as-of-basis" className={selectClass} value={draft.asOf ? draft.asOfBasis : "not_provided"} disabled={!draft.asOf} onChange={e => edit({ asOfBasis: e.target.value })}>
                    {liveResultAsOfBases.filter(b => (draft.asOf ? b !== "not_provided" : b === "not_provided")).map(b => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-4">
                <legend className="mb-2 font-semibold">Reporting</legend>
                <div><Label htmlFor="rep-pct">Percent reporting</Label><Input id="rep-pct" inputMode="decimal" value={draft.reportingPercent} onChange={e => edit({ reportingPercent: e.target.value })} /></div>
                <div>
                  <Label htmlFor="rep-basis">Measured by</Label>
                  <select id="rep-basis" className={selectClass} value={draft.reportingBasis} onChange={e => edit({ reportingBasis: e.target.value })}>
                    {liveResultReportingBases.map(b => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="rep-in">Precincts reporting</Label><Input id="rep-in" inputMode="numeric" value={draft.precinctsReporting} onChange={e => edit({ precinctsReporting: e.target.value })} /></div>
                <div><Label htmlFor="rep-total">Precincts total</Label><Input id="rep-total" inputMode="numeric" value={draft.precinctsTotal} onChange={e => edit({ precinctsTotal: e.target.value })} /></div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-2 font-semibold">Ballot options</legend>
                {draft.lines.length === 0 && <p className="text-sm text-muted-foreground">This race has no candidates recorded yet.</p>}
                {draft.lines.map((l, i) => (
                  <div key={i} className="grid gap-3 rounded-md border p-3 sm:grid-cols-6" data-testid={`line-${i}`}>
                    <div className="sm:col-span-2"><Label htmlFor={`name-${i}`}>Name as published</Label><Input id={`name-${i}`} value={l.name} onChange={e => editLine(i, { name: e.target.value })} /></div>
                    <div><Label htmlFor={`sid-${i}`}>Source option ID</Label><Input id={`sid-${i}`} value={l.sourceCandidateId} onChange={e => editLine(i, { sourceCandidateId: e.target.value })} /></div>
                    <div><Label htmlFor={`votes-${i}`}>Votes</Label><Input id={`votes-${i}`} inputMode="numeric" value={l.votes} onChange={e => editLine(i, { votes: e.target.value })} /></div>
                    <div><Label htmlFor={`pct-${i}`}>Percent (as published)</Label><Input id={`pct-${i}`} inputMode="decimal" value={l.percent} onChange={e => editLine(i, { percent: e.target.value })} /></div>
                    <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={l.isWinner} onChange={e => editLine(i, { isWinner: e.target.checked })} />Officially declared winner</label>
                  </div>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="total">Total votes (as published)</Label><Input id="total" inputMode="numeric" value={draft.totalVotes} onChange={e => edit({ totalVotes: e.target.value })} /></div>
                  <p className="self-end text-sm text-muted-foreground">Sum of the lines above: {lineTotal.toLocaleString()} (for checking; not posted)</p>
                </div>
              </fieldset>

              {draft.lines.some(l => l.isWinner) && (
                <fieldset className="grid gap-4 sm:grid-cols-3">
                  <legend className="mb-2 font-semibold">Official winner declaration</legend>
                  <div><Label htmlFor="win-src">Declared by</Label><Input id="win-src" value={draft.winnerSource} onChange={e => edit({ winnerSource: e.target.value })} /></div>
                  <div><Label htmlFor="win-url">Declaration URL (https)</Label><Input id="win-url" type="url" value={draft.winnerUrl} onChange={e => edit({ winnerUrl: e.target.value })} /></div>
                  <div><Label htmlFor="win-at">Declared at</Label><Input id="win-at" type="datetime-local" value={draft.winnerAt} onChange={e => edit({ winnerAt: e.target.value })} /></div>
                </fieldset>
              )}

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-2 font-semibold">Status</legend>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select id="status" className={selectClass} value={draft.status} onChange={e => edit({ status: e.target.value as Draft["status"] })}>
                    <option value="unofficial">Unofficial</option>
                    <option value="certified">Certified</option>
                  </select>
                </div>
                {draft.status === "certified" && (
                  <>
                    <div><Label htmlFor="cert-url">Certification document URL (https)</Label><Input id="cert-url" type="url" value={draft.certificationUrl} onChange={e => edit({ certificationUrl: e.target.value })} /></div>
                    <div><Label htmlFor="cert-at">Certified at</Label><Input id="cert-at" type="datetime-local" value={draft.certifiedAt} onChange={e => edit({ certifiedAt: e.target.value })} /></div>
                  </>
                )}
                <div><Label htmlFor="supersedes">Correcting report # (official corrections only)</Label><Input id="supersedes" inputMode="numeric" value={draft.supersedesReportId} onChange={e => edit({ supersedesReportId: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label htmlFor="note">Note</Label><Input id="note" value={draft.note} onChange={e => edit({ note: e.target.value })} /></div>
              </fieldset>

              {issues.length > 0 && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>
                    <p className="font-medium">The report was not posted.</p>
                    <ul className="mt-1 list-disc pl-5">{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={submit} disabled={posting || newerOnServer} data-testid="button-post-report">
                  <Save className="w-4 h-4 mr-2" />{posting ? "Posting..." : "Post report"}
                </Button>
                {dirty && <Button variant="outline" onClick={reloadLatest} disabled={posting}>Discard changes</Button>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
