// Candidate rows come from Drizzle (camelCase) or raw SQL (snake_case); read both.
// Every candidate endpoint carries the same source layer so FEC registration is never mistaken for ballot access.
export function candidateSourceMarkers(c: any) {
  return {
    data_source: c?.dataSource ?? c?.data_source ?? null,
    source_status: c?.sourceStatus ?? c?.source_status ?? null,
    ballot_status: c?.ballotStatus ?? c?.ballot_status ?? null,
    fec_status: c?.fecStatus ?? c?.fec_status ?? null,
  };
}
