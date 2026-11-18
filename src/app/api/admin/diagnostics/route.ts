import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { jsonError, requireAdmin } from "@/lib/session";
import { isPostgresConfigured } from "@/lib/postgres";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/diagnostics
 * Tests integrations with external services (Midtrans, Google Drive, Postgres, Email).
 */
export async function GET() {
  try {
    await requireAdmin();

    // 1. Test Midtrans Ping & QRIS readiness
    const midtransDiagnostics: {
      isConfigured: boolean;
      isProduction: boolean;
      serverKeyPrefix: string;
      clientKeyPrefix: string;
      pingStatus: string;
      qrisStatus: string;
      qrisMessage?: string;
    } = {
      isConfigured: config.midtrans.isConfigured,
      isProduction: config.midtrans.isProduction,
      serverKeyPrefix: config.midtrans.serverKey
        ? `${config.midtrans.serverKey.slice(0, 10)}...`
        : "Belum diset",
      clientKeyPrefix: config.midtrans.clientKey
        ? `${config.midtrans.clientKey.slice(0, 10)}...`
        : "Belum diset",
      pingStatus: "Belum diuji",
      qrisStatus: "Belum diuji",
    };

    if (config.midtrans.isConfigured) {
      const authHeader = `Basic ${Buffer.from(`${config.midtrans.serverKey}:`).toString("base64")}`;
      const baseUrl = config.midtrans.chargeUrl.replace("/charge", "");

      // Ping status check
      try {
        const pingRes = await fetch(`${baseUrl}/ping-test-nonexistent/status`, {
          headers: { Accept: "application/json", Authorization: authHeader },
          cache: "no-store",
        });
        if (pingRes.status === 401) {
          midtransDiagnostics.pingStatus = "401 Unauthorized (Server Key salah atau mode Sandbox/Production tertukar)";
        } else if (pingRes.status === 404 || pingRes.ok) {
          midtransDiagnostics.pingStatus = "Terhubung (Autentikasi Server Key valid)";
        } else {
          midtransDiagnostics.pingStatus = `HTTP ${pingRes.status}`;
        }
      } catch (e) {
        midtransDiagnostics.pingStatus = `Koneksi gagal: ${(e as Error).message}`;
      }

      // Test QRIS charge creation
      try {
        const testRes = await fetch(config.midtrans.chargeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            payment_type: "qris",
            transaction_details: {
              order_id: `DIAG-${Date.now()}`,
              gross_amount: 1000,
            },
            qris: { acquirer: "gopay" },
          }),
          cache: "no-store",
        });

        const testData = await testRes.json().catch(() => ({}));
        if (testRes.status === 201 || testData.status_code === "201") {
          midtransDiagnostics.qrisStatus = "ACTIVE (QRIS siap menerbitkan pembayaran otomatis)";
        } else if (testRes.status === 402 || testData.status_code === "402" || testData.status_message?.includes("access for this payment type")) {
          midtransDiagnostics.qrisStatus = "INACTIVE (Metode QRIS belum aktif / butuh persetujuan di Dashboard Midtrans)";
          midtransDiagnostics.qrisMessage = testData.status_message;
        } else if (testRes.status === 400 || testData.status_code === "400") {
          midtransDiagnostics.qrisStatus = `DITOLAK (HTTP 400: ${testData.status_message || "Bad Request"})`;
          midtransDiagnostics.qrisMessage = testData.status_message;
        } else {
          midtransDiagnostics.qrisStatus = `HTTP ${testRes.status} (${testData.status_message || "Error"})`;
          midtransDiagnostics.qrisMessage = testData.status_message;
        }
      } catch (e) {
        midtransDiagnostics.qrisStatus = `Gagal test QRIS: ${(e as Error).message}`;
      }
    } else {
      midtransDiagnostics.pingStatus = "MIDTRANS_SERVER_KEY tidak ditemukan di environment variables";
      midtransDiagnostics.qrisStatus = "Menggunakan QRIS Toko (DANA Bisnis)";
    }

    // 2. Google Drive check
    const gdriveDiagnostics = {
      isConfigured: config.gdrive.isConfigured,
      rootFolderId: config.gdrive.rootFolderId,
      sampleFolderId: config.gdrive.sampleFolderId,
    };

    // 3. Email check
    const emailDiagnostics = {
      isConfigured: config.email.isConfigured,
      from: config.email.from,
    };

    // 4. Database check
    const databaseDiagnostics = {
      type: isPostgresConfigured() ? "PostgreSQL (DATABASE_URL terhubung)" : "Local / Temporary JSON Database",
    };

    // 5. DANA Webhook Gateway
    const danaWebhookDiagnostics = {
      status: "Aktif",
      endpoint: "/api/webhooks/dana",
      secret: process.env.DANA_WEBHOOK_SECRET || "mug1iii-dana-secret-2026",
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      midtrans: midtransDiagnostics,
      gdrive: gdriveDiagnostics,
      email: emailDiagnostics,
      database: databaseDiagnostics,
      danaWebhook: danaWebhookDiagnostics,
    });
  } catch (err) {
    return jsonError(err);
  }
}
