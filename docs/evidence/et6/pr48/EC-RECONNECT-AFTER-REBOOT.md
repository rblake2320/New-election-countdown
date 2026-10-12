# ElectionTracker team reconnect after reboot
Owner requested fresh HWND discovery. All pre-reboot HWNDs are historical and MUST NOT be reused as current addresses.

## Stable seats and ownership
- Astra EC: D, infra/CI/production receiving. Handoff: Team/handoffs/Astra-EC-current.md. Current receipt worktree D:/projects/et-wt/astra-b48-receiving; pushed7c8acf4. Batch drill worktree astra-election-night-drill, pushed8fbc575.
- Fabel EC (also written Fable): A, server/routes/results writer. Locate latest A checkpoint and lane-a/et6-results before edits.
- Sol EC: C, data/sources/shared results DTO. Locate latest C checkpoint before edits.
- Opus EC: B, client/design/results display and posting form. Latest reported display commit6b0915d was local, not runtime-cleared; confirm fresh head.

## Reconnect procedure, each seat
1. Read C:/Users/techai/PKA testing/selfconnect/runbooks/first_wake_selfconnect.md. Resume the existing session/worktree; do not create duplicate lane workers.
2. Run `selfconnect windows --json` for fresh window inventory. Match the intended seat title, then independently confirm its current PID, executable, window class and terminal identity. Titles may change; a title alone is insufficient. If ambiguous, stop routing and identify the correct terminal.
3. Guard each newly discovered target with `selfconnect guard --hwnd <NEW_HWND> --expect-pid <NEW_PID> --expect-exe <OBSERVED_EXE> --expect-class <OBSERVED_CLASS> --expect-title "<OBSERVED_TITLE>"`. Read the terminal using `selfconnect read --hwnd <NEW_HWND>` before input. Register the active verified seat per the runbook; use a fresh identity, not a claimed migrated birth identity.
4. Publish a per-seat file Team/handoffs/EC-seat-<Astra|Fabel|Sol|Opus>.json with seat, lane, new HWND, PID, executable, class, title, process-start time, observed-at time, branch/worktree and checkpoint. Old registry rows are history, never proof of current routing. Update the workbook using approved native helper/openpyxl only, preserving other rows.
5. Use scripts/seat_send.py only after guard/read verification; pass the newly verified numeric target HWND. Send a short identity/ownership ACK, retain send-log/readback and require the peer ACK. Missing delivery is not contact success. Revalidate identity immediately before sending because handles can be recycled.
6. Shared task board: Team/tasks/20261011-electiontracker-team-board.md. Jira and GitHub remain the durable task/receipt record. ET6 and PR48 contain latest D receiving findings.

## Resume constraints
Monitor blackouts unresolved. Astra builds/browser automation remain paused until owner confirms display stable; reconnect metadata does not authorize resuming load. Do not auto-launch builds/load tests or change monitor/GPU settings. Shared DB/source apply and deployment HOLD remain. No pre-reboot HWND is embedded here as an executable destination.

This is a prepared restart procedure, not a claim that post-reboot discovery or peer ACKs have happened.
