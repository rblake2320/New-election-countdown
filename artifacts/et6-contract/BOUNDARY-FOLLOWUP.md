# ET-6 context and timestamp receiving follow-up

Base: immutable main b1312c6, after PR51. This change owns the shared validators,
their tests and contract documentation. Server writer/routes remain lane A.

Worked: focused shared/official-result tests 55/55; final main-composed full unit
suite 767/767, zero skips; npm build exit0. Fresh nonincremental full typecheck
remains red with186 existing diagnostics, zero in the changed shared/test files.
Raw outputs are adjacent context-timestamp/new-green, full-main, build-main and
types-main receipts. Earlier own-branch750/187 receipts are retained separately.

Failed on old code:11/22 boundary cases; the response context fields were refused,
ids-batch date=null refused, and three invalid-offset posting controls were
accepted. The independent timestamp-probe-receipt.json additionally records all
18 accepted invalid response timestamps before repair. Common timestamp syntax
validation previously admitted +99:99/+24:00/+00:99; Date.parse returnedNaN and
chronology comparisons skipped the failure. Finite-instant validation now applies
to every live-result timestamp and the three related official publication/receipt
timestamps. Existing tests lacked invalid numeric-offset controls.

Receiving contract: recorded GET responses require electionContext copied at
recording time. Every history row requires contextMatch. A none response can
retain only mismatched-context history, with all current counts/provenance null.
Batch date can be null for A's explicit-id query; date-filtered recorded rows must
match the requested date. Posting inputs still reject server-owned context.

A must adopt the shared follow-up and stop stripping electionContext/contextMatch
in toSharedResponse. B imports the same validators; no local copy. D owns actual
private-PG HTTP replay and load. Those receiving gates are pending, not included
in the unit/build result. No shared DB or deployment action occurred.

Separate A review: A-canonical-hash-old-red.json executes the actual A module at
9c596c8. Nested votes/source/reporting changes collided. PR50 comment6120201086
assigned the recursive serializer repair to A; A d3655d4 includes that repair.
Its private receiving retest remains A/D work, no C runtime duplication.
