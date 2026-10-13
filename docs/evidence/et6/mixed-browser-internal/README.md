# D mixed browser receiving: retained RED and next check

Run146988-68fd49ce, image4fd2, first1280 window. Firefox7/7 Worked. WebKit6/7: all505healthy+oneNC24error persisted, no mutations/page errors, recovery to506 happened at154s without reload; only expected Playwright304 count was0. App log shows two actual304 responses every30s during the paired engines (eight304s), then both200 on recovery. WebKit reported200 for each conditional response. This is consistent with browser/protocol revalidation response merging, but the first run lacks per-engine request-ID correlation; it remains Failed, not relabeled.

B owns harness upgrade to preserve outgoing uniqueX-Request-Id, exactIf-None-Match/ETag/bodyhash and distinguish browser response status from actual wire304. D will independently join those IDs to unchanged application request logs. No client cache/security/header rewrite or production runtime fix is proposed merely to force an inspector status.

Research: WHATWG Fetch https://fetch.spec.whatwg.org/ describes conditional-header cache handling; Playwright issue https://github.com/microsoft/playwright/issues/29441 and WebKit https://bugs.webkit.org/show_bug.cgi?id=158256 document protocol-visible304 versus200 revalidation differences. Those sources guide the next actual test; they are not a substitute for exact new-run correlation.

Controller actual505+1/304/recovery506/304 and exact-row cleanup Worked. Allnewcontainers removed,5094untouched. Second390 window was not run after the failed first window. Final historical148276 remains separatelyWorked/45hashes verified. Remaining mixed receiving waits B frozen updated bundle, then fresh owned internal HTTPS retake.
