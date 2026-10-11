# Official candidate-list source expansion

ET-4 / ET-9, Sol EC, 2026-10-11. Isolated branch `lane-c/source-coverage`, based on reviewed PR8 `dcf12af` / implementation `838b2e2`.

The reviewed manifest contains 1,360 actual official-source records from scoped lists in all 50 states. These are documented ballot-list observations, not a national-complete or certification claim. Each document declares the state, election date, expected rows and any complete office/district/party/access scopes. Missing scopes remain unrecorded. The API distinguishes complete, scoped and unspecified coverage, including sourced empty scopes.

Receiving data semantics now retain party preference, party registration and filing method separately. Florida WRI is a filing method and supplies no invented affiliation. Connecticut/New York fusion lines remain one identity with separate literal party labels. Wyoming's CSV codes have a name/office/district-bound companion-PDF party receipt. Massachusetts secondary primary results establish name identity only; general-list eligibility comes from its separate general source. Neither primary identity nor FEC registration establishes general nomination.

Delegated publisher admission is limited to reviewed government-linked providers and exact paths. Montana admits only Missoula County's reviewed `01-BONN92.pdf` public-library item, linked by the county government election page. It covers Senate and House01 printed candidates. A separately verified Montana SOS certification hosted by Cascade County supplies all four House02 printed candidates; no named write-in coverage is inferred. Ohio's reviewed county documents cover all 15 House printed scopes and separately documented named write-in scopes; a generic blank write-in line supplies no identity.

## Worked

- Actual disposable PostgreSQL and Express: 1,360 source records, 467 receiving races, 469 HTTP contracts; first inserts1,280, repeat0 candidate/source changes. Original136 profiles/FEC/ballot fields and shared digest stayed unchanged. Injected transaction failure rolled back candidate, source, snapshot and audit writes. Stale publication/observation and historical-scope refusals passed. Receipt `artifacts/lane-c/nominees-private-postgres.json`, manifest SHA `aa20f8731ac6ef8d9fd5e63de1398997dcaaeaeedb116531df4530dfb7eb1075`. The earlier1,356-row receipt is retained as `nominees-private-1356-be85c90.json`.
- Fresh receiving bodies match the previously reviewed seven-state public facts after normalizing only private-fixture-generated IDs. Original captures are retained; new captures live under a manifest-hash directory.
- Independent actual React receiving checks at B `0b5c63e8873a061b976bf3cbcd549930edf79e47`:20/20,0fail/0skip. Seven byte-pinned real PG/HTTP payloads cover preference, registration, WRI, fusion, Wyoming party evidence and Massachusetts name identity. Only the data hook is mocked; network fetch0/browser0. Prior17/1 red and repaired outcome are retained under `artifacts/lane-c/review-b-source-coverage`.
- Full source branch suite189 pass/3skip; build passed. The first all-suite command failed to load two copied review-source files because Vitest discovered their `.test.tsx` artifact names. Renaming the unchanged evidence copies to `.test.tsx.txt` restored the normal189/3 suite. The original load-error report is retained; no implementation assertion failed in that run.
- Fresh full typecheck1114 diagnostics on the C-only branch, unchanged from its base. The separate frozen integrated2afc7c4 checkpoint has963; those numbers describe different compositions.
- Native Excel registry own row67/Teams17 saved and reopened; ET-4/ET-9 current descriptions and dated milestone comments were read back.

## Remaining work and hold

PR8's separate FEC-first blocker is reproduced against actual PR7 data:136 to2,600 candidates, followed by four party-conflict identities (Marvin, Khan, Hooslyn, Burt). The editorial-base acceptance above does not clear that order. A separate isolated investigation is preparing narrow source-backed identity resolutions; opposing party identities must remain quarantined and existing profiles must remain unchanged.

Uncovered districts, write-in scopes and Governor roles remain in curation receipts, including Minnesota's blocked export, Kentucky H03, Massachusetts's third full-name Governor ticket and the South Carolina H02/03/04/05 scopes. Louisiana House's office-specific November primary correction is separately reviewed on the catalog branch. Official-results URL schema/seed remains ET-11 implementation work.

Shared database application stays held by the owner. ET-22 under ET-5 owns the engineering security queue: Fabel server remediation and Astra deployment/backup/dependency gates. No C security patch is assigned. Green component checks do not clear the full type and release gates. This record makes no assurance certification or production readiness claim.
