import { NextResponse } from "next/server";
import { confirmOrderPayment } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST /api/admin/orders/:id/approve — Admin-only manual verification of QRIS transfer. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const order = await confirmOrderPayment(params.id, admin.email);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
