import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, userIdFromEmail } from "./auth";
import { readDb, withDb } from "./db";
import { config } from "./config";
import type { User } from "./types";

export async function getSessionUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  const normalizedEmail = email.toLowerCase().trim();
  const db = await readDb();
  let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    const isAdmin = config.auth.adminEmails.includes(normalizedEmail);
    const userId = (session.user as { id?: string }).id || userIdFromEmail(normalizedEmail);
    const role = isAdmin ? "ADMIN" : (((session.user as { role?: string }).role as any) || "BUYER");

    user = await withDb(async (d) => {
      let existing = d.users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!existing) {
        existing = {
          id: userId,
          email: normalizedEmail,
          name: session.user?.name || normalizedEmail.split("@")[0],
          avatarUrl: session.user?.image || null,
          role,
          createdAt: new Date().toISOString(),
        };
        d.users.push(existing);
      }
      return existing;
    });
  }

  return user;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("Silakan masuk dengan akun Google terlebih dahulu.", 401);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError("Akses ditolak — butuh role admin.", 403);
  return user;
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
  console.error("[api]", err);
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Naive in-memory rate limiter for checkout/webhook endpoints (PRD §17.9). */
const g = globalThis as typeof globalThis & { __rl?: Map<string, { count: number; reset: number }> };
if (!g.__rl) g.__rl = new Map();

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const map = g.__rl!;
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.reset < now) {
    map.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
