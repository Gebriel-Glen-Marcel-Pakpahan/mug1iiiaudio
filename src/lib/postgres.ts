import { Pool } from "pg";
import type { Album, AlbumRequest, AuditEntry, DbShape, DriveLink, Order, Payment, Refund, User } from "./types";

let pool: Pool | null = null;

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool | null {
  if (!isPostgresConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

/**
 * Loads the complete database snapshot from PostgreSQL relational tables into DbShape.
 */
export async function loadDbFromPostgres(): Promise<DbShape | null> {
  const p = getPool();
  if (!p) return null;

  try {
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
