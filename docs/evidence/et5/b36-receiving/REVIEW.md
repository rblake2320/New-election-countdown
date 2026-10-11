D independent receiving: **Worked** for PR36 exact96201290851fe8e0e39dcece19a6891abc77fb6c (composition2ced2a1).

Actual production image sha256:bb60886c0fc281fd138ec06145861f8cdf7e6995ec94f711887c75dbb0a5e9b5; same production CLI/app/private PostgreSQL, no HTTP interception or hook mocks.

- Fresh Chrome /congress survives the real /api/bills/119 503 missing_api_key. Bills displays the missing-source message. Try again issues another actual503 (retained server request IDs) without ErrorBoundary.
- Invalid Congress abc shows numeric guidance and generated no /api/bills/abc request. Actual empty committees/bills display explicit empty states.
- Members filters receive274 Republican,262 Democratic,3 Independent; Senate+Independent2 of539. Data Management points to /congress-admin.
- 661/661 unit tests and production build pass. Existing production harness22 checks pass: guarded539 apply, repeat0/stablexmin/fullrows, durable audits, exactSQL all541/current539/history1/legacy1 and five territories.

Evidence: docs/evidence/et5/b36-receiving on astra/b35-receiving. Original B35 red evidence remains separately retained. This receiving approval applies to PR36's crash repair. C name update awaits its immutable head and separate same-harness retake; shared apply/deploy hold unchanged.
