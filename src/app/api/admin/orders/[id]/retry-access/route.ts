import { NextResponse } from "next/server";
import { retryGrant } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST /api/admin/orders/:id/retry-access — manual retry for FAILED grants. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const order = await retryGrant(params.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
