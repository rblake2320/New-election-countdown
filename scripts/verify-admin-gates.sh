#!/usr/bin/env bash
# Outcome check for ET-2: unauthenticated write/ops routes must be 401, deleted routes 404, public reads 200.
# Usage: BASE=http://localhost:5055 bash scripts/verify-admin-gates.sh
BASE="${BASE:-http://localhost:5000}"; fail=0
chk(){ m=$1; p=$2; want=$3; got=$(curl -s -o /dev/null -w "%{http_code}" -X "$m" -H "Content-Type: application/json" -d '{}' "$BASE$p"); printf "%-6s %-45s %s (want %s)\n" "$m" "$p" "$got" "$want"; [ "$got" = "$want" ] || fail=1; }
chk POST /api/elections/1/results 401; chk POST /api/elections/1/update-results 401
chk GET  /api/test/run-all 404; chk POST /api/sync/elections/all 404; chk POST /api/setup/michigan-primary 404
chk POST /api/admin/data-cleanup 401; chk POST /api/bot/run 401; chk POST /api/secrets-rotation/rotate 401
chk POST /api/load-testing/start 401; chk POST /api/failover/trigger 401; chk POST /api/environment-bootstrap/bootstrap 401
chk POST /api/scrape/election 401; chk GET /api/elections 200
# ET-22 security review (OR-02/03/04/05): monitoring + security management and manual notifications are never anonymous
chk GET /api/monitoring/status 401; chk POST /api/monitoring/start 401; chk POST /api/monitoring/stop 401; chk POST /api/monitoring/targets 401
chk GET /api/monitoring/metrics 401; chk POST /api/monitoring/alerts/clear 401
chk GET /api/security/analytics 401; chk GET /api/security/blocked-ips 401; chk POST /api/security/block-ip 401; chk GET /api/security/health 401
chk POST /api/notifications/send 401
acao=$(curl -s -D - -o /dev/null -H "Origin: https://evil.example" "$BASE/api/health" | grep -ci "access-control-allow-origin"); [ "$acao" = "0" ] && echo "CORS evil origin: no ACAO (ok)" || { echo "CORS evil origin: ACAO PRESENT (FAIL)"; fail=1; }
exit $fail
