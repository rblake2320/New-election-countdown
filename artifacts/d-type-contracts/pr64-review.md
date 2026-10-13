# PR64 independent-review repairs

The prior full suite missed two concrete defects identified by Yellow. Both were reproduced against `641e2b1` before changing production code.

1. **S3 object-version race:** an old plaintext HEAD followed by a new encrypted GET could publish ciphertext as restored plaintext when checksum verification was omitted. Restoration now derives encryption, compression and checksum metadata from the same GetObject response that supplies the bytes. Tests use actual AES-GCM bytes and real local streams, with stale plaintext HEAD metadata, for compressed and uncompressed objects. A tampered-body case must reject and preserve the existing destination even without the checksum option.
2. **Partial configuration validation:** PUT could enable email without existing recipients or clear recipients while email remained enabled. It now loads the existing configuration, validates the merged state using the same service invariant as creation, then updates storage. Contract violations return 400 without a write; a missing target returns 404. A valid transition using inherited recipients remains accepted. POST contract errors also return 400.

The new tests produced **7 failures and 15 passes** on the prior source, then **22 passes** with the fixes. Yellow independently reran the targeted tests and inspected the three-source-file diff: 22/22 passed, both findings resolved. Raw receipts are `pr64-review-red.txt` and `pr64-review-green.txt`.

HTTP tests use the actual Express router with authentication/storage boundaries replaced by fixtures. Stream tests intercept S3 transport; no external S3, shared database or deployment operations occurred. The unavailable recovery capabilities listed in the original README remain open.

Final checks: **829 tests passed across 93 files**, production build exited zero, and fresh nonincremental TypeScript reports the same **105 existing diagnostics**, with zero new or D-owned diagnostics. Final validator typing names only the four fields it validates; unrelated database JSON fields are not cast to insert types. Exact outputs and source hashes are in `pr64-review-receipt.json` and the adjacent `pr64-*` logs.
