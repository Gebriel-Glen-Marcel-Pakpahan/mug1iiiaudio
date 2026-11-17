import fs from "node:fs/promises";
import path from "node:path";
import type { DbShape } from "./types";
import { buildSeedDb } from "./seed";
import { isPostgresConfigured, loadDbFromPostgres, syncMutationToPostgres } from "./postgres";

/**
 * Demo persistence layer.
 *
 * The PRD targets PostgreSQL + Prisma. For the demo build we keep the exact same
 * relational shapes in a JSON document so every flow (cart → checkout → QRIS →
 * webhook → Drive grant → email) runs end-to-end without external services.
 * Swapping to Prisma later means re-implementing this module only.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY: DbShape = {
  users: [],
  albums: [],
  cart: [],
  orders: [],
  payments: [],
  driveLinks: [],
  refunds: [],
  audit: [],
  requests: [],
};

declare global {
  // eslint-disable-next-line no-var
  var __mug1iiiDb: { data: DbShape | null; writing: Promise<void>; queue: Promise<unknown> } | undefined;
}

const g = globalThis as typeof globalThis;

if (!g.__mug1iiiDb) {
  g.__mug1iiiDb = { data: null, writing: Promise.resolve(), queue: Promise.resolve() };
}

const state = g.__mug1iiiDb!;

async function readFromDisk(): Promise<DbShape> {
  if (isPostgresConfigured()) {
    const pgData = await loadDbFromPostgres();
    if (pgData && pgData.albums.length > 0) {
      return pgData;
    }
  }

  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    const merged = { ...EMPTY, ...parsed };
    if (
      !merged.albums.length ||
      merged.albums.some((a) => a.slug === "nocturne-in-copper")
    ) {
      const fresh = buildSeedDb();
      await persist(fresh);
      return fresh;
    }
    return merged;
  } catch {
    const fresh = buildSeedDb();
    await persist(fresh).catch(() => undefined);
    return fresh;
  }
}

async function persist(data: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

/** Serialise every mutation so concurrent route handlers never clobber the file. */
export async function withDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = async () => {
    if (
      !state.data ||
      state.data.albums.some((a) => a.slug === "nocturne-in-copper")
    ) {
      state.data = await readFromDisk();
    }
    const result = await fn(state.data);
    await persist(state.data);
    if (isPostgresConfigured()) {
      await syncMutationToPostgres(state.data);
    }
    return result;
  };
  const next = state.queue.then(run, run);
  state.queue = next.catch(() => undefined);
  return next;
}

/** Read-only accessor — no write-back. */
export async function readDb(): Promise<DbShape> {
  if (
    !state.data ||
    state.data.albums.some((a) => a.slug === "nocturne-in-copper")
  ) {
    state.data = await readFromDisk();
  }
  return state.data;
}

export function resetCache() {
  state.data = null;
}

export const id = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = () => new Date().toISOString();

/** Human-facing order reference, e.g. ORD-20261117-8F3K */
export function makeOrderNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

export function audit(
  db: DbShape,
  entry: {
    actor: string;
    action: string;
    target: string;
    detail: string;
    level?: "info" | "warn" | "critical";
  },
) {
  db.audit.unshift({
    id: id("aud"),
    at: nowIso(),
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    detail: entry.detail,
    level: entry.level ?? "info",
  });
  if (db.audit.length > 500) db.audit.length = 500;
}
