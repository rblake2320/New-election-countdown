#!/usr/bin/env bash
# Outcome check for provider webhook authentication (ET-2).
# Run against a server started with:
#   TWILIO_AUTH_TOKEN=<token> SENDGRID_WEBHOOK_PUBLIC_KEY=<base64 SPKI> APP_ORIGIN=<base>
# Usage: BASE=http://localhost:5055 TWILIO_AUTH_TOKEN=... SG_PRIV_PEM=path/to/key.pem bash scripts/verify-webhook-signatures.sh
BASE="${BASE:-http://localhost:5000}"; fail=0
want(){ printf "%-28s %s (want %s)\n" "$1" "$2" "$3"; [ "$2" = "$3" ] || fail=1; }
TU="$BASE/api/notifications/webhooks/twilio"; SU="$BASE/api/notifications/webhooks/sendgrid"
if [ -n "$TWILIO_AUTH_TOKEN" ]; then
  SIG=$(node -e "const t=require('twilio');console.log(t.getExpectedTwilioSignature(process.env.TWILIO_AUTH_TOKEN,'$TU',{MessageSid:'SMtest123',MessageStatus:'delivered'}))")
  want "twilio valid"  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "X-Twilio-Signature: $SIG" --data-urlencode MessageSid=SMtest123 --data-urlencode MessageStatus=delivered "$TU")" 200
  want "twilio bad"    "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "X-Twilio-Signature: AAAAinvalid=" --data-urlencode MessageSid=SMtest123 --data-urlencode MessageStatus=delivered "$TU")" 403
  want "twilio none"   "$(curl -s -o /dev/null -w '%{http_code}' -X POST --data-urlencode MessageSid=x "$TU")" 403
else
  want "twilio unconfigured" "$(curl -s -o /dev/null -w '%{http_code}' -X POST --data-urlencode MessageSid=x "$TU")" 404
fi
if [ -n "$SG_PRIV_PEM" ]; then
  BODY='[{"sg_message_id":"msg-1","event":"delivered","timestamp":1760000000}]'; TS=$(date +%s)
  SIG=$(node -e "const c=require('crypto');const k=c.createPrivateKey(require('fs').readFileSync(process.env.SG_PRIV_PEM));console.log(c.sign('sha256',Buffer.concat([Buffer.from('$TS'),Buffer.from(process.argv[1])]),{key:k,dsaEncoding:'der'}).toString('base64'))" "$BODY")
  H1="X-Twilio-Email-Event-Webhook-Signature: $SIG"; H2="X-Twilio-Email-Event-Webhook-Timestamp: $TS"
  want "sendgrid valid"    "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "$H1" -H "$H2" -d "$BODY" "$SU")" 200
  want "sendgrid tampered" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "$H1" -H "$H2" -d '[{"sg_message_id":"msg-1","event":"bounce","timestamp":1760000000}]' "$SU")" 403
  want "sendgrid none"     "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$BODY" "$SU")" 403
else
  want "sendgrid unconfigured" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '[]' "$SU")" 404
fi
exit $fail
