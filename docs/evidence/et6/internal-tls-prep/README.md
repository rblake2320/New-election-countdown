# Internal TLS preparation — 2026-10-13

Scope: research, image inventory and tools-only derivative build. No browser fixture or TLS navigation was run. Root owns Caddy and official-source data; B owns browser acceptance.

Pinned base: `mcr.microsoft.com/playwright@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f`. Inspected container: Ubuntu 24.04.5, Chromium/headless revision 1248, Firefox 1555, WebKit 2370. `certutil` absent; `update-ca-certificates` present. `pwuser` is UID/GID 1001, home `/home/pwuser`. WebKit headless wrapper selects `minibrowser-wpe`, with bundled libsoup 3; host container GIO has `libgiognutls.so`.

## Browser-specific trust

| Browser | Proposed trust setup | Harness requirement |
|---|---|---|
| Chromium | Public CA in `/home/pwuser/.pki/nssdb`, NSS trust `C,,` | Launch as UID1001 with HOME=/home/pwuser. The existing legacy path overrides the new M146 default. |
| Firefox | Public CA in `/tmp/et6-firefox-profile/cert9.db`, NSS trust `C,,` | `firefox.launchPersistentContext('/tmp/et6-firefox-profile', {headless:true, ignoreHTTPSErrors:false, bypassCSP:false, ...})`. Use this returned context directly. Do not call ordinary launch/newContext expecting another profile to inherit it. |
| WebKit | Public CA in container `/usr/local/share/ca-certificates/et6-fixture.crt`, then `update-ca-certificates` | Normal WebKit context with TLS verification enabled. This is the expected libsoup/GIO system-store path; receiving browser navigation must establish actual compatibility. |

