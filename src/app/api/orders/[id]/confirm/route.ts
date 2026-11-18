import { NextResponse } from "next/server";
import { getOrderForUser, grantAccess, syncOrderPayment } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";
import { attachOrderCookies } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:id/confirm
 * Strictly verifies whether the order has genuinely been paid (via Midtrans API, IMAP payment receipt, or Admin approval).
 * NEVER auto-approves an unpaid order. If unpaid, returns status: "PENDING" and paid: false.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    let order = await getOrderForUser(params.id, user.id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    // 1. Actively check real payment status against Midtrans API & Store IMAP Mutasi
    if (order.status === "PENDING") {
      const synced = await syncOrderPayment(params.id);
      if (synced) {
        order = synced;
      }
    }

    // 2. If order is genuinely PAID, ensure Google Drive access links are granted and emailed to order.userEmail
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
          message: `Pembayaran telah terverifikasi lunas. Akses Google Drive telah dikirim ke ${order.userEmail}.`,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
      attachOrderCookies(res, order);
      return res;
    }

    // 3. Order is NOT paid yet (still PENDING / CANCELLED) — strictly block Drive access
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
