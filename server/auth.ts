import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { getRequiredSecret } from "./config/secrets";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "et.sid";
const JWT_SECRET = getRequiredSecret("JWT_SECRET");
const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "720", 10); // 30 days
const SECURE = process.env.NODE_ENV === "production";


export function signSession(payload: { uid: string; jti: string }, hours = SESSION_TTL_HOURS) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${hours}h` });
}

export function verifySession(token: string) {
  return jwt.verify(token, JWT_SECRET) as { uid: string; jti: string; iat: number; exp: number };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    maxAge: SESSION_TTL_HOURS * 3600 * 1000,
    path: "/"
  });
}

export async function createSession(userId: string, ua: string | null, ip: string | null) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
  // auth_sessions, NOT user_sessions (that's the analytics table)
  await pool.query(
    `INSERT INTO auth_sessions(user_id, jti, user_agent, ip, expires_at) VALUES($1,$2,$3,$4,$5)`,
    [userId, jti, ua, ip, expiresAt]
  );
  const token = signSession({ uid: userId, jti });
  return token;
}

export async function revokeSession(userId: string, jti: string) {
  await pool.query(`UPDATE auth_sessions SET revoked = TRUE WHERE user_id=$1 AND jti=$2`, [userId, jti]);
}

export function authRequired() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE];
      if (!token) return res.status(401).json({ error: "unauthorized" });
      
      // Verify JWT token signature and extract payload
      const { uid, jti } = verifySession(token);
      
      // Try database validation first if available
      try {
        const q = await pool.query(
          `SELECT 1 FROM auth_sessions WHERE user_id=$1 AND jti=$2 AND revoked=FALSE AND now() < expires_at`,
          [uid, jti]
        );
        
        // If database check succeeds, proceed with normal validation
        if (q.rowCount) {
          (req as any).userId = uid;
          (req as any).jti = jti;
          return next();
        }
      } catch (dbError) {
        // Fail closed: without the session table we cannot honour revocation.
        console.error('Session store unavailable; refusing authenticated request');
        return res.status(503).json({ error: "session_store_unavailable" });
      }
      return res.status(401).json({ error: "unauthorized" });
    } catch (jwtError) {
      return res.status(401).json({ error: "unauthorized" });
    }
  };
}

export async function hashPassword(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, pw: string) {
  return argon2.verify(hash, pw);
}

export function makeApiKey() {
  const prefix = "camp_" + Date.now();
  const secret = nanoid(28);
  return { raw: `${prefix}_${secret}`, prefix };
}

// ── App-level auth wiring (JWT cookie sessions) ──

import type { Express, RequestHandler } from "express";

export async function setupAuth(_app: Express) {
  // Auth is handled via JWT cookies — no OIDC setup needed
}

// Maps req.user.claims.sub → req.userId for protected routes
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const middleware = authRequired();
  return middleware(req, res, (err?: any) => {
    if (err) return next(err);
    // Expose req.user.claims.sub for routes that read the OIDC-style shape
    req.user = { claims: { sub: String(req.userId) } };
    next();
  });
};