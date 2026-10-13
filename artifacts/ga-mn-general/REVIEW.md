# Official GA/MN general candidate source increment

Worked: all 17 GA/MN races in D's retained 33-race `not_recorded` list now have directly fetched official November 3, 2026 general ballot evidence. Two draft manifests contain 41 named printed rows across 14 sources: GA26, MN15. GA adds the ten missing House scopes plus S/G/H13 printed scopes; MN adds its seven missing House scopes. Root owns combining manifests, conflict review and actual DB application.

Every source SHA binds original fetched PDF bytes. `source-scope-review.json` independently conserves all 17 receiving IDs and each complete printed scope. `strict-manifest-validation.jsonl` records the actual current `parseNomineeManifest` validation. `first` through `fourth-extraction-proof.json` retain role, name, party and date checks.

Fayette GA03 requires OCR because its PDF has no text layer. CPU Tesseract output, per-word confidence, original rendered PNG hashes and page mapping are retained. The candidate names/parties and district were independently read from the Fayette AND Carroll page images. Carroll OCR's `Democat` was rejected; the actual page prints `Democrat`. Generic write-in slots are excluded. Source `(I)` markers are not guessed into incumbency: every row keeps `incumbent:null`.

Camden's PDF omits the election date. Its retained official Gov sample-ballot landing explicitly binds that exact document to the November 3, 2026 General/Special Election; this evidence is recorded separately. All other admitted raw ballots print the actual general election date. Publication dates remain null when not explicitly published; capture clocks are actual timed fetch receipts.

Minnesota curl succeeded with default headers and normal TLS where urllib closed the connection. The official application's retained public JavaScript documents its public `FilteredAddress/GetFilteredAddresses`, `PollingPlaceData/GetPollingPlaceData` and `/file/SampleBallotPdf/<ImageFileId>.pdf` routes. Public street-range navigation retrieves no voter identity. Four independently fetched original SOS JSON responses identify `11/03/2026 STATE GENERAL ELECTION`, the exact district and named ballot rows. Their publisher-provided sample PDF links were fetched separately; PDF candidate sets/counts/parties agree exactly with the JSON. No CAPTCHA, access or TLS bypass was attempted.

Earlier challenge/shell attempts remain Blocked even when transport returned HTTP200. Cached web-search copies, primary ballots, filing lists, staged/test results and general notices with no candidate rows supplied zero admitted candidates. Later successful raw fetches resolve the four Minnesota gaps without upgrading those blocked attempts.

These sources are official published sample ballots showing named printed general candidates; they are not described as certified statewide nominee lists or complete write-in lists. Parties remain literal publisher strings, no winner/contact/bio is inferred, and no DB or app code was modified.
