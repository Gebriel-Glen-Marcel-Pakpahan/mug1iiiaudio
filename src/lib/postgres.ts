import { Pool } from "pg";
import type { Album, AlbumRequest, AuditEntry, DbShape, DriveLink, Order, Payment, Refund, User } from "./types";

let pool: Pool | null = null;
let schemaInitialized = false;

export function isPostgresConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL,
  );
}

export function getPool(): Pool | null {
  if (!isPostgresConfigured()) return null;
  if (!pool) {
    const conn = (
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.SUPABASE_DATABASE_URL
    )!.trim();
    pool = new Pool({
      connectionString: conn,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: conn.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Automatically creates all tables and initial seed data if not yet present in PostgreSQL.
 */
export async function ensurePostgresSchema(p: Pool): Promise<void> {
  if (schemaInitialized) return;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        password_hash VARCHAR(255),
        role VARCHAR(32) NOT NULL DEFAULT 'BUYER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS albums (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        genre VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        cover_palette JSONB NOT NULL,
        cover_mark VARCHAR(64) NOT NULL,
        price INTEGER NOT NULL,
        format VARCHAR(32) NOT NULL DEFAULT 'FLAC',
        sample_rate VARCHAR(64) NOT NULL,
        bit_depth VARCHAR(32) NOT NULL,
        total_size_mb INTEGER NOT NULL,
        track_count INTEGER NOT NULL,
        total_duration VARCHAR(32) NOT NULL,
        tracklist JSONB NOT NULL,
        preview_url TEXT,
        gdrive_folder_id VARCHAR(128) NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        year INTEGER NOT NULL,
        label VARCHAR(255) NOT NULL,
        catalogue_no VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_album_cart UNIQUE (user_id, album_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount INTEGER NOT NULL,
        tax_amount INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        access_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        price_snapshot INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        gateway VARCHAR(64) NOT NULL DEFAULT 'midtrans',
        gateway_ref VARCHAR(128),
        qr_string TEXT,
        amount INTEGER NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        raw_payload JSONB,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS drive_links (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        folder_id VARCHAR(128) NOT NULL,
        permission_id VARCHAR(128),
        link_url TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS refunds (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by VARCHAR(255),
        resolution_note TEXT
      );

      CREATE TABLE IF NOT EXISTS album_requests (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255) NOT NULL,
        user_contact VARCHAR(255),
        album_title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        year INTEGER,
        format_preference VARCHAR(64),
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        admin_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target VARCHAR(255) NOT NULL,
        detail TEXT NOT NULL,
        level VARCHAR(32) NOT NULL DEFAULT 'info'
      );
    `);

    // Check if albums need initial seed
    const countRes = await p.query(`SELECT count(*)::int as c FROM albums`);
    if (countRes.rows[0]?.c === 0) {
      const { buildSeedDb } = await import("./seed");
      const seed = buildSeedDb();
      for (const a of seed.albums) {
        await p.query(
          `INSERT INTO albums (
            id, slug, title, artist, genre, description, cover_palette, cover_mark,
            price, format, sample_rate, bit_depth, total_size_mb, track_count,
            total_duration, tracklist, preview_url, gdrive_folder_id, is_published,
            featured, year, label, catalogue_no, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
          ) ON CONFLICT (id) DO NOTHING`,
          [
            a.id,
            a.slug,
            a.title,
            a.artist,
            a.genre,
            a.description,
            JSON.stringify(a.coverPalette),
            a.coverMark,
            a.price,
            a.format,
            a.sampleRate,
            a.bitDepth,
            a.totalSizeMb,
            a.trackCount,
            a.totalDuration,
            JSON.stringify(a.tracklist),
            a.previewUrl || null,
            a.gdriveFolderId,
            a.isPublished ?? true,
            a.featured ?? false,
            a.year,
            a.label,
            a.catalogueNo,
            a.createdAt,
          ],
        );
      }
      for (const u of seed.users) {
        await p.query(
          `INSERT INTO users (id, email, name, avatar_url, role, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.email, u.name, u.avatarUrl || null, u.role, u.passwordHash || null, u.createdAt],
        );
      }
    }

    schemaInitialized = true;
  } catch (err) {
    console.error("[postgres] ensurePostgresSchema error:", err);
  }
}

/**
 * Loads the complete database snapshot from PostgreSQL relational tables into DbShape.
 */
export async function loadDbFromPostgres(): Promise<DbShape | null> {
  const p = getPool();
  if (!p) return null;

  try {
    await ensurePostgresSchema(p);

    const [
      usersRes,
      albumsRes,
      ordersRes,
      itemsRes,
      paymentsRes,
      driveRes,
      refundsRes,
      requestsRes,
      auditRes,
      cartRes,
    ] = await Promise.all([
      p.query(`SELECT id, email, name, avatar_url as "avatarUrl", password_hash as "passwordHash", role, created_at as "createdAt" FROM users`),
      p.query(`SELECT * FROM albums ORDER BY created_at DESC`),
      p.query(`SELECT id, order_number as "orderNumber", user_id as "userId", total_amount as "totalAmount", tax_amount as "taxAmount", status, payment_status as "paymentStatus", access_status as "accessStatus", created_at as "createdAt", paid_at as "paidAt" FROM orders`),
      p.query(`SELECT id, order_id as "orderId", album_id as "albumId", price_snapshot as "priceSnapshot" FROM order_items`),
      p.query(`SELECT id, order_id as "orderId", gateway, gateway_ref as "gatewayRef", qr_string as "qrString", amount, status, raw_payload as "rawPayload", verified_at as "verifiedAt", created_at as "createdAt", expires_at as "expiresAt" FROM payments`),
      p.query(`SELECT id, order_id as "orderId", album_id as "albumId", folder_id as "folderId", permission_id as "permissionId", link_url as "linkUrl", is_active as "isActive", created_at as "createdAt", revoked_at as "revokedAt" FROM drive_links`),
      p.query(`SELECT id, order_id as "orderId", reason, status, requested_at as "requestedAt", resolved_at as "resolvedAt", resolved_by as "resolvedBy", resolution_note as "resolutionNote" FROM refunds`),
      p.query(`SELECT id, user_id as "userId", user_email as "userEmail", user_contact as "userContact", album_title as "albumTitle", artist, year, format_preference as "formatPreference", notes, status, admin_note as "adminNote", created_at as "createdAt", updated_at as "updatedAt" FROM album_requests ORDER BY created_at DESC`),
      p.query(`SELECT id, at, actor, action, target, detail, level FROM audit_logs ORDER BY at DESC LIMIT 500`),
      p.query(`SELECT id, user_id as "userId", album_id as "albumId", added_at as "addedAt" FROM cart_items`),
    ]);

    const itemsMap = new Map<string, typeof itemsRes.rows>();
    for (const item of itemsRes.rows) {
      if (!itemsMap.has(item.orderId)) itemsMap.set(item.orderId, []);
      itemsMap.get(item.orderId)!.push(item);
    }

    const orders: Order[] = ordersRes.rows.map((o) => ({
      ...o,
      items: itemsMap.get(o.id) || [],
    }));

    const albums: Album[] = albumsRes.rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      artist: a.artist,
      genre: a.genre,
      description: a.description,
      coverPalette: a.cover_palette,
      coverMark: a.cover_mark,
      price: a.price,
      format: a.format,
      sampleRate: a.sample_rate,
      bitDepth: a.bit_depth,
      totalSizeMb: a.total_size_mb,
      trackCount: a.track_count,
      totalDuration: a.total_duration,
      tracklist: a.tracklist,
      previewUrl: a.preview_url,
      gdriveFolderId: a.gdrive_folder_id,
      isPublished: a.is_published,
      featured: a.featured,
      year: a.year,
      label: a.label,
      catalogueNo: a.catalogue_no,
      createdAt: a.created_at,
    }));

    return {
      users: usersRes.rows as User[],
      albums,
      cart: cartRes.rows,
      orders,
      payments: paymentsRes.rows as Payment[],
      driveLinks: driveRes.rows as DriveLink[],
      refunds: refundsRes.rows as Refund[],
      audit: auditRes.rows as AuditEntry[],
      requests: requestsRes.rows as AlbumRequest[],
    };
  } catch (err) {
    console.error("Error loading DB from Postgres:", err);
    return null;
  }
}

