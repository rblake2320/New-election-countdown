Missing or failed geocoding previously returned null, causing RaleighNC to be called invalid input400 (D original receipt retained). Direct geocode/reverse also answered no-match404 and address validation answered false200 for an unconfigured provider. Nearby wrapped outages as empty. Actual no-key service controls reproduce those old outcomes (11pass12fail).

Geocode/reverse now raise typed GeocoderUnavailableError for missing configuration, HTTP/key/transport failures or malformed responses. Valid input is checked first; typed input errors remain400. Primary MapQuest documentation explicitly distinguishes status0 success,400 input,403 key,500 provider—even on HTTP200. Null is reserved for a classified status0 response with explicitly empty results/locations. Malformed JSON/shape is unavailable, not no-match. Provider work has a10-second abort signal through JSON body consumption. Provider URLs/keys/raw exception detail are not returned or logged.

Affected receivers: /api/elections-by-location, /api/geocode, /api/reverse-geocode, /api/validate-address. Address and coordinate arrays/blank/junk/out-of-range inputs return400 before provider calls. Worked no-match keeps by-location400, direct404 and validationfalse; availability stays503 geocoder_unavailable. validateAddress/findNearbyElections propagate the typed outage instead of false/empty. Existing successful reverse input coordinates and exact source state/county/city labels are preserved by an explicitly synthetic contract test.

Worked:70 targeted tests;1269 whole-unit tests;fresh full typecheck0 andproduction build0 after cleanly merging exact parent85+mainhealth+latestmainPR83. Compiled native receiving36 scenarios use actual DatabaseStorage/nativePG/Express and real MapQuestService with an absent key. All four no-key receivers return503 with0provider calls and0SQL reads. Original public listing27 native scenarios still pass; malformed location input controls precede the real disabled provider. The fixture requires only process-local synthetic auth secrets after parent auth imports; an initial missing JWT_SECRET startup refusal is retained and correctly classified as harness configuration, not geocoder success.

Provider transport/status/malformed/positive fixtures are isolated unit boundaries only. They are not real MapQuest network results. A configured live positive location lookup is Blocked on an authorized valid MAPQUEST_API_KEY. No key was supplied or consumed, no paid provider call made. The valid state-to-listing SQL boundary was tested with a labelled synthetic resolver and real private PG; that partial test is not substituted for a real geocoder result. D owns the full production-image final retake.

No shared or D database writes. Dedicated labelled synthetic PostgreSQL fixtures use an internal network/no exposed database port and are removed after checks. No schema, package or source-manifest edit. Parent byte hunks were preserved by byte-level route changes; merged parent voting/positions/integrity and public count/window repairs remain. Original public receipt indices retain every hashed byte.

Reproduce:
node scripts/build_geocoder_contract_receiving.mjs
python scripts/run_geocoder_contract_receiving.py
npm test
npm run check
npm run build

The compiled runner pins the unchanged existing D production image for physical Linux dependencies. Ordinary provider configuration is never read from that D container: it runs a new dedicated owned fixture container with no MapQuest key. Technical documentation hashes and exact official URLs are in official-provider-documentation.json; no contact-bearing raw documentation is committed.
