import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { readDb } from "./db";
import type { User } from "./types";

export async function getSessionUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const db = await readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
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
