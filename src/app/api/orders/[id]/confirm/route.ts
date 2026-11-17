import { NextResponse } from "next/server";
import { confirmOrderPayment, getOrderForUser, syncOrderPayment } from "@/lib/repo";
import { config } from "@/lib/config";
import { jsonError, requireUser } from "@/lib/session";
import { attachOrderCookies } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:id/confirm
 * Validates and completes payment when testing with real QRIS or when customer confirms transfer.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const order = await getOrderForUser(params.id, user.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

    // In live Midtrans mode, check if Midtrans has already recorded the payment
    if (config.midtrans.isConfigured) {
      const synced = await syncOrderPayment(params.id);
      if (synced && (synced.status === "PAID" || synced.status === "REFUNDED")) {
        const res = NextResponse.json({
          status: synced.status,
          paymentStatus: synced.paymentStatus,
          accessStatus: synced.accessStatus,
          paidAt: synced.paidAt,
        });
        attachOrderCookies(res, synced);
        return res;
      }
    }

    // Direct / manual payment confirmation
    const confirmed = await confirmOrderPayment(params.id, user.email);
    if (!confirmed) {
      return NextResponse.json({ error: "Gagal memproses konfirmasi pembayaran." }, { status: 500 });
    }

    const res = NextResponse.json({
      status: confirmed.status,
      paymentStatus: confirmed.paymentStatus,
      accessStatus: confirmed.accessStatus,
      paidAt: confirmed.paidAt,
    });
    attachOrderCookies(res, confirmed);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
