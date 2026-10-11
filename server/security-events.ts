import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Security decision telemetry and request correlation (ET-22, blue-green BG-3 / BG-4).
 *
 * Every allow/deny decision on an authentication or authorization boundary is written
 * as ONE single-line JSON event with a fixed field set: actor, action, resource, result,
 * reason, requestId. Events never contain credentials, tokens, request bodies or
 * response bodies. Internal exception text is logged here, correlated by requestId, and
 * never returned to the client (see publicErrorBody).
 */

export type DecisionResult = "allow" | "deny" | "error";

export interface SecurityDecisionInput {
  action: string;            // e.g. "auth.login", "authz.admin", "auth.password_reset"
  result: DecisionResult;
  actor?: string | null;     // user id when known, never an email or token
  resource?: string;         // what was being accessed/changed
  reason?: string;           // short machine-readable reason for deny/error
  details?: Record<string, string | number | boolean | null>; // small scalar context only
}

export interface SecurityDecisionEvent extends SecurityDecisionInput {
  ts: string;
  type: "security_decision";
  requestId: string | null;
  ip: string | null;
  method: string | null;
  path: string | null;
}

type ReqWithId = Request & { requestId?: string };

const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

/** Assigns/propagates X-Request-Id so logs, decisions and error responses correlate. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get("x-request-id");
  const id = incoming && REQUEST_ID_RE.test(incoming) ? incoming : randomUUID();
  (req as ReqWithId).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function getRequestId(req: Request | undefined): string | null {
  return (req as ReqWithId | undefined)?.requestId ?? null;
}

/** Builds the event object; exported so tests can assert the shape without console I/O. */
export function buildSecurityDecision(req: Request | undefined, input: SecurityDecisionInput): SecurityDecisionEvent {
  const path = req?.originalUrl ? req.originalUrl.split("?")[0] : null;
  return {
    ts: new Date().toISOString(),
    type: "security_decision",
    action: input.action,
    result: input.result,
    actor: input.actor ?? null,
    resource: input.resource ?? path ?? undefined,
    reason: input.reason,
    details: input.details,
    requestId: getRequestId(req),
    ip: req?.ip ?? null,
    method: req?.method ?? null,
    path,
  };
}

let sink: (line: string) => void = (line) => console.log(line);

/** Test hook: capture events instead of printing them. */
export function setSecurityEventSink(fn: ((line: string) => void) | null): void {
  sink = fn ?? ((line) => console.log(line));
}

export function recordSecurityDecision(req: Request | undefined, input: SecurityDecisionInput): SecurityDecisionEvent {
  const event = buildSecurityDecision(req, input);
  sink(JSON.stringify(event));
  return event;
}

// ---------------------------------------------------------------------------
// Public error responses (BG-4): bounded status, fixed public message, request id.
// ---------------------------------------------------------------------------

const PUBLIC_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  403: "Forbidden",
  404: "Not found",
  405: "Method not allowed",
  409: "Conflict",
  413: "Payload too large",
  415: "Unsupported media type",
  422: "Unprocessable request",
  429: "Too many requests",
  500: "Internal server error",
  502: "Upstream unavailable",
  503: "Service unavailable",
  504: "Upstream timeout",
};

export interface PublicErrorBody {
  error: string;
  message: string;
  requestId: string | null;
}

/**
 * Maps any thrown value to (status, public body). Only `status`/`statusCode` in 400-599
 * are honoured (never `code`, which carries driver/OS strings); anything else is 500.
 * Internal messages are NEVER copied into the body; a 4xx may expose `publicMessage`
 * if the thrower set one deliberately.
 */
export function publicErrorBody(err: unknown, requestId: string | null): { status: number; body: PublicErrorBody } {
  const e = (err ?? {}) as { status?: unknown; statusCode?: unknown; publicCode?: unknown; publicMessage?: unknown; type?: unknown };
  const raw = Number(e.status ?? e.statusCode);
  const status = Number.isInteger(raw) && raw >= 400 && raw <= 599 ? raw : 500;
  const isClient = status < 500;
  const code = isClient && typeof e.publicCode === "string" && /^[a-z_]{1,40}$/.test(e.publicCode)
    ? e.publicCode
    : isClient && e.type === "entity.parse.failed" ? "invalid_json"
    : isClient && e.type === "entity.too.large" ? "payload_too_large"
    : isClient ? "request_error" : "server_error";
  const message = isClient && typeof e.publicMessage === "string" && e.publicMessage.length <= 200
    ? e.publicMessage
    : PUBLIC_MESSAGES[status] ?? (isClient ? "Request failed" : "Internal server error");
  return { status, body: { error: code, message, requestId } };
}

/** Server-side diagnostic line for the error boundary; correlated, never sent to the client. */
export function internalErrorRecord(err: unknown, req: Request | undefined, status: number): string {
  const e = (err ?? {}) as { name?: unknown; message?: unknown; stack?: unknown };
  return JSON.stringify({
    ts: new Date().toISOString(),
    type: "request_error",
    requestId: getRequestId(req),
    status,
    method: req?.method ?? null,
    path: req?.originalUrl ? req.originalUrl.split("?")[0] : null,
    name: typeof e.name === "string" ? e.name : undefined,
    message: typeof e.message === "string" ? e.message.slice(0, 500) : String(err).slice(0, 500),
  });
}
