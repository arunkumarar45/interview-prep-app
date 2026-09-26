// middleware/auth.ts
// Verifies a Supabase JWT passed as "Authorization: Bearer <token>".
// Attaches req.userId (UUID string) on success, returns 401 on failure.
// Uses the service-role client so it can call auth.getUser() without RLS.

import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

// Extend the Express Request type so downstream route handlers can read userId
// without casting.
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = user.id;
  next();
}
