import { NextResponse } from "next/server";
import { checkout } from "@/lib/repo";
import { jsonError, rateLimit, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout — create order + QRIS charge (§9.2, §10.1).
 * Idempotent: an outstanding PENDING order is reused rather than duplicated.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as { albumId?: string };
    const { order, reused } = await checkout(user, body.albumId);
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      qrString: order.payment?.qrString ?? null,
      expiresAt: order.payment?.expiresAt ?? null,
      reused,
    });
  } catch (err) {
    return jsonError(err);
  }
}
