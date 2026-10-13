$ErrorActionPreference='Stop'
$sourceReviewRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $sourceReviewRoot
& node scripts/test_source_gap_provenance_sd.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/prepare_source_gap_sd.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/inspect_source_gap_sd.mjs --bundle --platform=node --format=esm --packages=external --outfile=artifacts/source-gap-private-sd/read-only-plan.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node artifacts/source-gap-private-sd/read-only-plan.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/probe_source_gap_guarded_sd.mjs --bundle --platform=node --format=esm --packages=external --outfile=artifacts/source-gap-private-sd/guarded-lock-green.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node artifacts/source-gap-private-sd/guarded-lock-green.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/verify_source_gap_full_private_sd.mjs --bundle --platform=node --format=esm --packages=external --outfile=artifacts/source-gap-private-sd/full-private-gate.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node artifacts/source-gap-private-sd/full-private-gate.mjs --private-apply-repeat-rollback
exit $LASTEXITCODE
