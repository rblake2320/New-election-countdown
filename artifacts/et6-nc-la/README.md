# NC/LA real-source parser acceptance

Base main: `8c0f45af0490e0b0a341bce2b97c8878d420bb71`. Common parser contract adopted from root `a040d47a45c00dec1b2508473e00f38a49f9a1c7`. Physical `npm ci`, no dependency junction. Frozen source research commit `1a76a1f0d4f37db2b8e737eebf3912e6e39ee899`; eight original response bodies are byte-pinned in `tests/fixtures/official-result-adapters/manifest.json`.

Worked: 43 focused parser tests; final full unit/component suite 850/850; app build; strict standalone typecheck of both parsers/common contract; actual compiled Node CLI reproduces independently counted NC March3 DEM827755 and LA June27 DEM196212/REP316593 and NC March3 House01REP67376. The CLI also executes five typed refusal controls and verifies all ten pinned raw/derived source files. Full project typecheck still returns186 existing diagnostics, with zero in the adapter directory; this packet does not clear that release gate.

Rebuild and execute the actual offline parser verifier:

```powershell
npx esbuild tests/official-result-adapters/parse-cli.ts --bundle --platform=node --format=esm --outfile=artifacts/et6-nc-la/parse-cli.mjs
node artifacts/et6-nc-la/parse-cli.mjs
npx vitest run tests/official-result-adapters/nc-la.test.ts
```

NC consumes exact original ENR results plus statewide county header. Admission requires raw SHA, dated HTTPS source URLs, actual header date/phase, group/localIDs, canonical office/district/party and consistent counts. Both Senate parties share group2147, while DEMlocal2147 and REPlocal2149 distinguish them. Candidate publisher IDs are absent; printed names remain raw labels and IDs remain null. Statewide reporting percentage is used only when the source precinct scope matches the selected contest; candidate shares are source fractions converted to percent, never reporting metrics.

LA consumes exact roster and vote blobs. Admission requires both SHAs, dated anonymous government URLs, unique race/choiceIDs, canonical title/office flags, actual raw party and the reviewed2026 calendar. May16/June27 closed Senate primary stages and Nov3 Senategeneral/Houseopenprimary remain distinct. The1900 timestamp and valid unzoned timestamps yield null/not_provided, with literal clock retained; malformed declared timestamps are typed refusals. Roster WriteTime is never vote asOf. Option sum196212 and publisher voter count202767 remain separate.

All-zero placeholders, wrong dates/roles/parties/phases, duplicate options, broken counts/hashes and NC noisy precinct-sort data are refused. No winner/certification is inferred, no network/DB/provider calls occur, and no rows are posted. Adversarial tests mutate private fixture copies only; no generated data is exposed to product paths.

Root owns immutable URLâ†”SHAâ†”context admission, capture-time/future-stage checks, reviewed candidate binding, polling/CLI and source-provenance wrappers. LA bodies do not embed their election date; their dated admitted URLs must remain bound to the exact body hashes and calendar proof. An arbitrary caller must not re-admit the same source body under a different URL/date. A owns the writer; D owns packaged PostgreSQL receiving/load. This branch changes only pure parsers, tests, pinned recordings and their acceptance evidence.

House01 acceptance independently aggregates1,735 rows of the official original ElectionResults ZIP into125 county-choice rows across25counties. All five candidate totals and sum67,376 match separate ENR JSON. The first extraction attempt refused an incorrect expected-count6 assumption before writing evidence; actualsource5 was diagnosed and guarded by both independent-source agreement and countyCSV regression. RawZIP/entry hashes, real source rows and fetch context are retained in NC-House01-independent-proof.json.
