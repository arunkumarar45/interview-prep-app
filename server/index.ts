// index.ts — Express server entry point
// Production hardening: environment-driven CORS, rate limiting, request IDs,
// structured logging, graceful shutdown.

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "./middleware/auth";
import { supabaseAdmin } from "./lib/supabase";
import quizRouter from "./routes/quiz";
import quizPdfRouter from "./routes/quiz-pdf";
import interviewRouter from "./routes/interview";
import projectRouter from "./routes/project";
import resumeRouter from "./routes/resume";
import aiCredentialsRouter from "./routes/aiCredentials";

// ─── Startup guard ────────────────────────────────────────────────────────────
// Fail fast with a clear message rather than cryptic runtime errors later.

const REQUIRED_ENV = [
  "GEMINI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CREDENTIAL_ENCRYPTION_KEY",
] as const;

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    "\n❌  Missing required environment variables:\n" +
      missing.map((k) => `   • ${k}`).join("\n") +
      "\n\n   Copy server/.env.example → server/.env and fill in the values.\n"
  );
  process.exit(1);
}

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ─── Security headers ─────────────────────────────────────────────────────────

app.use(helmet());

// ─── CORS — environment-driven (never hardcode origins) ──────────────────────
// CORS_ORIGINS is a comma-separated list of allowed origins.
// Example: http://localhost:5173,https://interviewprep.example.com

const rawOrigins = process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:4173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, mobile, curl in dev)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Request ID middleware ────────────────────────────────────────────────────
// Adds a unique requestId to every request; included in all log lines and
// error responses so engineers can trace a single request end-to-end.

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  // Echo requestId back so clients and APM tools can correlate errors
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// ─── Structured request logger ────────────────────────────────────────────────
// Logs method, path, status, duration, and requestId for every response.
// NEVER logs Authorization headers, passwords, API keys, or JWT bodies.

app.use((req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(
      JSON.stringify({
        level,
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        timestamp: new Date().toISOString(),
        userAgent: req.get("user-agent")?.slice(0, 100),
      })
    );
  });
  next();
});

// ─── JSON body parser ─────────────────────────────────────────────────────────

app.use(express.json({ limit: "2mb" }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Different limits for AI (expensive) vs. regular API calls.
// All limits are server-side — never rely on client-side counters.

// General API: 200 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Use userId if authenticated, otherwise fall back to IP
    return (req as Request & { userId?: string }).userId ?? req.ip ?? "unknown";
  },
});

// AI generation: 20 requests per 15 minutes per IP (protects Gemini quota)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: {
    error: {
      code: "AI_RATE_LIMITED",
      message: "AI generation rate limit reached. Please wait a few minutes.",
    },
  },
  keyGenerator: (req) => {
    return (req as Request & { userId?: string }).userId ?? req.ip ?? "unknown";
  },
});

app.use("/api", generalLimiter);

// ─── Health checks (no auth required) ────────────────────────────────────────
// /health — standard cloud liveness check (Render, Railway, Fly.io, AWS ALB)
// /api/health — API liveness check

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Route mounts ─────────────────────────────────────────────────────────────

// AI endpoints get tighter rate limit (applied AFTER requireAuth so userId is available)
app.use("/api/quiz/pdf", requireAuth, aiLimiter, quizPdfRouter);
app.use("/api/quiz", requireAuth, quizRouter);
app.use("/api/interview", requireAuth, aiLimiter, interviewRouter);
app.use("/api/project", requireAuth, aiLimiter, projectRouter);
app.use("/api/resume", requireAuth, resumeRouter);
// BYOK credential management (has its own internal rate limiter)
app.use("/api/ai", requireAuth, aiCredentialsRouter);

// ─── DELETE /api/account ──────────────────────────────────────────────────────
// GDPR: Hard-deletes the authenticated user and all their data.
// Deletes records across all user-owned tables as defense-in-depth, then deletes auth user.
// Rate-limited to 3 requests/hour per user to prevent abuse.

const accountDeleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { error: { code: "RATE_LIMITED", message: "Too many account deletion requests." } },
  keyGenerator: (req) => (req as Request & { userId?: string }).userId ?? req.ip ?? "unknown",
});

app.delete(
  "/api/account",
  requireAuth,
  accountDeleteLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      // 1. Explicitly delete user rows across all application tables as defense-in-depth
      await Promise.allSettled([
        supabaseAdmin.from("quiz_attempts").delete().eq("user_id", userId),
        supabaseAdmin.from("interview_sessions").delete().eq("user_id", userId),
        supabaseAdmin.from("resumes").delete().eq("user_id", userId),
        supabaseAdmin.from("competency_scores").delete().eq("user_id", userId),
        supabaseAdmin.from("misconceptions").delete().eq("user_id", userId),
        supabaseAdmin.from("ai_credentials").delete().eq("user_id", userId),
        supabaseAdmin.from("ai_usage").delete().eq("user_id", userId),
        supabaseAdmin.from("learning_events").delete().eq("user_id", userId),
      ]);

      // 2. deleteUser removes auth.users row
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error(JSON.stringify({
          level: "ERROR",
          route: "DELETE /api/account",
          message: error.message.slice(0, 200),
          requestId: req.requestId,
        }));
        res.status(500).json({ error: "Failed to delete account. Your account has not been deleted." });
        return;
      }

      console.log(JSON.stringify({
        level: "INFO",
        route: "DELETE /api/account",
        message: "Account deleted",
        requestId: req.requestId,
      }));

      res.status(204).send();
    } catch (err) {
      console.error(JSON.stringify({
        level: "ERROR",
        route: "DELETE /api/account",
        message: (err as Error).message?.slice(0, 200),
        requestId: req.requestId,
      }));
      res.status(500).json({ error: "Failed to delete account. Your account has not been deleted." });
    }
  }
);


// Converts unhandled errors to clean JSON responses.
// NEVER exposes stack traces or internal details in production.

app.use(
  (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    // Log with requestId for traceability
    console.error(
      JSON.stringify({
        level: "ERROR",
        requestId: req.requestId,
        message: err.message,
        // Stack only logged server-side, never sent to client
        stack: err.stack?.split("\n").slice(0, 5).join(" | "),
        timestamp: new Date().toISOString(),
      })
    );

    // Determine status from error type
    const status = (err as Error & { statusCode?: number }).statusCode ?? 500;

    res.status(status).json({
      error: {
        code: "INTERNAL_ERROR",
        message:
          status >= 500
            ? "An unexpected error occurred. Please try again."
            : err.message,
        requestId: req.requestId,
      },
    });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "INFO",
      message: "InterviewPrep API server started",
      port: PORT,
      corsOrigins: allowedOrigins,
      timestamp: new Date().toISOString(),
    })
  );
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// On SIGTERM or SIGINT: stop accepting new requests, finish in-flight
// requests, then exit cleanly. This is required for zero-downtime deploys.

function gracefulShutdown(signal: string) {
  console.log(
    JSON.stringify({
      level: "INFO",
      message: `${signal} received — graceful shutdown initiated`,
      timestamp: new Date().toISOString(),
    })
  );

  server.close((err) => {
    if (err) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          message: "Error during graceful shutdown",
          error: err.message,
        })
      );
      process.exit(1);
    }
    console.log(
      JSON.stringify({
        level: "INFO",
        message: "Server closed — all connections drained",
      })
    );
    process.exit(0);
  });

  // Force-exit after 30 seconds if connections haven't drained
  setTimeout(() => {
    console.error(
      JSON.stringify({
        level: "ERROR",
        message: "Force-exiting after shutdown timeout",
      })
    );
    process.exit(1);
  }, 30_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
