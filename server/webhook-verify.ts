/**
 * Provider webhook authentication.
 *
 * Both middlewares fail closed:
 *   - provider not configured  -> 404 (the endpoint does not exist for this deployment)
 *   - missing / bad signature  -> 403
 *
 * Twilio: HMAC-SHA1 over the full public URL + sorted POST params, compared with
 *         the X-Twilio-Signature header (twilio.validateRequest).
 * SendGrid Event Webhook: ECDSA P-256 over `timestamp + rawBody`, DER signature in
 *         X-Twilio-Email-Event-Webhook-Signature, base64 SPKI public key from the
 *         SendGrid dashboard (SENDGRID_WEBHOOK_PUBLIC_KEY). Needs req.rawBody,
 *         captured by express.json({ verify }) in server/index.ts.
 */
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import twilio from "twilio";

function publicUrl(req: Request): string {
  const origin = (process.env.APP_ORIGIN || process.env.APP_URL || "").split(",")[0].trim().replace(/\/$/, "");
  if (origin) return origin + req.originalUrl;
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}

export function verifyTwilioWebhook(req: Request, res: Response, next: NextFunction) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return res.status(404).json({ error: "not_found" });
  const signature = req.get("X-Twilio-Signature");
  if (!signature) return res.status(403).json({ error: "missing_signature" });
  const ok = twilio.validateRequest(authToken, signature, publicUrl(req), (req.body ?? {}) as Record<string, string>);
  if (!ok) {
    console.warn(`[webhook] Twilio signature rejected for ${req.originalUrl}`);
    return res.status(403).json({ error: "invalid_signature" });
  }
  return next();
}

export function verifySendGridWebhook(req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) {
  const pub = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  if (!pub) return res.status(404).json({ error: "not_found" });
  const signature = req.get("X-Twilio-Email-Event-Webhook-Signature");
  const timestamp = req.get("X-Twilio-Email-Event-Webhook-Timestamp");
  if (!signature || !timestamp || !req.rawBody) return res.status(403).json({ error: "missing_signature" });
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(pub, "base64"), format: "der", type: "spki" });
    const payload = Buffer.concat([Buffer.from(timestamp, "utf8"), req.rawBody]);
    const ok = crypto.verify("sha256", payload, { key, dsaEncoding: "der" }, Buffer.from(signature, "base64"));
    if (!ok) {
      console.warn(`[webhook] SendGrid signature rejected for ${req.originalUrl}`);
      return res.status(403).json({ error: "invalid_signature" });
    }
    return next();
  } catch (err) {
    console.warn(`[webhook] SendGrid verification error: ${err instanceof Error ? err.message : String(err)}`);
    return res.status(403).json({ error: "invalid_signature" });
  }
}
