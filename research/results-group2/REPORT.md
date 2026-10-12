# ET6 official results source research: group 2

17 states inspected with ordinary public HTTP, retaining source hashes, actual status and government link context. Six have parseable recorded feeds/downloads (LA, MA, MN, NJ county-only, NC, ND); six currently require page/document handling (ME, MD, MO, MT, NE, NM); five have blocked source access (MI, MS, NV, NH, NY). A usable historical format does not establish Nov. 3 live coverage.

`INVENTORY-17-states.json` records the exact endpoint, true election date/phase, external identifiers, available reporting metrics and blockers. `SHA256SUMS.json` pins retained recordings and research evidence. Run `python research/results-group2/verify-recordings.py` for offline verification.

## Recorded results and independent counts

| Source | True context | Independent check |
|---|---|---|
| LA JSON + parish CSV | June 27, 2026 Senate primary runoff | 64 parishes match JSON: Democratic 39,423 / 156,789; Republican 136,591 / 180,002 |
| ND JSON | June 9, 2026 Republican House primary | 53 counties match 59,719 / 22,196 / 160, total 82,075 |
| MN media TXT | November 5, 2024 general, labelled unofficial | All eight House contests sum to publisher totals; District 1 total 377,601 |
| MA government CSV | November 5, 2024 Senate general | 351 municipalities match TOTALS: Warren 2,041,668; Deaton 1,365,440; all others 6,221; blanks 99,601 |
| NJ Clarity JSON + CSV | June 2, 2026 Atlantic County primary | Senate candidate votes match between formats; Republican 10,341, Democratic 14,950 |
| NC original ZIP + JSON | March 3, 2026 Democratic Senate primary | 17,124 original rows aggregate to 827,755, matching six ENR choices |
| NC certification PDF | November 5, 2024 Governor general | Five candidate vote-method sums total 5,591,551; explicit Nov. 26 certification evidence |
| NC published recount PDF | November 5, 2024 Supreme Court Seat 6 | 100 counties independently sum printed before/after: Riggs 2,770,522 to 2,770,412; Griffin 2,769,788 to 2,769,678 |
| MD literal HTML vote table | June 23, 2026 Democratic Governor primary | 74,312 + 558,768 = 633,080; explicit July 23 state-canvasser certification proof |

## Receiving concerns

* LA Nov. 3 election ID 344 mixes Senate **general** with House **open primary**. The House phase must remain primary. June 27 `Advances` means primary advancement. `VersionDateTime` 1900-01-01 is a sentinel, so sourceAsOf is null.
* NC and ND currently publish Nov. 3 zero-vote placeholders. They are useful for mapping and future polling, not actual election-night returns. NC contest ID 2147 is shared by Democratic and Republican Senate primaries: party/title qualification is mandatory.
* NJ Clarity version 377336 has matching votes but conflicting precinct reporting: JSON 143/145, CSV 145/145. Keep each payload's reporting fields; do not combine them.
* NC certified Governor PDF and current historical ENR disagree by three Stein votes and one Robinson vote. Both genuine sources are retained; no correction ordering is inferred. The certification PDF carries explicit certification evidence. The Supreme Court recount was among contests excluded from that Nov. 26 certification.
* Candidate vote-share columns are never precinct reporting percentages. Missing reporting percentages remain null. Unknown local timestamp timezones and date-only certificates remain null ISO asOf; HTTP/fetch timestamps are separate.
* NC precinct-sort files contain statistical noise and are excluded. The original ElectionResults ZIP is the independently aggregated source.
* Government gateways/HTML alone are insufficient vote-feed evidence. NE/NM service URLs are recorded as declarations, not a claimed fetched JSON adapter. NJ statewide running returns require separately verified county sources.
* NV HTTP 200 is an Incapsula error iframe, not results. MI/MS/NH/NY downstream 403 and MN layout validation challenge remain recorded without bypass.

No app implementation, DB writes, credentialed media APIs, preview, browser/native capture or display changes were performed for this packet. Contacts are excluded. The certified NC PDF recording is an explicit contact-free excerpt of original pages 2–3; its recording hash is distinct from the original full-document hash.

Primary authority links: [NC result data](https://www.ncsbe.gov/results-data/election-results), [NC certification](https://www.ncsbe.gov/news/press-releases/2024/11/26/state-board-unanimously-certifies-2024-general-election), [NC published recount](https://www.ncsbe.gov/news/press-releases/2024/11/21/state-board-releases-recount-results-report), [LA graphical results](https://voterportal.sos.la.gov/graphical), [ND official results](https://www.sos.nd.gov/elections/election-results), [MN official media files](https://electionresults.sos.mn.gov/Select/MediaFiles/Index?ersElectionId=170), [MA Senate result](https://electionstats.state.ma.us/elections/view/165304/), [NJ official county links](https://www.nj.gov/state/elections/election-night-results.shtml), [MD certification announcement](https://elections.maryland.gov/press_room/documents/2026/SBE_Announces_Primary_Results_Risk_Limiting_Audit-2026-07-23.pdf).
