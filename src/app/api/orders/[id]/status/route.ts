import { NextResponse } from "next/server";
import { getOrderForUser, syncOrderPayment } from "@/lib/repo";
import { config } from "@/lib/config";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/orders/:id/status — polling endpoint for the QR screen (§9.2). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    let order = await getOrderForUser(params.id, user.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

    // In live mode, actively sync with Midtrans so localhost payments are detected automatically
    if (order.status === "PENDING" && config.midtrans.isConfigured) {
      const synced = await syncOrderPayment(params.id);
      if (synced) order = synced;
    }

    return NextResponse.json(
      {
        status: order.status,
        paymentStatus: order.paymentStatus,
        accessStatus: order.accessStatus,
        paidAt: order.paidAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return jsonError(err);
  }
}
