import { NextResponse } from "next/server";
import { confirmOrderByAmountOrNumber } from "@/lib/repo";
import { rateLimit } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_SECRET = "mug1iii-dana-secret-2026";

/**
 * Extracts numeric rupiah amount from Indonesian transaction notification texts:
 * Examples:
 * - "Kamu menerima pembayaran sebesar Rp 5.500 dari..." -> 5500
 * - "Pembayaran sebesar Rp 4.500 berhasil diterima" -> 4500
 * - "Terima pembayaran QRIS Rp 5.500" -> 5500
 * - "Rp 5500" -> 5500
 */
function extractAmountFromText(text: string): number | null {
  if (!text) return null;

  // 1. Look for explicit Rp X.XXX or Rp XXXX
  const rpMatch = text.match(/(?:sebesar\s+)?(?:Rp\.?|RP\.?)\s*([0-9\.,]+)/i);
  if (rpMatch && rpMatch[1]) {
    const cleaned = rpMatch[1].replace(/\./g, "").replace(/,/g, ".");
    const num = Math.floor(parseFloat(cleaned));
    if (!isNaN(num) && num > 0) return num;
  }

  // 2. Look for numeric patterns like "5500" or "4500"
  const numMatch = text.match(/\b([1-9][0-9]{3,7})\b/);
  if (numMatch && numMatch[1]) {
    const num = parseInt(numMatch[1], 10);
    if (!isNaN(num) && num >= 1000) return num;
  }

  return null;
}

/**
 * Extracts order number pattern: ORD-YYYYMMDD-XXXX
 */
function extractOrderNumber(text: string): string | null {
  if (!text) return null;
  const match = text.match(/ORD-\d{8}-[A-Za-z0-9]+/i);
  return match ? match[0].toUpperCase() : null;
}

async function processDanaPayment({
  amount,
  orderNumber,
  rawNotification,
  actorEmail,
}: {
  amount?: number | null;
  orderNumber?: string | null;
  rawNotification?: string;
  actorEmail: string;
}) {
  let finalAmount = amount;
  let finalOrderNumber = orderNumber;

  if (rawNotification) {
    if (!finalAmount) finalAmount = extractAmountFromText(rawNotification);
    if (!finalOrderNumber) finalOrderNumber = extractOrderNumber(rawNotification);
  }

  if (!finalAmount && !finalOrderNumber) {
    return {
      success: false,
      status: 400,
      data: {
        error: "invalid_payload",
        message: "Tidak dapat mendeteksi nominal atau nomor pesanan dari data notifikasi yang dikirimkan.",
      },
    };
  }

  const outcome = await confirmOrderByAmountOrNumber({
    amount: finalAmount ?? undefined,
    orderNumber: finalOrderNumber ?? undefined,
    actorEmail,
  });

  if (!outcome.matched || !outcome.order) {
    return {
      success: false,
      status: 404,
      data: {
        ok: false,
        message: outcome.error || "Pesanan tidak ditemukan atau tidak berstatus PENDING.",
        searched: { amount: finalAmount, orderNumber: finalOrderNumber },
      },
    };
  }

  return {
    success: true,
    status: 200,
    data: {
      ok: true,
      message: outcome.alreadyFinal
        ? "Pesanan ini sudah pernah diverifikasi lunas sebelumnya (idempotent)."
        : `Pesanan ${outcome.order.orderNumber} senilai Rp ${outcome.order.totalAmount.toLocaleString("id-ID")} berhasil diverifikasi lunas! Akses Google Drive telah dikirim ke ${outcome.order.userEmail}.`,
      order: {
        id: outcome.order.id,
        orderNumber: outcome.order.orderNumber,
        totalAmount: outcome.order.totalAmount,
        status: outcome.order.status,
        accessStatus: outcome.order.accessStatus,
        userEmail: outcome.order.userEmail,
        driveLinksCount: outcome.order.driveLinks?.length ?? 0,
      },
    },
  };
}

