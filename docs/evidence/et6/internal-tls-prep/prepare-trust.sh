#!/bin/sh
# Run INSIDE a disposable browser container as root, before browsers start.
# Only the PUBLIC CA must be mounted at /run/et6-ca/root.crt.
set -eu
CA=/run/et6-ca/root.crt
BROWSER_HOME=/home/pwuser
PROFILE=/tmp/et6-firefox-profile
test -s "$CA"
test "$(id -u)" = 0
# Refuse reusing a profile from an earlier run.
test ! -e "$PROFILE"
openssl x509 -in "$CA" -noout -fingerprint -sha256
install -m 0644 "$CA" /usr/local/share/ca-certificates/et6-fixture.crt
update-ca-certificates
# Existing legacy NSS path is recognized by Chromium even after M146.
mkdir -p "$BROWSER_HOME/.pki/nssdb" "$PROFILE"
certutil -N -d "sql:$BROWSER_HOME/.pki/nssdb" --empty-password
certutil -A -d "sql:$BROWSER_HOME/.pki/nssdb" -n et6-fixture -t 'C,,' -i "$CA"
certutil -N -d "sql:$PROFILE" --empty-password
certutil -A -d "sql:$PROFILE" -n et6-fixture -t 'C,,' -i "$CA"
certutil -L -d "sql:$BROWSER_HOME/.pki/nssdb"
certutil -L -d "sql:$PROFILE"
chown -R pwuser:pwuser "$BROWSER_HOME/.pki" "$PROFILE"
printf '%s\n' 'Trust prepared only; browser TLS acceptance remains a separate harness check.'
