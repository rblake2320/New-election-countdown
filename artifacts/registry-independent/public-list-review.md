# Public list source review

Pins: delivery7d5500a8be741e95fa730db3feab45360ef6ab03, runtime4c554ec9a68b08e3583c7c3d9e76ee2fcc74535e, composed62511ac.

Source finding: counts aliases overwrite capitalized real rows. Executed exact composed route body with Primary/primary/General/general/Special: total5, Primary1/General1/Special0. Expected normalized totals2/2/1. Repair should aggregate normalized trim/lowercase type before exposing aliases, preserving response compatibility. Existing stats had same flaw; this remains a product accuracy issue.

Worked source boundary: missing-candidates candidate query exception returns503 listing_unavailable; empty candidate result returns200 missing row. DatabaseStorage.getCandidatesByElection directly awaits query and has no fallback. Main/list search/location/counts/missing list calls use getElectionsStrict. Search is registered ahead of election router; missing-candidates ahead of /:id. Parent diff preserves moved search body other than strict read/generic typed failure; location changes only strict read/failure. Counts now uses one strict dataset.

Acceptance plan after authorization/runtime blocker resolved (not executed by this review):
- Each of five endpoints: real SQL unavailable ->503 listing_unavailable, generic body, no fabricated empty200; restored same process ->original nonempty data; genuinely empty filter ->200 expected shape.
- Counts include lower/title/upper/mixed whitespace phase fixtures and compare normalized aliases against independent row counts; total equals active strict-list scope.
- Search validquery reaches search result shape, missingquery400 before storage, invalid numeric detail remains400, missing positive ID404. Missing-candidates reaches own shape, and candidate-query failure503.
- Main badfilter400 with zero SQL; nonempty reserved-route positive controls confirm ordering.
- Recheck parent numeric detail/candidate/admin routes plus results endpoints after composition.

No Docker/runtime/PostgreSQL actions performed. Root's denied combined runtime replacement/positive receiving action remains blocked; this review does not substitute for that action.