/**
 * GET /api/webhooks/dana
 * - If called without payment params: returns endpoint guide and status.
 * - If called with ?secret=...&amount=5500: allows quick testing directly from any browser!
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const configuredSecret = process.env.DANA_WEBHOOK_SECRET || DEFAULT_SECRET;
  const providedSecret = url.searchParams.get("secret") || req.headers.get("x-dana-secret");

  // Quick browser test if amount or order or notification param is present
  const hasPaymentParam =
    url.searchParams.has("amount") ||
    url.searchParams.has("order") ||
    url.searchParams.has("notification") ||
    url.searchParams.has("text");

  if (hasPaymentParam) {
    if (providedSecret !== configuredSecret) {
      return NextResponse.json(
        { error: "unauthorized", message: "Secret webhook token tidak valid atau belum diisi." },
        { status: 401 },
      );
    }

    const qAmount = url.searchParams.get("amount") ? parseInt(url.searchParams.get("amount")!, 10) : null;
    const qOrder = url.searchParams.get("order") || url.searchParams.get("orderNumber");
    const qNotif = url.searchParams.get("notification") || url.searchParams.get("text");

    const result = await processDanaPayment({
      amount: !isNaN(Number(qAmount)) ? qAmount : null,
      orderNumber: qOrder,
      rawNotification: qNotif || undefined,
      actorEmail: "browser-test-webhook@mug1iii.audio",
    });

    return NextResponse.json(result.data, { status: result.status });
  }

  // Default GET response: Documentation & instructions
  return NextResponse.json(
    {
      status: "active",
      endpoint: "/api/webhooks/dana",
      description: "Automated webhook receiver for DANA Bisnis push notifications (MacroDroid / Tasker / Forwarder)",
      secret: configuredSecret,
      browserTestUrlExample: `${url.origin}/api/webhooks/dana?secret=${configuredSecret}&amount=5500`,
      quickGuide: {
        method: "POST",
        url: `${url.origin}/api/webhooks/dana?secret=${configuredSecret}`,
        headers: {
          "Content-Type": "application/json",
          "x-dana-secret": configuredSecret,
        },
        bodyFormat: {
          notification: "Kamu menerima pembayaran sebesar Rp 5.500 dari...",
          amount: 5500,
          orderNumber: "ORD-20261118-T70I (opsional)",
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/webhooks/dana
 * Automatically verifies pending orders when DANA Bisnis receives customer payment.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`webhook:dana:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const configuredSecret = process.env.DANA_WEBHOOK_SECRET || DEFAULT_SECRET;
  const url = new URL(req.url);
  const providedSecret =
    req.headers.get("x-dana-secret") ||
    req.headers.get("x-webhook-secret") ||
    url.searchParams.get("secret");

  // Read request body (JSON or Form Data or Plain Text)
  let rawBody: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData().catch(() => null);
    if (formData) {
      formData.forEach((val, key) => {
        rawBody[key] = val.toString();
      });
    }
  } else {
    const text = await req.text().catch(() => "");
    rawBody = { notification: text };
  }

  const tokenInBody = typeof rawBody.secret === "string" ? rawBody.secret : null;
  const activeToken = providedSecret || tokenInBody;

  if (activeToken !== configuredSecret) {
    return NextResponse.json(
      { error: "unauthorized", message: "Secret webhook token tidak valid atau belum diisi." },
      { status: 401 },
    );
  }

  // 1. Order number
  let orderNumber: string | null = null;
  if (typeof rawBody.order_id === "string") orderNumber = rawBody.order_id;
  if (typeof rawBody.orderNumber === "string") orderNumber = rawBody.orderNumber;
  if (typeof rawBody.order === "string") orderNumber = rawBody.order;
  if (url.searchParams.get("order")) orderNumber = url.searchParams.get("order");

  // 2. Amount
  let amount: number | null = null;
  if (typeof rawBody.amount === "number") amount = rawBody.amount;
  if (typeof rawBody.amount === "string") amount = extractAmountFromText(rawBody.amount);
  if (typeof rawBody.nominal === "number") amount = rawBody.nominal;
  if (typeof rawBody.nominal === "string") amount = extractAmountFromText(rawBody.nominal);
  if (typeof rawBody.total === "number") amount = rawBody.total;
  if (typeof rawBody.total === "string") amount = extractAmountFromText(rawBody.total);

  if (url.searchParams.get("amount")) {
    const qAmount = parseInt(url.searchParams.get("amount")!, 10);
    if (!isNaN(qAmount) && qAmount > 0) amount = qAmount;
  }

  // 3. Notification text
  const notificationText =
    (typeof rawBody.notification === "string" && rawBody.notification) ||
    (typeof rawBody.message === "string" && rawBody.message) ||
    (typeof rawBody.content === "string" && rawBody.content) ||
    (typeof rawBody.text === "string" && rawBody.text) ||
    (typeof rawBody.body === "string" && rawBody.body) ||
    (typeof rawBody.msg === "string" && rawBody.msg) ||
    (typeof rawBody.desc === "string" && rawBody.desc) ||
    url.searchParams.get("notification") ||
    url.searchParams.get("text") ||
    "";

  const result = await processDanaPayment({
    amount,
    orderNumber,
    rawNotification: notificationText || undefined,
    actorEmail: "dana-push-webhook@mug1iii.audio",
  });

  return NextResponse.json(result.data, { status: result.status });
}
