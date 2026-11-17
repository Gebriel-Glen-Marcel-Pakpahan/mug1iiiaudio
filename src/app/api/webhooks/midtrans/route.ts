import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/repo";
import { rateLimit } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/midtrans — payment notification (§9.3, §10.2).
 * 1. Validate signature (rejects spoofed calls).
 * 2. Idempotent: final payment states are never reprocessed.
 * 3. Access granting is queued, never inline — a transient Drive failure must not
 *    leave a paid order stranded.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`webhook:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const payload = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!payload?.order_id || !payload?.transaction_status) {
    return NextResponse.json({ error: "payload tidak valid" }, { status: 400 });
  }

  const result = await handleWebhook({
    order_id: payload.order_id,
    transaction_status: payload.transaction_status,
    status_code: payload.status_code ?? "200",
    gross_amount: payload.gross_amount ?? "0.00",
    signature_key: payload.signature_key,
    demo_secret: payload.demo_secret,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result, { status: 200 });
}
