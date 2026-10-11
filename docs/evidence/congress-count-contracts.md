# Recorded Congress count contracts

Source base72cdbd9; compiler command uses strictNullChecks=true, targetES2022 and useDefineForClassFields=false without changing repository configuration. The two Congress modules' nine routed diagnostics are zero after explicit member-array and count types. Full diagnostics972→963 on this exact source composition; the remaining server/client diagnostics stay visible.

Import validation now represents missing/blank recorded affiliation and state separately. It preserves total/chamber counts and every recorded party label, rather than creating a party called null or counting a missing state as a represented state. The existing count-threshold completeness flag is unchanged; these tests are recorded-row validation and do not certify the provenance or completeness of an external roster.

Observed red: two of three null/blank/empty-record controls failed. Observed green:3/3 passed. The data boundary is a read-only mocked database result, and the Congress provider factory is mocked unavailable. No provider, database write or import routine ran. The typed chamber-count control preserves numeric totals and excludes unknown chambers from House/Senate totals. Build passed.

Raw red/green unit reports and strict diagnostics are retained under artifacts/congress-count-contracts. No casts, non-null assertions, compiler relaxation or shared-schema edits were added. The legacy import method's operational behavior was not exercised or cleared by these validation tests.
