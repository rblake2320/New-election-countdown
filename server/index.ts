import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalWriteGuard, healthAwareErrorHandler } from "./middleware/health-guard";

const app = express();

// Apply security and optimization middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors());

// Essential security middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS configuration
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5000',
    'https://localhost:5000'
  ];
  
  if (process.env.REPLIT_DOMAINS) {
    const replitDomains = process.env.REPLIT_DOMAINS.split(',');
    replitDomains.forEach(domain => {
      allowedOrigins.push(`https://${domain.trim()}`);
    });
  }
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Global health guard middleware - CRITICAL: Apply before all API routes
// Blocks ALL write operations when database is unhealthy
app.use("/api", globalWriteGuard);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
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
  
  // Graceful shutdown handler for results ingestion service
  const shutdownHandler = () => {
    log("🛑 Shutting down gracefully...");
    if (resultsIngestionServiceInstance) {
      resultsIngestionServiceInstance.stopPolling();
      log("✅ Results ingestion service stopped");
    }
  };
  
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
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const code = Number(err?.status || err?.code || 500);
    res.status(Number.isFinite(code) ? code : 500).json({
      error: "server_error",
      message: err?.message ?? "Unhandled error",
    });
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
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
