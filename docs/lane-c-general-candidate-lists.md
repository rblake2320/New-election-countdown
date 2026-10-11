# Official general-election candidate lists (ET-9)

The refresh stores official general-election list membership separately from FEC registration, profiles and ballot certification. `/api/elections/:id/general-candidates` returns only current membership with its official source, raw party text, source date, checked date and printed/write-in classification. Existing candidate biography, contact, FEC and ballot fields are preserved. Unknown affiliation and incumbency remain unknown.

## Reviewed source coverage

`data/nominees/combined-2026-reviewed.json` contains 259 factual rows from 11 documents in nine states: NC, ND, NE, NH, NV, OK, TX, UT and WA. These bind to 91 existing general-election races. The manifests deliberately do not claim complete national coverage or certification. NC's official listing is nonfinal. NH's document was read but its byte download was blocked; its document digest is explicitly null. TX and UT printed and write-in lists have separate complete scopes. WA party preferences and filing-method text are retained in provenance.

Each source declares its extracted row count and any complete office/district/party/access scopes. A refresh refuses malformed, overlapping, duplicate or unresolved input. Sources must be HTTPS government URLs, with one explicit exception for NC's government-linked election bucket. Only reviewed aliases printed in the source may match a differently named existing record.

An explicitly complete scope may supersede old list membership. It does not delete candidate profiles, infer withdrawal, promote certification or overwrite another evidence layer. Both candidate writers share an advisory transaction lock. Application and its audit receipt commit together in a serializable transaction; failures roll back the entire refresh.

## Operation

Apply `migrations/20261011_candidate_source_records.sql` before a write. Set `ELECTION_ENV_FILE` to the intended private configuration file; connection values must never be printed or committed.

```powershell
npx tsx scripts/verify_nominee_manifests.ts
npx tsx scripts/refresh_general_candidates.ts data/nominees/combined-2026-reviewed.json --dry-run
```

The default mode enforces a read-only database session and transaction. Review the manifest digest, source classifications, counts and every unresolved identity before applying the exact same file:

```powershell
npx tsx scripts/refresh_general_candidates.ts data/nominees/combined-2026-reviewed.json --apply --expect-sha256=<reviewed-manifest-sha256>
```

The CLI writes a unique local outcome receipt. A committed database audit remains authoritative if writing that file fails. Shared database application remains held for the data owner's reviewed integration sequence.

## Acceptance evidence

`python scripts/verify_nominee_refresh.py` creates and destroys a dedicated disposable PostgreSQL instance. It reads the approved local ElectionTracker source through a database-enforced read-only connection, copies only the allowed public election/candidate fields, and runs the actual importer and Express handler.

The retained receipt at `artifacts/lane-c/nominees-private-postgres.json` records 259 current memberships, 244 inserted identities, 15 reused identities and 93 HTTP checks across all 91 receiving races plus invalid/missing IDs. Repeat application changes zero candidates and zero source versions. An injected write failure restores candidate rows, source versions and audit receipts. Original profile/FEC/ballot fields and the shared table's 136 rows retain their before/after digest.

Running the same acceptance under `TZ=Asia/Tokyo` exposed a PostgreSQL timestamp parsing issue. Reading calendar dates as SQL text fixed it; the targeted rerun worked. Unit tests also cover source classification, count conservation, overlapping scopes and identity/party conflict refusal.

`artifacts/lane-c/real-roster-payloads/` retains actual private PostgreSQL/Express HTTP responses for TX Senate, NE Governor, WA House 01 and NV House 03, with the reviewed manifest digest. They support an offline test of the real React card at its data-hook boundary. The saved browser setting blocked the local preview, so these artifacts are HTTP/component evidence rather than a fresh browser visual review.
