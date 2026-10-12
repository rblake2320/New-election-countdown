# Official results source research — group 1

Seventeen states were researched from official agency pages and their linked public result services. Six have fetched, parseable historical/primary downloads, eight have verified public result pages whose machine-data contracts remain unverified, and three encountered transport blocks on advertised data or public-page bootstrap. **No November 3, 2026 general-election vote record is admitted.** Navigation URLs remain separate from vote-feed proof.

| State | Recorded source capability | Concrete source/context |
|---|---|---|
| AL | Download | SOS Republican May 19 workbook; live HTML election code 1001290. Raw heading “Govenor”; summary/counties overlap. No general code verified. |
| AK | Manual page | Official primary August 18 id `26prim` links PDFs. Combined HTML returned 405. General ranked-choice rounds require distinct mapping. |
| AZ | Transport blocked | Official press advertises primary July 21 XML summary; normal HTTPS 403, web reader 404. Publisher minimum interval 120 seconds. No bypass. |
| AR | Manual page | SOS delegates Tally with primary election UUID. Mixed partisan/nonpartisan contests require office-specific phase. Raw API schema unverified. |
| CA | Download | Certified June 2 primary SOV workbook/PDF/certificate. General-labelled October 9 media values are refused pre-election input. |
| CO | Manual page | SOS primary abstract; county official publisher links statewide Clarity 126592. No general-election ID or parsed data feed verified. |
| CT | Manual page | Exact SOS EMS link pcctg redirects tgstg. Town scope and fusion-party lines must be reconciled. No raw data contract verified. |
| DE | Download | Agency-linked Socrata dataset 4hbv-7brf, 829 rows across many elections; exact September 15 primary scope 80 rows. Conflicting certification labels retained. |
| FL | Manual page | Official archive/ElectionWatch routes 200; later normal read 403. Reporting timeline is not vote data. No November publication verified. |
| GA | Transport blocked | Official May 19 route `GeneralPrimary51926` returns public shell; later bootstrap observation 403. No auth, localhost or Mapbox endpoints called. |
| HI | Download | August 8 statewide primary PDF says FINAL, printed August 14. Final/reporting/turnout are not a certification or ballots-complete claim. |
| ID | Transport blocked | VoteIdaho links public statewide/county `may2026` views; later bootstrap observation 403. Machine schema unverified. |
| IL | Download | Election 69 2026 General Primary CSVs; raw candidate/contest/party/geography IDs. Statistics buckets are not people. Minimal recordings are partial. |
| IN | Manual page | Gov ENR Angular page and CEB 11 link. Raw result schema and November election identity unverified. |
| IA | Manual page | SOS links primary Clarity 126082 export/reporting view. Raw API schema and general election ID unverified. |
| KS | Download | August 4 Senate precinct workbook; September 1 agency statement confirms primary certification. Master and Johnson sheets overlap. |
| KY | Manual page | Distinct existing C6 State Board archive/year/recap indexes only. Saved Jefferson browser/identity restriction preserved; no county alternate route. |

## Actual positive recordings and checks

California's June 2 primary Governor workbook contains 68 source choices and 58 county rows. Every candidate's county sum equals the published state total. Separately published PDF state totals verify Xavier Becerra 2,591,857, Steve Hilton 2,277,318 and Tom Steyer 2,110,707. The actual one-page Secretary certificate was visually inspected: it certifies the official canvass of the June 2 primary and is dated July 10, 2026. This source supports a **certified primary drill**, never a November general result. Raw workbook, PDF and certificate hashes are retained in CA-certified-primary-acceptance.json. Candidate labels express voter-nominated party preference; write-in labels are retained. No candidate IDs exist in the workbook. One name contains a publisher-side replacement character and requires separate identity review rather than guessing a spelling.

Delaware's fetched CSV contains 829 records; a separate public API count returns 829. Its exact election date/name filter selects 80 September 15, 2026 primary rows. The agency's separately displayed recount table confirms Morgan Hudson 1,017 and Matt Bucher 1,010, matching the CSV. The dataset's general title says official, while the specific primary ENR page says unofficial; this does not authorize a certified claim. Source xmlreporttime is retained separately from HTTP fetch time. The current resource also includes 2020/2022/2024 elections and school races, so date and office filtering are mandatory.

Illinois' full downloaded Senate file has 196,140 data rows, while the retained minimal recording has 20 actual candidate rows. Its raw EISCandidateID/EISContestID/EISPartyID fields support explicit identity mapping; primary party belongs in race identity. Under Votes, Over Votes and Blank Ballots are statistics. County/city hierarchy and repeated registration fields prevent blind sums. Browser-style normalization of the actual Windows-backslash href is documented; no filename was guessed. Exact election-date and certification binding still require review before production use.

## Actual refused pre-election input

CA-pre-election-statewide-raw.json is an exact 630-byte fragment of the fetched official governor.json response. It contains 21,865 and 22,103 vote-like values, a 20.2% precinct-reporting metric and ReportingTime October 9,2026. The government's media index labels the file for November 3,2026, while its voter guide says result publication begins after polls close 8 pm on November 3. The recording is therefore a **refused pre-election/staging scenario**, not live results. HTTP 200, nonzero counts and a government hostname cannot replace source-date/publication validation. Full source digest, fragment digest, exact fields and context are in CA-pre-election-refusal-context.json.

## Handoff boundary

source-manifest.json contains one item per state, concrete receipt links, formats, observed IDs, metrics, certification distinctions and mapping requirements. Missing fields remain null/unverified. Root owns shared DTO and dry-run adapters; lane A owns posting/storage. This branch changes only source research artifacts and collectors, with no app code, shared schema, database, browser preview, paid API, authentication, CAPTCHA or deployment action.

Portable validation: `python artifacts/et6-g1/verify_recordings.py` checks the retained CA/DE recordings; `python artifacts/et6-g1/build_manifest.py` builds the 17-state manifest from retained receipts. Live collectors perform ordinary public HTTPS fetches and may encounter changed content; preserve original evidence when reviewing a later revision. No result winner, projection or current-general publication is inferred from numerical rank.
