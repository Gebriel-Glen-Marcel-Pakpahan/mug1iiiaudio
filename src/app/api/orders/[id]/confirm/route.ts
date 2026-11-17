import { NextResponse } from "next/server";
import { getOrderForUser, grantAccess, syncOrderPayment } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";
import { attachOrderCookies } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:id/confirm
 * Strictly verifies whether the order has actually been paid (via Midtrans API or Admin verification).
 * NEVER auto-approves an unpaid order. If unpaid, returns status: "PENDING" and paid: false.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    let order = await getOrderForUser(params.id, user.id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    // Actively check payment status against Midtrans
    if (order.status === "PENDING") {
      const synced = await syncOrderPayment(params.id);
      if (synced) order = synced;
    }

    // If order is genuinely PAID, ensure Google Drive access links are granted and ready
    if (order.status === "PAID") {
      if (order.accessStatus !== "GRANTED" || !order.driveLinks?.length) {
        await grantAccess(order.id);
        const refreshed = await getOrderForUser(params.id, user.id);
        if (refreshed) order = refreshed;
      }

      const res = NextResponse.json(
        {
          paid: true,
          status: order.status,
          paymentStatus: order.paymentStatus,
          accessStatus: order.accessStatus,
          paidAt: order.paidAt,
          driveLinks: order.driveLinks ?? [],
          checkedAt: new Date().toISOString(),
          message: "Pembayaran telah terverifikasi lunas. Akses Google Drive aktif.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
      attachOrderCookies(res, order);
      return res;
    }

    // Order is NOT paid yet (still PENDING / CANCELLED) — strictly block Drive access
    const res = NextResponse.json(
      {
        paid: false,
        status: order.status,
        paymentStatus: order.paymentStatus,
        accessStatus: order.accessStatus,
        paidAt: null,
        driveLinks: [],
        checkedAt: new Date().toISOString(),
        message:
          "Pembayaran belum diterima di sistem. Silakan pindai kode QRIS dan selesaikan transfer terlebih dahulu.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    attachOrderCookies(res, order);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
