import { NextResponse } from "next/server";
import { getOrderForUser } from "@/lib/repo";
import { renderQr } from "@/lib/services/midtrans";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:id/qr — re-render the QR from the stored `qrString`.
 * PRD §7.2: qrString is persisted precisely so a page refresh is safe.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const order = await getOrderForUser(params.id, user.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (!order.payment?.qrString) {
      return NextResponse.json({ error: "QRIS tidak tersedia untuk pesanan ini." }, { status: 404 });
    }

    const qrDataUrl = await renderQr(order.payment.qrString);
    return NextResponse.json(
      { qrDataUrl, expiresAt: order.payment.expiresAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return jsonError(err);
  }
}
