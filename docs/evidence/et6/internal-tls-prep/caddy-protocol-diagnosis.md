# Caddy protocol-failure diagnosis — 2026-10-13

Observed run 99008-502c3257: correct-host absent-CA controls returned Node ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR, Chromium ERR_SSL_PROTOCOL_ERROR, Firefox SSL_ERROR_UNKNOWN and WebKit fatal TLS Internal error. These correctly failed the certificate controls; they are not certificate-rejection evidence.

The managed-to-manual reload is a plausible cause, not confirmed without retained proxy logs. CertMagic deduplicates same-hash certificates while retaining the existing certificate object, adding tags. Managed-certificate removal later removes entries still marked managed. See [cache source](https://raw.githubusercontent.com/caddyserver/certmagic/master/cache.go). Thus adding any_tag selectors cannot fix an entry subsequently removed from cache.

Recommended: use `Caddyfile-managed-fallback` from initial startup, substituting the exact run hostname/app name; eliminate the static-leaf reload. Keep the one named site with `tls internal` and add the :443 catchall plus global default_sni/fallback_sni for that same named site. Do not add the wrong alias as an automated site. [Official fallback_sni documentation](https://caddyserver.com/docs/caddyfile/options#fallback-sni) describes selecting a managed certificate for a name when the supplied SNI has no cached match.

Actual pinned Caddy image v2.11.6 `caddy adapt --config /prep/Caddyfile-managed-fallback --adapter caddyfile --pretty` exited 0. Output retained in caddy-managed-adapt.txt. Its automation subjects contain only et6-fixture.internal; the catchall TLS policy selects fallback_sni et6-fixture.internal. No server, fixture, PG or handshake launched here.

Copy the generated public leaf after issuance as before. The existing Node TLS controls require both actual handshakes to present its exact fingerprint; the wrong-name handshake must fail standard hostname validation. This enforces same-leaf identity even though the certificate remains managed. Retain proxy logs before cleanup on any failure. Since fixture lifetime is minutes and local leaf lifetime is 12 hours, renewal is not expected; any unexpected leaf replacement fails the existing fingerprint gate.
