# Shared batch-errors + B83 independent review

Exact clienthead3fe4f71e3b98eb01eb77fd08c9487463182e524e, containing sharedschema a28d49024c7b08c9f7c23ccf55510b07bd439cb2. Isolated detached checkout; no B/C source edits.

Worked7/7: existing5 mixed/UI/lookup cases plus independent schema and cache/reset acceptance. A failed race renders its source error and never no-results/absent; healthy candidate snapshot remains visible; all-error batches display individual errors; duplicate result/error IDs reject whole invalid payload. Additional actual schema tests refuse duplicate errorIDs, wrong election-context date, and combined>2000 outcomes. Actual TanStack hook with intercepted HTTP retains mixed result/error cache on304 with If-None-Match, removes prior errors on fresh reset recovery, and clears old rows on empty reset snapshot. Initial independent assertion ran before React notification flush; corrected test waits for observed render, without changing application expectations.

No concrete merge blocker found in this scoped change. Server response/cursor/ETag generation remains root/server integration work. Tests use React DOM and actual validation/query hooks with MSW responses; no browser, DB, provider or production runtime claims.

Command: npx vitest run tests/yellow-batch-errors.test.tsx --reporter=dot. Evidence green.txt + receiving-tests.tsx.txt.
