# D final historical HTTPS receiving Worked

Production image sha256:4fd2c2f8427c1271b3502824dce782006257b0f77a3d88524ecc936867f403f1, frozen sourceec45ea4 (NC1f999 +LA7b7). Runtime/data/schema/manifests/Docker/build-config diff against mergedmain11f7b1d is empty. Builds/type0/63focused tests passed. Final run148276-47c604fb completed2026-10-13T22:18:28Z.

Actual manual boot-disabled receiving: unchanged NC82579-byte source packet201,total827755/six options; unchanged LA196212/two options201; both repeat stable, independent SQL counts and304. No arbitrary registry injection/URL rewrite. NETWORK_ENABLED=false is explicitly the manual-path scenario; normal bootstrapLA success retained separately.

TLS: Node+Chromium+Firefox+WebKit absentCA/correctSAN/wrongSAN allWorked (14 controls including same-leaf corroboration). One exact DNS SAN enforced; no wildcard/CN/extraSAN. PublicCA only inside disposable browser containers, originalCSP/HSTS/HTML bytes identical at upstream/proxy/browser; Secure/HttpOnly/SameSiteLax cookie attributes verified. No header rewrite, insecure TLS flag, host trust change or host port. Caddy managed->static reload protocol failure retained; managed single-start fallback-SNI path passed sameleaf controls.

Historical74: Chromium/Firefox/WebKit x1280/390 all6 runs exit0, real authenticated admin lookup excludes historical races publicly then selects/hydrates both true-date NC/LA reports with exact revisions/counts. Only loginPOST; zero results/evidence/vote mutations. Allprotected report/vote/evidence/profile digests unchanged. Seven source tables769 unchanged (537elections/3480profiles/3943source records/539snapshots). Allgeneratedresources removed;5094 untouched andhealthy.

Prior164132 sixbrowser UI passed but broad finalguard Failed on24 result_source_health rows changed by normal automatic polling; report/vote/profile digests unchanged. That failure remains separate, not relabeled green. Final148276 manual-only run passes the same broadguard, includinghealth rows.

Evidence: docs/evidence/et6/historical-browser-internal/148276-47c604fb/ (receipt,posts,TLScontrols,headers,sixrequests/security/screenshots), historical-tls-la-build/. Original failures158400/59768/99008/164132 retained. Remaining distinct gate: mixed505+1error/304/recovery Firefox+WebKit (Bnewbundle1fa95eab received). Deploy/sharedhealthDDL held.
