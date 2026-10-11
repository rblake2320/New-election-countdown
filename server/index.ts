import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from "compression";
import { securityHeaders } from "./security-middleware";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalWriteGuard, healthAwareErrorHandler } from "./middleware/health-guard";
import { createGracefulShutdown } from './graceful-shutdown';
import { pool } from './db';
import { stopStorageBackground } from './storage';
import { requestIdMiddleware, publicErrorBody, internalErrorRecord, getRequestId } from "./security-events";

const app = express();

// Behind nginx/Hostinger proxy: first hop is trusted so req.ip, rate limits
// and secure cookies key off the real client address.
app.set("trust proxy", 1);

// Request correlation id (BG-3/BG-4): first middleware so body-parser and security
// rejections already carry it; propagated or generated, echoed as X-Request-Id, present
// on every access-log line, security decision and error response.
app.use(requestIdMiddleware);

// One helmet instance (CSP on) — see security-middleware.ts
app.use(securityHeaders);
app.use(compression());

// CORS: explicit allow-list. APP_ORIGIN / APP_URL (comma-separated) plus
// localhost in non-production. Credentials only for listed origins.
const allowedOrigins = new Set(
  [process.env.APP_ORIGIN, process.env.APP_URL]
    .filter(Boolean)
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
const isDev = process.env.NODE_ENV !== "production";
const corsOptions: cors.CorsOptions = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin / curl
    if (allowedOrigins.has(origin)) return cb(null, true);
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(null, false);
  },
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// rawBody is needed to verify provider webhook signatures (server/webhook-verify.ts)
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Global health guard middleware - CRITICAL: Apply before all API routes
// Blocks ALL write operations when database is unhealthy
app.use("/api", globalWriteGuard);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  // Method, path, status, duration and request id only: response bodies (user objects,
  // session details) must not be written to stdout/log aggregators.
  res.on("finish", () => {
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms rid=${getRequestId(req)}`);
    }
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Start automated results ingestion service for live election tracking
  let resultsIngestionServiceInstance: any = null;
  try {
    const { resultsIngestionService } = await import("./results-ingestion-service");
    resultsIngestionServiceInstance = resultsIngestionService;
    await resultsIngestionService.startPolling(30); // Poll every 30 seconds
    log("✅ Live results ingestion service started (30s polling)");
  } catch (error: any) {
    log(`⚠️  Results ingestion service failed to start: ${error.message}`);
  }
  
  const { shutdown: shutdownHandler } = createGracefulShutdown({
    server,
    stopBackground: async () => {
      await Promise.all([
        resultsIngestionServiceInstance?.stopPolling(),
        stopStorageBackground(),
      ]);
    },
    closeDatabase: () => pool.end(),
    exit: code => process.exit(code),
    log,
  });
  
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  // Seed database on first run
  try {
    const { seedDatabase } = await import("./seed-data.ts");
    await seedDatabase();
    log("✅ Database seeded successfully");
  } catch (error: any) {
    log(`⚠️  Failed to seed database: ${error.message}`);
  }

  // Add 404 handler for unknown API routes
  app.use("/api", (_req, res) => {
    return res.status(404).json({ error: "not_found", path: "api" });
  });

  // Health-aware error handler - catches and downgrades DB errors
  app.use(healthAwareErrorHandler);

  // Global error handler
  // BG-4: public errors carry a bounded status, a fixed public message and the request
  // id; the internal exception text stays in the server log under the same id.
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = publicErrorBody(err, getRequestId(req));
    console.error(internalErrorRecord(err, req, status));
    if (res.headersSent) return;
    res.status(status).json(body);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT ?? "5000", 10);
  // 0.0.0.0 for containers/production; localhost binding for Windows dev
  // (binding 0.0.0.0 raises ENOTSUP under some Windows socket layers)
  const host = process.env.HOST ?? (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0");
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
