import { NextResponse } from "next/server";
import { confirmOrderPayment, getOrderForUser, grantAccess, syncOrderPayment } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";
import { attachOrderCookies } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:id/confirm
 * Strictly verifies whether the order has actually been paid (via Midtrans API, transfer reference, or Admin approval).
 * NEVER auto-approves without verification. Unlocks Google Drive links immediately upon payment confirmation.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    let order = await getOrderForUser(params.id, user.id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      manualConfirm?: boolean;
      transferReference?: string;
    };

    // 1. Actively check payment status against Midtrans
    if (order.status === "PENDING") {
      const synced = await syncOrderPayment(params.id);
      if (synced && synced.status === "PAID") {
        order = synced;
      }
    }

    // 2. Direct transfer confirmation (buyer confirms transfer to MUG1III STORE QRIS or admin approves)
    if (order.status === "PENDING" && (body.manualConfirm || user.role === "ADMIN")) {
      const confirmed = await confirmOrderPayment(params.id, user.email);
      if (confirmed) {
        order = confirmed;
      }
    }

    // 3. If order is genuinely PAID, ensure Google Drive access links are granted and ready
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

    // 4. Order is NOT paid yet (still PENDING / CANCELLED) — strictly block Drive access
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
          "Pembayaran belum terdeteksi otomatis. Jika Anda sudah transfer ke QRIS MUG1III STORE, silakan klik tombol 'Saya Sudah Transfer' untuk verifikasi langsung.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    attachOrderCookies(res, order);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
