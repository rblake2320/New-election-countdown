# WHY.md - Project Rationale & Fix Intelligence

## Operational Lessons

### [WHY-001] Why git worktrees here get a real `npm ci`, never a `node_modules` junction
- **Date:** 2026-10-11
- **Incident:** a reviewer worktree had `node_modules` junctioned to the main checkout to skip a 5-minute install. Removing that worktree with `rmdir /S /Q` (after `git worktree remove --force` failed) recursed *through* the junction and deleted most of `D:\projects\New-election-countdown\node_modules`; a later `npm ci` launched inside the still-junctioned lane did the same again. Two reinstalls were needed; the first failed with EPERM because a running dev server held `esbuild.exe`.
- **Root cause:** Windows junctions are followed by recursive deletes and by `npm ci`'s own `node_modules` wipe; nothing in the toolchain distinguishes "my" tree from the linked one.
- **Rule:** one real `npm ci` per worktree (`PUPPETEER_SKIP_DOWNLOAD=true`). If a junction ever exists, unlink it with a non-recursive `rmdir <path>` and confirm with `fsutil reparsepoint query` before any `npm ci`, `rm -rf`, or `git worktree remove`. Stop dev servers before reinstalling (they pin `esbuild.exe`).
- **Verification:** `fsutil reparsepoint query <wt>\node_modules` must report "not a reparse point"; `ls node_modules | wc -l` ≈ 680 in every lane.
