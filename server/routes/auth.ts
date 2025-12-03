import { Router } from "express";
import { pool } from "../db";
import { z } from "zod";
import { authRequired, createSession, hashPassword, setSessionCookie, verifyPassword, verifySession, revokeSession, signSession, SESSION_COOKIE } from "../auth";
import { storageFactory } from "../storage-factory";
import { storage } from "../storage";
import { dashboardResponseSchema, type DashboardResponse } from "@shared/schema";
import { sendGridNotificationService } from "../services/sendgrid-notification-service";
import { analyticsService } from "../analytics-service";
import nodemailer from "nodemailer";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const router = Router();

const Email = z.string().email();
const Password = z.string().min(8);

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

// Utility functions for analytics tracking
function getDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
  }
  return 'desktop';
}

function getBrowserName(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'other';
}

function getOperatingSystem(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'other';
}

router.post("/register", async (req, res) => {
  console.log("🔵 Registration attempt started:", req.body.email);
  const parse = z.object({ email: Email, password: Password }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request", details: parse.error.issues });
  const { email, password } = parse.data;

  try {
    console.log("🔵 Calling storageFactory.createUser for:", email);
    // Use storage interface for memory mode compatibility
    const user = await storageFactory.createUser(email, password);
    console.log("🔵 User created successfully:", user.user?.id);
    
    // Extract user data from AuthService response structure
    const userData = user.user;
    const userId = userData.id.toString();
    const sessionId = crypto.randomUUID();

  // Start analytics session tracking
  try {
    await analyticsService.startSession({
      sessionId: sessionId,
      userId: userId,
      entryPage: '/register',
      referrerUrl: req.get('Referer'),
      deviceType: getDeviceType(req.get('User-Agent')),
      browserName: getBrowserName(req.get('User-Agent')),
      operatingSystem: getOperatingSystem(req.get('User-Agent')),
      screenResolution: req.headers['x-screen-resolution'] as string,
      country: req.headers['cf-ipcountry'] as string || 'unknown',
      timezone: req.headers['x-timezone'] as string
    });

    // Create default analytics consent for new user
    await analyticsService.createDefaultAnalyticsConsent(userId);

    // Track registration funnel step
    await analyticsService.trackRegistrationFunnel(userId, sessionId, 'register');

    // Track registration event
    await analyticsService.trackUserAction(userId, 'register', {
      sessionId: sessionId,
      pageUrl: req.originalUrl,
      pagePath: req.path,
      pageTitle: 'User Registration',
      targetType: 'user_account',
      targetId: userData.id,
      targetMetadata: { email: email, emailVerified: false }
    });

    console.log(`📊 Analytics tracking started for user ${userId}`);
  } catch (analyticsError) {
    console.error('❌ Analytics tracking failed during registration (registration still successful):', analyticsError);
  }

    // email verify token (optional in dev: console log) - skip during database outages
    try {
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
      const tok = await pool.query(
        `INSERT INTO email_verification_tokens(user_id, expires_at) VALUES($1,$2) RETURNING token`,
        [userData.id, expires]
      );

      if (transporter) {
        const verifyUrl = `${process.env.APP_ORIGIN}/verify-email?token=${tok.rows[0].token}`;
        await transporter.sendMail({
          to: email, from: process.env.EMAIL_FROM || "noreply@electiontracker",
          subject: "Verify your email",
          text: `Verify your email: ${verifyUrl}`
        });
      } else {
        console.log("📧 Email verify token:", tok.rows[0].token);
      }
    } catch (emailVerifyError) {
      console.log("⚠️ Email verification token creation skipped (database unavailable)");
      console.log("📧 User can still use the platform; email verification will be available when database is restored");
    }

    // Create session - fallback to memory-only mode during database outages
    let token;
    try {
      token = await createSession(Number(userData.id), req.get("user-agent") || null, req.ip || null);
    } catch (sessionError) {
      console.log("⚠️ Database session creation failed, using temporary session");
      // Generate temporary JWT token for memory-only mode using proper auth format
      const jti = crypto.randomUUID();
      token = signSession({ uid: Number(userData.id), jti });
    }
  setSessionCookie(res, token);

  // Send welcome email (don't block registration if email fails)
  try {
    const baseUrl = process.env.APP_ORIGIN || 'https://electiontracker.app';
    await sendGridNotificationService.sendWelcomeEmail(
      email,
      {
        firstName: undefined, // Will extract from email or use 'there'
        lastName: undefined,
        email: email
      },
      baseUrl
    );
    console.log(`✅ Welcome email sent to: ${email}`);
  } catch (emailError) {
    console.error('❌ Failed to send welcome email (registration still successful):', emailError);
  }

    res.status(201).json({ user: userData, sessionId: sessionId });
  } catch (error) {
    console.error('❌ Registration failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes('already exists')) {
      return res.status(409).json({ error: 'email_in_use' });
    }
    return res.status(500).json({ error: 'registration_failed', message: 'Registration temporarily unavailable' });
  }
});

router.post("/login", async (req, res) => {
  const parse = z.object({ email: Email, password: Password }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request", details: parse.error.issues });
  const { email, password } = parse.data;

  const q = await pool.query(`SELECT id, password_hash, email, COALESCE(email_verified, false) as email_verified FROM users WHERE email=$1`, [email]);
  if (!q.rowCount) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await verifyPassword(q.rows[0].password_hash, password);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const userId = q.rows[0].id.toString();
  const sessionId = crypto.randomUUID();

  // Enhanced analytics tracking for login
  try {
    // Start new analytics session for login
    await analyticsService.startSession({
      sessionId: sessionId,
      userId: userId,
      entryPage: '/login',
      referrerUrl: req.get('Referer'),
      deviceType: getDeviceType(req.get('User-Agent')),
      browserName: getBrowserName(req.get('User-Agent')),
      operatingSystem: getOperatingSystem(req.get('User-Agent')),
      screenResolution: req.headers['x-screen-resolution'] as string,
      country: req.headers['cf-ipcountry'] as string || 'unknown',
      timezone: req.headers['x-timezone'] as string
    });

    // Track activation funnel - first_login step
    await analyticsService.trackActivationFunnel(userId, sessionId, 'first_login');

    // Track login event
    await analyticsService.trackUserAction(userId, 'login', {
      sessionId: sessionId,
      pageUrl: req.originalUrl,
      pagePath: req.path,
      pageTitle: 'User Login',
      targetType: 'user_session',
      targetId: q.rows[0].id,
      targetMetadata: { 
        email: email, 
        emailVerified: q.rows[0].email_verified,
        loginMethod: 'password',
        isReturningUser: true
      }
    });

    // Calculate and track user engagement score
    await analyticsService.calculateUserEngagementScore(userId, 'daily');

    console.log(`📊 Login analytics tracked for user ${userId}`);
  } catch (analyticsError) {
    console.error('❌ Analytics tracking failed during login (login still successful):', analyticsError);
  }

  const token = await createSession(q.rows[0].id, req.get("user-agent") || null, req.ip || null);
  setSessionCookie(res, token);
  res.json({ 
    user: { 
      id: q.rows[0].id, 
      email: q.rows[0].email, 
      email_verified: q.rows[0].email_verified 
    }, 
    sessionId: sessionId 
  });
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    try {
      const { uid, jti } = verifySession(token as string);
      await revokeSession(uid, jti);
    } catch {}
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", authRequired(), async (req, res) => {
  const uid = (req as any).userId as number;
  
  // Try database first if available
  if (storageFactory.isDatabaseAvailable()) {
    try {
      const q = await pool.query(`SELECT id, email, COALESCE(email_verified, false) as email_verified FROM users WHERE id=$1`, [uid]);
      if (!q.rowCount) return res.status(404).json({ error: "user_not_found" });
      return res.json({ user: q.rows[0] });
    } catch (error) {
      console.log('Database query failed, falling back to memory user data');
    }
  }
  
  // Fallback for memory-only mode: return basic user info from session
  try {
    const user = await storage.getUser(uid.toString());
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        email_verified: false // Default for memory mode
      }
    });
  } catch (error) {
    console.error('Failed to get user from memory storage:', error);
    return res.status(404).json({ error: "user_not_found" });
  }
});