/**
 * Persists mutations back into PostgreSQL tables.
 */
export async function syncMutationToPostgres(db: DbShape): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await ensurePostgresSchema(p);

    // 0. Sync users
    for (const u of db.users) {
      await p.query(
        `INSERT INTO users (id, email, name, avatar_url, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
           role = EXCLUDED.role`,
        [u.id, u.email, u.name || null, u.avatarUrl || null, u.passwordHash || null, u.role, u.createdAt],
      );
    }

    // 1. Sync orders
    for (const o of db.orders) {
      await p.query(
        `INSERT INTO orders (id, order_number, user_id, total_amount, tax_amount, status, payment_status, access_status, created_at, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           payment_status = EXCLUDED.payment_status,
           access_status = EXCLUDED.access_status,
           paid_at = EXCLUDED.paid_at`,
        [o.id, o.orderNumber, o.userId, o.totalAmount, o.taxAmount || 0, o.status, o.paymentStatus, o.accessStatus, o.createdAt, o.paidAt || null],
      );

      for (const item of o.items) {
        await p.query(
          `INSERT INTO order_items (id, order_id, album_id, price_snapshot)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, o.id, item.albumId, item.priceSnapshot],
        );
      }
    }

    // 2. Sync payments
    for (const pay of db.payments) {
      await p.query(
        `INSERT INTO payments (id, order_id, gateway, gateway_ref, qr_string, amount, status, raw_payload, verified_at, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           verified_at = EXCLUDED.verified_at`,
        [pay.id, pay.orderId, pay.gateway, pay.gatewayRef || null, pay.qrString || null, pay.amount, pay.status, pay.rawPayload ? JSON.stringify(pay.rawPayload) : null, pay.verifiedAt || null, pay.createdAt, pay.expiresAt || null],
      );
    }

    // 3. Sync drive links
    for (const d of db.driveLinks) {
      await p.query(
        `INSERT INTO drive_links (id, order_id, album_id, folder_id, permission_id, link_url, is_active, created_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           is_active = EXCLUDED.is_active,
           revoked_at = EXCLUDED.revoked_at`,
        [d.id, d.orderId, d.albumId, d.folderId, d.permissionId, d.linkUrl, d.isActive, d.createdAt, d.revokedAt || null],
      );
    }

    // 4. Sync requests
    for (const r of db.requests || []) {
      await p.query(
        `INSERT INTO album_requests (id, user_id, user_email, user_contact, album_title, artist, year, format_preference, notes, status, admin_note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           admin_note = EXCLUDED.admin_note,
           updated_at = EXCLUDED.updated_at`,
        [r.id, r.userId || null, r.userEmail, r.userContact || null, r.albumTitle, r.artist, r.year || null, r.formatPreference || null, r.notes || null, r.status, r.adminNote || null, r.createdAt, r.updatedAt],
      );
    }
  } catch (err) {
    console.error("Error syncing mutation to Postgres:", err);
  }
}
