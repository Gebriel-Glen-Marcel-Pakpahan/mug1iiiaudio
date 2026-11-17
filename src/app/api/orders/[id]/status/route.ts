import { NextResponse } from "next/server";
import { getOrderForUser, grantAccess, syncOrderPayment } from "@/lib/repo";
import { config } from "@/lib/config";
import { jsonError, requireUser } from "@/lib/session";
import { attachOrderCookies } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";

/** GET /api/orders/:id/status — polling & status verification endpoint for the QR screen (§9.2). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    let order = await getOrderForUser(params.id, user.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

    // Actively sync with Midtrans so real payments are detected automatically
    if (order.status === "PENDING" && config.midtrans.isConfigured) {
      const synced = await syncOrderPayment(params.id);
      if (synced) order = synced;
    }

    if (order.status === "PAID" && (order.accessStatus !== "GRANTED" || !order.driveLinks?.length)) {
      await grantAccess(order.id);
      const refreshed = await getOrderForUser(params.id, user.id);
      if (refreshed) order = refreshed;
    }

    const isPaid = order.status === "PAID" || order.status === "REFUNDED";

    const res = NextResponse.json(
      {
        paid: isPaid,
        status: order.status,
        paymentStatus: order.paymentStatus,
        accessStatus: order.accessStatus,
        paidAt: order.paidAt,
        driveLinks: isPaid ? (order.driveLinks ?? []) : [],
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );

    attachOrderCookies(res, order);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