Chromium documents Linux NSS trust and the legacy/new home paths in [Linux certificate management](https://chromium.googlesource.com/chromium/src/+/master/docs/linux/cert_management.md). Playwright's [1.64 Firefox launch source](https://raw.githubusercontent.com/microsoft/playwright/v1.64.0/packages/playwright-core/src/server/firefox/firefox.ts) explicitly supplies its selected userDataDir as `-profile`. Consequently, importing into an unrelated default Mozilla profile does not configure this process.

Mozilla's [Certificates policy reference](https://firefox-admin-docs.mozilla.org/reference/policies/certificates/) supports absolute PEM/DER paths with `Certificates.Install`; `ImportEnterpriseRoots` is Windows/macOS only. A conventional Firefox policy would live under `/ms-playwright/firefox-1555/firefox/distribution/policies.json`, containing `{"policies":{"Certificates":{"Install":["/run/et6-ca/root.crt"]}}}`. Do not rely on this route for the fixture: [Playwright issue 35815](https://github.com/microsoft/playwright/issues/35815) documents patched-Firefox policy problems. Direct profile NSS avoids policy discovery. Do not replace libnssckbi or disable verification.

[libsoup TLS database](https://libsoup.gnome.org/libsoup-3.0/property.Session.tls-database.html) uses the default GIO TLS database unless overridden. The inspected WebKit wrapper/library inventory supports using the container CA store; this is a reasoned setup choice, not a claimed browser acceptance result. `NODE_EXTRA_CA_CERTS` configures Node (including browser download helpers), not all browser trust engines.

## Delivery/use

`Dockerfile` adds only libnss3-tools to the pinned image. Build log and exact resulting image ID accompany this file. Never bake a CA or private key into this image. Supply only Caddy's public root certificate, read-only, as `/run/et6-ca/root.crt`. Keep Caddy private keys in root's disposable tmpfs. Do not mount any host certificate store.

Inside a fresh disposable browser container, run `sh /prep/prepare-trust.sh` as root once. Then run the B harness as `pwuser` with `HOME=/home/pwuser`, `ET6_FIREFOX_PROFILE=/tmp/et6-firefox-profile` (B must explicitly read this variable or use the exact path), and the existing mounted Playwright 1.64.0 package. The base image supplies browsers, not the npm Playwright package. Prepare before any browser launch. Do not reuse the profile concurrently. Use a fresh container/profile per viewport or sequentially close the persistent Firefox context before reopening.

Root's exact hostname is `https://et6-fixture.internal`; attach the browser to the existing isolated Docker network where that name resolves to Caddy. Do not navigate to an IP or localhost unless it is explicitly in the leaf SAN. Caddy must serve a valid leaf+intermediate chain, and only its public root is trusted here. No ignoreHTTPSerrors, ignore-certificate-errors, bypassCSP, CSP rewriting, or host trust changes.

## Receiving checks assigned to root/B

1. Record immutable image ID, package version, browser versions, UID/HOME, public-root SHA256 fingerprint and Caddy leaf SAN/validity; no private keys.
2. Navigate all three real browsers to the fixture with default verification; retain final URL/status, secure-context result, browser console/page errors, and normal application receiving assertions.
3. Use disposable separate browser containers to demonstrate untrusted-root failure and hostname-mismatch failure. A curl success alone is not browser evidence. No trust bypass as fallback.
4. Retain each browser's actual outcome. Clean only owned fixture containers/profile volumes; no host certificate installation or DB changes.

Preparation script is intentionally not run in this task because root requested prep only. Its shell syntax can be checked without a CA or browser launch. Expected fixture hostname, CA lifetime, and exact network remain root-owned runtime inputs.

## Standalone browser TLS controls

`tls-controls.mjs` is ready for root orchestration; syntax checked with `node --check`, no fixture executed. Mount it read-only and provide `/harness/node_modules/playwright` exactly 1.64.0. Run as UID1001/HOME=/home/pwuser:

- Fresh tools-only container, without trust preparation: `CA_TRUSTED=false BASE=https://et6-fixture.internal node /prep/tls-controls.mjs` (3 certificate rejection controls).
- Separate prepared container: `CA_TRUSTED=true BASE=https://et6-fixture.internal WRONG_BASE=https://et6-wrong-san.internal node /prep/tls-controls.mjs` (3 trusted positive + 3 wrong-SAN rejection controls).

Both names must resolve to the SAME Caddy fixture; root must ensure the wrong name is absent from leaf SAN and Caddy presents the existing fixture certificate for that SNI rather than refusing the handshake or issuing another certificate. If proxy behavior cannot supply a wrong-SAN certificate, report that control failed; do not count connection/DNS/timeout failures as certificate rejection. Chromium/Firefox require named certificate errors; WebKit permits its certificate-verification-specific error string, with the same-run trusted positive required. Exit is nonzero for any missing expected outcome. JSON stdout records outcomes and public certificate metadata only. Retain stdout/stderr separately in root's receiving evidence. The script does not orchestrate containers, change trust, mutate DBs or remove shared resources; it removes only its own newly-created absent-CA Firefox temporary profile.

### Revised Node + public leaf contract

Both runs now require BASE and WRONG_BASE plus read-only public `/run/et6-ca/leaf.crt`. Leaf inspection refuses a CA leaf, absent serverAuth EKU, expired/not-yet-valid certificate, lifetime over 48 hours, missing BASE hostname, or matching WRONG_BASE hostname. No private key is read.

Absent run: keep NODE_EXTRA_CA_CERTS unset, CA_TRUSTED=false. Trusted run: set `NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt` in the environment BEFORE starting Node, CA_TRUSTED=true. The script never changes this variable dynamically. Actual built-in Node fetch runs with standard verification and rejects redirects. Only issuer-specific cause codes satisfy absent-CA; only ERR_TLS_CERT_ALTNAME_INVALID satisfies wrong-SAN. Trusted positive must return 2xx.

Chromium and Firefox now use separate issuer and hostname error patterns, so the wrong rejection reason fails. WebKit's generic certificate message is labeled generic. Its wrong-SAN result additionally requires two Node TLS handshakes: positive and wrong hostname must present the exact SHA256 fingerprint of the supplied public leaf, and the wrong-host handshake must reject with ERR_TLS_CERT_ALTNAME_INVALID. The Node TLS callback always delegates to standard checkServerIdentity and never overrides a verification failure. All Node controls contribute to the final aggregate exit status.

These changes were syntax checked only; root still owns fixture execution. Latest commands supersede the earlier absent-run example: supply WRONG_BASE to that run too. Trusted run now has 10 checks (6 browser, 2 fetch, 2 same-leaf TLS); absent run has 4 (3 browser, 1 fetch).
