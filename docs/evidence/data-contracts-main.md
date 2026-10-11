# Strict data contracts on main

Base68c3a24 already includes the real A generic cache API ececfb7 and provider DTO repair. This branch applies only the two Congress count modules, polling result narrowing, validated position-cache caller and typed nominee scope plans, plus their tests/evidence. No compiler configuration or shared schema changed.

Fresh physical installation:15 targeted tests passed, build passed. Strict full diagnostics before the scope annotation were953, including37 nominee array-inference errors; after the annotation they are916. All six owned data/provider modules have zero diagnostics. The remaining916 errors are visible, not a green release gate. The nominee annotation's before/after source differs while emitted JavaScript is byte-identical (SHA70aa0acfb7fbd4a3185349587f2bdbeae09caf56e6ccdaca9e75f4e7dc4a9985).

Congress validation represents missing recorded affiliation/state separately, keeps numeric chamber totals and preserves recorded labels. Source-only typed arrays replace never inference. Polling narrowing returns an actual boolean and preserves null/older recorded content; no freshness policy was invented. Position retrieval awaits the real asynchronous cache API, uses its seconds-based one-hour TTL, and rejects malformed/mismatched cached payloads. Red/green controls are retained separately.

No live providers, database writes, shared imports, deployment, casts, non-null assertions or configuration relaxation occurred. Congress provider and read-only database boundaries were mocked in the focused validation cases; position cache tests exercised the actual A cache methods in the independent physical composition documented by the upstream C service review.
