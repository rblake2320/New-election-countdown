param([ValidatePattern('^[a-f0-9]{40}$|^$')][string]$ReviewedRuntimeHead='')
$ErrorActionPreference='Stop'
$sourceReviewRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $sourceReviewRoot
if (-not $ReviewedRuntimeHead) {
 & node scripts/test_source_gap_provenance_sd.mjs
 if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
$sourceReviewArgs=@()
$sourceReviewOut='artifacts/source-gap-private-sd'
if ($ReviewedRuntimeHead) {
 $sourceReviewArgs=@('--review-runtime-head='+$ReviewedRuntimeHead)
 $sourceReviewOut+='/runtime-repair-'+$ReviewedRuntimeHead.Substring(0,8)
 New-Item -ItemType Directory -Force -Path $sourceReviewOut | Out-Null
}
& node scripts/prepare_source_gap_sd.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/inspect_source_gap_sd.mjs --bundle --platform=node --format=esm --packages=external ('--outfile='+$sourceReviewOut+'/read-only-plan.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node ($sourceReviewOut+'/read-only-plan.mjs') @sourceReviewArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/probe_source_gap_guarded_sd.mjs --bundle --platform=node --format=esm --packages=external ('--outfile='+$sourceReviewOut+'/guarded-lock-green.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node ($sourceReviewOut+'/guarded-lock-green.mjs') @sourceReviewArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node_modules/.bin/esbuild.cmd scripts/verify_source_gap_full_private_sd.mjs --bundle --platform=node --format=esm --packages=external ('--outfile='+$sourceReviewOut+'/full-private-gate.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($ReviewedRuntimeHead) {
 & node ($sourceReviewOut+'/guarded-lock-green.mjs') --rollback-new @sourceReviewArgs
 if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& node ($sourceReviewOut+'/full-private-gate.mjs') --private-apply-repeat-rollback @sourceReviewArgs
exit $LASTEXITCODE
