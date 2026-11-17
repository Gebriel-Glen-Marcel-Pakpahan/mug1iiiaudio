import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.argv[2] ||
    "postgresql://postgres:postgres@localhost:5432/mug1iii_audio";

  console.log(`\nConnecting to PostgreSQL at: ${connectionString.replace(/:[^:@]+@/, ":****@")}...`);

  // Connect first to default postgres database to ensure mug1iii_audio exists
  const parsed = new URL(connectionString);
  const targetDbName = parsed.pathname.replace(/^\//, "") || "mug1iii_audio";
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  let adminClient;
  try {
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    const checkDb = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName],
    );
    if (checkDb.rowCount === 0) {
      console.log(`Creating database "${targetDbName}"...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
  } catch (err) {
    console.log(`Admin connect note: ${err.message}. Proceeding directly to target database...`);
  } finally {
    if (adminClient) await adminClient.end().catch(() => {});
  }

  // Connect to target database
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`Connected to target database "${targetDbName}".`);

    // 1. Execute Schema
    const sqlPath = path.join(process.cwd(), "scripts", "schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Applying schema...");
    await client.query(sql);
    console.log("✓ All 10 relational tables and indices created.");

    // 2. Read data from db.json
    const dbJsonPath = path.join(process.cwd(), "data", "db.json");
    if (!fs.existsSync(dbJsonPath)) {
      console.log("No data/db.json found to migrate.");
      return;
    }

    const data = JSON.parse(fs.readFileSync(dbJsonPath, "utf8"));
    console.log(`\nMigrating data from db.json...`);

    // Migrate Users
    let userCount = 0;
    for (const u of data.users || []) {
      await client.query(
        `INSERT INTO users (id, email, name, avatar_url, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
        [u.id, u.email, u.name, u.avatarUrl || null, u.role, u.createdAt],
      );
      userCount++;
    }
    console.log(`✓ Migrated ${userCount} users.`);

    // Migrate Albums
    let albumCount = 0;
    for (const a of data.albums || []) {
      await client.query(
        `INSERT INTO albums (
          id, slug, title, artist, genre, description, cover_palette, cover_mark,
          price, format, sample_rate, bit_depth, total_size_mb, track_count,
          total_duration, tracklist, preview_url, gdrive_folder_id, is_published,
          featured, year, label, catalogue_no, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          artist = EXCLUDED.artist,
          price = EXCLUDED.price,
          total_size_mb = EXCLUDED.total_size_mb,
          track_count = EXCLUDED.track_count,
          tracklist = EXCLUDED.tracklist,
          gdrive_folder_id = EXCLUDED.gdrive_folder_id`,
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
      albumCount++;
    }
    console.log(`✓ Migrated ${albumCount} lossless albums.`);

    // Migrate Orders & Items
    let orderCount = 0;
    for (const o of data.orders || []) {
      await client.query(
        `INSERT INTO orders (id, order_number, user_id, total_amount, tax_amount, status, payment_status, access_status, created_at, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           payment_status = EXCLUDED.payment_status,
           access_status = EXCLUDED.access_status,
           paid_at = EXCLUDED.paid_at`,
        [
          o.id,
          o.orderNumber,
          o.userId,
          o.totalAmount,
          o.taxAmount || 0,
          o.status,
          o.paymentStatus,
          o.accessStatus,
          o.createdAt,
          o.paidAt || null,
        ],
      );

      for (const item of o.items || []) {
        await client.query(
          `INSERT INTO order_items (id, order_id, album_id, price_snapshot)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, o.id, item.albumId, item.priceSnapshot],
        );
      }
      orderCount++;
    }
    console.log(`✓ Migrated ${orderCount} orders & order items.`);

    // Migrate Payments
    let paymentCount = 0;
    for (const p of data.payments || []) {
      await client.query(
        `INSERT INTO payments (id, order_id, gateway, gateway_ref, qr_string, amount, status, raw_payload, verified_at, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           verified_at = EXCLUDED.verified_at`,
        [
          p.id,
          p.orderId,
          p.gateway || "midtrans",
          p.gatewayRef || null,
          p.qrString || null,
          p.amount,
          p.status,
          p.rawPayload ? JSON.stringify(p.rawPayload) : null,
          p.verifiedAt || null,
          p.createdAt,
          p.expiresAt || null,
        ],
      );
      paymentCount++;
    }
    console.log(`✓ Migrated ${paymentCount} payments.`);

    // Migrate Drive Links
    let driveCount = 0;
    for (const d of data.driveLinks || []) {
      await client.query(
        `INSERT INTO drive_links (id, order_id, album_id, folder_id, permission_id, link_url, is_active, created_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           is_active = EXCLUDED.is_active,
           revoked_at = EXCLUDED.revoked_at`,
        [
          d.id,
          d.orderId,
          d.albumId,
          d.folderId,
          d.permissionId,
          d.linkUrl,
          d.isActive,
          d.createdAt,
          d.revokedAt || null,
        ],
      );
      driveCount++;
    }
    console.log(`✓ Migrated ${driveCount} Google Drive access links.`);

    // Migrate Album Requests
    let requestCount = 0;
    for (const r of data.requests || []) {
      await client.query(
        `INSERT INTO album_requests (id, user_id, user_email, user_contact, album_title, artist, year, format_preference, notes, status, admin_note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           admin_note = EXCLUDED.admin_note,
           updated_at = EXCLUDED.updated_at`,
        [
          r.id,
          r.userId || null,
          r.userEmail,
          r.userContact || null,
          r.albumTitle,
          r.artist,
          r.year || null,
          r.formatPreference || null,
          r.notes || null,
          r.status,
          r.adminNote || null,
          r.createdAt,
          r.updatedAt,
        ],
      );
      requestCount++;
    }
    console.log(`✓ Migrated ${requestCount} album requests.`);

    // Migrate Audit Logs
    let auditCount = 0;
    for (const a of data.audit || []) {
      await client.query(
        `INSERT INTO audit_logs (id, at, actor, action, target, detail, level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.at, a.actor, a.action, a.target, a.detail, a.level || "info"],
      );
      auditCount++;
    }
    console.log(`✓ Migrated ${auditCount} audit log records.`);

    console.log(`\n🎉 POSTGRESQL MIGRATION COMPLETE! All data is fully synced and relational.\n`);
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