router.get("/dashboard", authRequired(), async (req, res) => {
  // Check database health for user data access
  if (!storageFactory.isDatabaseAvailable()) {
    console.log('Dashboard access blocked: Database unhealthy');
    return res.status(503).json({
      error: 'Dashboard temporarily unavailable',
      message: 'Database is unhealthy - dashboard access is temporarily disabled',
      mode: 'degraded'
    });
  }
  
  const uid = String((req as any).userId);
  
  try {
    // Get user information using storage abstraction
    const user = await storage.getUser(uid);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    
    // Get user's watchlist using storage abstraction
    const watchlistItems = await storage.getUserWatchlist(uid);
    
    // Transform watchlist items to include election details (already joined by storage method)
    const watchlist = watchlistItems.map(item => ({
      id: item.id,
      created_at: item.createdAt?.toISOString() || new Date().toISOString(),
      title: (item as any).title || 'Unknown Election',
      location: (item as any).location || 'Unknown Location',
      date: (item as any).date ? new Date((item as any).date).toISOString() : new Date().toISOString(),
      type: (item as any).type || 'general',
      level: (item as any).level || 'federal',
      subtitle: (item as any).subtitle,
      state: (item as any).state || 'Unknown',
      offices: (item as any).offices || [],
      description: (item as any).description,
      isActive: (item as any).isActive !== false
    }));
    
    // Get upcoming elections for recommendations using storage abstraction
    const allElections = await storage.getElections({
      timeframe: 'upcoming'
    });
    
    // Get candidate counts for each election
    const recommendationsWithCandidates = await Promise.all(
      allElections.slice(0, 5).map(async (election) => {
        const candidates = await storage.getCandidatesByElection(election.id);
        return {
          id: election.id,
          title: election.title,
          location: election.location,
          date: election.date.toISOString(),
          type: election.type,
          level: election.level,
          candidate_count: candidates.length,
          subtitle: election.subtitle,
          state: election.state,
          offices: election.offices || [],
          description: election.description,
          isActive: election.isActive !== false
        };
      })
    );
    
    // Calculate stats using storage methods
    const electionStats = await storage.getElectionStats();
    const savedElectionsCount = watchlistItems.length;
    
    // Calculate days since joining
    const joinDate = user.createdAt ? new Date(user.createdAt) : new Date();
    const daysSinceJoining = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Build response using proper types
    const dashboardResponse: DashboardResponse = {
      user: {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: true, // Default since we don't have this field in User type
        joinedAt: user.createdAt?.toISOString() || new Date().toISOString(),
        daysSinceJoining
      },
      watchlist,
      recommendations: recommendationsWithCandidates,
      stats: {
        savedElections: savedElectionsCount,
        totalUpcomingElections: electionStats.total,
        watchlistActivity: Math.min(watchlistItems.length, 10)
      },
      quickActions: [
        { id: 'browse-elections', label: 'Browse Elections', icon: 'calendar', path: '/' },
        { id: 'view-congress', label: 'View Congress', icon: 'users', path: '/congress' },
        { id: 'manage-watchlist', label: 'Manage Watchlist', icon: 'heart', action: 'scroll-to-watchlist' }
      ]
    };
    
    // Validate response against schema
    const validatedResponse = dashboardResponseSchema.parse(dashboardResponse);
    
    res.json(validatedResponse);
    
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/verify-email", async (req, res) => {
  const token = String(req.body?.token || "");
  if (!token) return res.status(400).json({ error: "bad_request" });
  const q = await pool.query(
    `DELETE FROM email_verification_tokens WHERE token=$1 AND expires_at > now() RETURNING user_id`,
    [token]
  );
  if (!q.rowCount) return res.status(400).json({ error: "invalid_or_expired" });
  await pool.query(`UPDATE users SET email_verified=TRUE WHERE id=$1`, [q.rows[0].user_id]);
  res.json({ ok: true });
});

router.post("/request-password-reset", async (req, res) => {
  const parse = z.object({ email: Email }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request" });
  const { email } = parse.data;

  const u = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
  if (!u.rowCount) return res.json({ ok: true }); // do not leak
  const expires = new Date(Date.now() + 1000 * 60 * 30);
  const tok = await pool.query(
    `INSERT INTO password_reset_tokens(user_id, expires_at) VALUES($1,$2) RETURNING token`, 
    [u.rows[0].id, expires]
  );

  if (transporter) {
    const url = `${process.env.APP_ORIGIN}/reset-password?token=${tok.rows[0].token}`;
    await transporter.sendMail({ 
      to: email, 
      from: process.env.EMAIL_FROM || "noreply@electiontracker",
      subject: "Reset your password", 
      text: `Reset link: ${url}` 
    });
  } else {
    console.log("🔐 Password reset token:", tok.rows[0].token);
  }
  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const parse = z.object({ 
    token: z.string(), 
    password: Password 
  }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "bad_request" });
  const { token, password } = parse.data;

  const q = await pool.query(
    `UPDATE password_reset_tokens SET used=TRUE 
     WHERE token=$1 AND expires_at > now() AND used=FALSE 
     RETURNING user_id`,
    [token]
  );
  if (!q.rowCount) return res.status(400).json({ error: "invalid_or_expired" });
  
  const pw = await hashPassword(password);
  await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [pw, q.rows[0].user_id]);
  res.json({ ok: true });
});

export default router;