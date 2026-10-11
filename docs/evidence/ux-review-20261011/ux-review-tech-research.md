# Recent technology review for ElectionTracker UX and performance

Research date: 2026-10-11. Requested release window: 2026-05-11 through 2026-10-11 inclusive. Primary publisher sources only. This is a research recommendation report, not an implementation or measured site-performance result.

Inspected stack at origin/main 426c7095b900795c8e6fdc3a18e58f123a584a9e: React/react-dom18.3.1, Vite8.3.4, @vitejs/plugin-react6.1.2, Tailwind3.4.19, tailwind-merge2.6.0, react-virtuoso4.14.0. Home already uses VirtuosoGrid with overscan300; use-now already centralizes timer state. Vite config already separates charts and other vendors. Do not propose these existing changes as new work or equate newer package versions with faster runtime.

## 1. Highest priority: measure the real SPA journeys with current DevTools

Verified date: September22,2026, despite the article title saying October2026. Chrome153/154 DevTools now has complete soft-navigation analysis in Performance Insights and calibrated CPU tier overrides. This is directly relevant to Home -> filter -> election -> Watch -> auth -> return flows, where a reload-only score misses client navigation work. [Publisher release](https://developer.chrome.com/blog/new-in-devtools-october-2026/).

Compatibility/value: no React/Vite migration needed; diagnostic tooling does not alter deployed behavior. Use the existing production build and fixed browser version/hardware profile. The benefit is finding actual interaction/render/network bottlenecks before spending time on speculative rewrites.

Acceptance: retain traces for cold entry, warm navigation, filter changes and watch/register flow at desktop and constrained mobile profiles. Record LCP/INP/CLS, long tasks, request count, transferred JS and heap growth after repeated navigation. Use identical datasets and at least five comparable runs; record medians/tail values. Field targets remain LCP<=2.5s, INP<=200ms, CLS<=0.1 at the75th percentile by device segment; lab runs are regression controls, not field percentile claims. Those target definitions are older stable guidance, updated October31,2024. [Web Vitals](https://web.dev/articles/vitals).

Owner: Astra measurement gate; Opus receiving flow review.

## 2. High priority: finish the already planned Tailwind migration for dependency health, then measure its UX result

Verified in-window release: Tailwind4.3.3, July16,2026 at11:55:08Z, read from the publisher GitHub release API. The release fixes selector parsing, plugin color resolution, Windows CJK font handling and other correctness issues. [Release](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.3). The v4 architecture itself is older than this five-month window; do not market the whole migration as a new summer2026 discovery.

Compatibility/value: current Tailwind3 keeps the remaining braces-related build dependency findings; root and Opus already own the coordinated v4 plan. Use matching @tailwindcss/vite4.3.3 and tailwind-merge3.7.0. Preserve custom theme tokens, class dark mode, typography, accordion animation and Bauhaus ordering. The official browser floor is Safari16.4/Chrome111/Firefox128; do not silently drop older supported audiences. [Upgrade guide](https://tailwindcss.com/docs/upgrade-guide), [tailwind-merge compatibility](https://github.com/dcastil/tailwind-merge/blob/main/README.md).

Acceptance: full audits and existing build/types/tests/private-container gates; compare CSS size and cold/hot build times. Before/after browser checks must cover cards, filters, focus rings, dialogs, dark mode, mobile drawer, unknown-source badges, auth flow and200% zoom. Any speed improvement must be measured; migration is justified first by removing the affected dependency graph.

Owner: Opus client migration, Astra dependency/build gates. Do not duplicate the active lane.

## 3. Targeted experiment: native customizable select for simple filters

Verified date: September17,2026. Safari27 shipped customizable select with appearance:base-select and native form semantics. [WebKit release](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/).

Compatibility/value: evaluate a plain native select for simple state/party/timeframe controls where rich searchable combobox behavior is unnecessary. Retain ordinary native select fallback when appearance:base-select is unsupported; do not assume Safari support proves universal interoperability. React18 can render an ordinary select without adopting React19. Avoid advanced selectedcontent/rich-option markup until React/browser support is tested. Potential value is less custom UI machinery with native keyboard/form behavior; bundle savings only exist if an otherwise-unused dependency can actually be removed.

Acceptance: keyboard arrows/typeahead/Escape/Tab, label association, screen-reader announcements, touch picker, forced colors, zoom, selected-value persistence and filter API contract on Chrome, Firefox and Safari versions in the declared support matrix. Compare transferred JS and INP before replacing any current component. Retain the current control if the experiment regresses behavior.

Owner: Opus; optional incremental pilot, not a prerequisite for release.

## 4. Lower priority: React19.3 migration pilot after current release blockers

Verified date: September9,2026. React19.3 makes ViewTransition and Fragment refs stable. [React release](https://react.dev/blog/2026/09/09/react-19-3).

Compatibility/value: current React18.3.1 cannot use the new React ViewTransition component. A deliberate React/react-dom/types migration could improve visual continuity between list and detail or filter results; the release does not establish that ElectionTracker becomes faster. Check Radix, form libraries, routing, tests and all React peer ranges first. Respect reduced-motion preferences and preserve immediate truthful pending/error states.

Acceptance: isolated migration candidate, full peer-resolution/unit/type checks, real Watch/register/preferences/user-switch flows, focus return and back-navigation tests. Compare bundle/parse time and interaction traces; reject added animation if it delays actions, introduces layout shift, or creates misleading election-state changes. Core behavior must remain usable without browser transition support.

Owner: coordinated Opus/Astra, after security/type priorities. No framework rewrite is recommended.

## 5. Developer efficiency only: evaluate Vite bundled dev mode if traces justify it

Verified date: June23,2026. Vite8.1 introduced experimental bundled dev mode to reduce excessive development-module requests. [Vite announcement](https://vite.dev/blog/announcing-vite8-1). Vite8.0's March12 release is outside the requested window; current Vite8.3.4 already contains the later feature family.

Compatibility/value: optional development workflow test with plugin-react6.1.2; no automatic production-user improvement. Third-party plugin compatibility and experimental status are explicit constraints. Keep this opt-in unless actual developer cold-start/reload measurements improve. Do not replace the production bundling configuration merely to turn on a dev-server feature.

Acceptance: fixed machine, five cold-start/full-refresh/HMR trials with the same dependency cache policy; compare request count and times. Exercise CSS edits, React state-preserving HMR, aliases and error overlay. Require unchanged production artifacts and build/bundle tests. Publisher benchmark gains are not ElectionTracker measurements.

Owner: Astra low-priority developer tooling trial.

## 6. Older stable opportunity: reduce work outside the visible journey before adding new libraries

Not a release inside the requested window. content-visibility was documented August5,2020 and the cited page identifies Baseline availability September15,2025. It can skip offscreen rendering when paired with an appropriate intrinsic-size strategy. [Platform guidance](https://web.dev/articles/content-visibility).

Compatibility/value: Home is already virtualized; do not layer containment blindly onto Virtuoso's measured grid. Profile long nonvirtualized detail/provenance sections instead and trial content-visibility:auto only where rendering is measurable. Keep offscreen accessible content discoverable and validate find-in-page/anchor navigation. Separately, current client/index.html and client/src/index.css both declare the same Google Fonts stylesheet. Inspect the network waterfall and computed fonts before consolidating this duplication; do not claim two network downloads without observing them.

Acceptance: fixed long detail page, before/after main-thread layout/paint trace, scroll stability, find-in-page, anchor links, keyboard focus, print and assistive-technology checks. For fonts, ensure a single intended stylesheet declaration, no fallback flash/layout regression and unchanged computed typography. Existing shared countdown clock and virtualization should be measured and retained unless a specific defect is demonstrated.

Owner: Opus with Astra trace receipts.

## Suggested sequence

Start with measurable SPA journeys and existing release/security obligations. Complete the coordinated Tailwind work. Apply small, measured rendering/font cleanups. Pilot native controls only with cross-browser acceptance. React19.3 and experimental Vite dev mode remain separate reversible candidates, not prerequisites or assumed performance wins.