# Verified comparison service receiving contract

Base origin/main `583057c4f928b870c7a27db7b3f1feb5ab2a22dd`. C owns `server/verified-policy-comparison.ts`; A wires the actual route, B renders the DTO. No routes, shared data or provider integrations changed here.

Export `compareVerifiedCandidatePolicies(candidateIds:unknown,policyCategories:unknown)` returns:

```ts
{ category: string, positions: Array<{
  candidateId: string; candidateName: string;
  position: string; details: string;
  source: string | null; confidence: null;
  sourcePositionId: number | null;
  sourceUrl: string | null;
  recordedDate: string | null; // actual recorded ISO instant or null
}> }[]
```

IDs are actual database profile IDs, not FEC/BioGuide identifiers:1–20 positive int32 values. Categories:1–20 nonempty strings up to100 characters, exact case-equivalent matching. No keyword policy inference. Bound names are actual stored candidate rows; verified statements come from the existing `CandidatePositionAPI`, which rejects foreign/unverified subjects and malformed source metadata. Missing candidate404, malformed scope400, invalid source422, DB/source unavailable503 via `VerifiedPolicyComparisonError.status/code`. Empty categories contain `positions:[]`, never a placeholder position, source bonus or estimated confidence. Details copy the actual source description. Date and URL remain null when absent. Provider enrichment/inference is never called.

29 focused unit controls use **unit-only controlled storage rows**; they do not claim actual candidate-uploaded records. Actual compiled receiving uses the approved source database in enforced read-only mode:0 verified statements existed,0 statements returned; two real candidate identities read successfully, fractional ID refused400, missing subject refused404, full candidates/positions hashes unchanged. No statement was inserted to manufacture a positive example. Private real-record coverage can be retaken when an actual verified statement exists.

Rebuild/run the actual source service:

```powershell
npx esbuild tests/verified-policy-comparison-entry.ts --bundle --platform=node --format=esm --packages=external --alias:@shared=./shared --outfile=artifacts/verified-policy-comparison/compiled-service.mjs
$env:ELECTION_ENV_FILE='D:/projects/New-election-countdown/.env'
node scripts/verify_verified_policy_comparison.mjs
```

The first read-only harness query refused a `LIMIT2` SQL typo before any mutation; corrected `LIMIT 2` retested Worked. Provider calls, DB writes and new server launches:0.

Read-only candidate qualification review at D5094: CA72 returned6 profiles versus2 recorded official-list members with scoped printed-list coverage. IDs755/256/754/758 were outside the recorded roster and FEC-registered; no excluded/disqualified inference is justified. LA429 returned2 FEC registration profiles and general roster not_applicable. Both individual profile endpoints dropped source/FEC/ballot markers, while ordinary race rows had nested source markers ignored by the existing flat provenance formatter. Raw HTTP bodies/SHA/status retained in `C:/Users/techai/.codex/tmp/sol-qualification-review-910a/`, without source/app edits. A owns DTO preservation; B owns separate profile/list counts and badges.
