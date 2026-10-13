$ErrorActionPreference = 'Stop'
$reviewRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $reviewRoot
New-Item -ItemType Directory -Force -Path artifacts/parent-route-private | Out-Null
& node_modules/.bin/esbuild.cmd scripts/verify_parent_route_private.mjs --bundle --platform=node --format=esm --packages=external --outfile=artifacts/parent-route-private/private-run.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node artifacts/parent-route-private/private-run.mjs
exit $LASTEXITCODE
