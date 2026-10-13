# Persisted candidate record freshness

Runtime core `8a678c4698994d6c0975b0458e4380ab06900682`, based on main5fe2423.
The candidate list/detail routes previously returned request time as
`last_data_update`, including unknown data and failures. VoteSmart's aggregate
`lastUpdated` is itself generated on every capture or unavailable response, so
merely parsing it cannot establish a record update or publisher clock.

The routes now use only the candidate's persisted `updatedAt`/`updated_at`.
Valid Date or explicit ISO instants normalize to UTC; missing/invalid clocks
return null. Dates without time/zone, numeric values, invalid dates and calendar
rollovers are refused as unknown. No request clock, provider capture clock,
source-sync inference or publication-time claim is introduced. The internal
detail interface is `string | null`; no client/shared field consumer was found.
Provider fetching/enrichment behavior and all profile/source fields remain.
No storage mutation, provider service, schema, metadata or Perplexity job change.

Five real Express/loopback receiving scenarios were run on the unchanged old
routes and all failed the timestamp expectations. The current routes passed
34 targeted tests: repeated actual GETs 25 ms apart, generated provider clocks,
unknown nulls, provider errors, raw SQL aliases, unchanged profile fixture
preimages, invalid clocks and existing candidate-route regression coverage.
Storage/provider boundaries in these tests are isolated fixtures, not live
PostgreSQL or provider calls. The complete suite passed 1,232/1,232; full
nonincremental typecheck zero and production build passed. Boot PR87's reviewed
test-only fix was composed while its main merge awaited the executor; it has
no runtime delta from the core above.

Retained `red.json`, `green.json` and compressed complete `full.json.gz` are
bound by `receipt.json`. This receipt separates route/component execution from
the assigned D actual compiled/PostgreSQL acceptance: capture list and detail
twice separated by clock, independently compare SQL `updated_at`, confirm a
missing clock remains null and generated provider time cannot replace it, and
compare all candidate-profile digests before/after GETs. D owns that receiving
run; no duplicate C database or production harness was launched.
