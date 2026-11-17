import { NextResponse } from "next/server";
import { rejectRefund } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST /api/admin/refunds/:id/reject — decline a warranty claim (§9.4). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { note?: string };
    const note = body.note?.trim() || "Tidak memenuhi kriteria garansi.";
    const refund = await rejectRefund(params.id, admin.email, note);
    return NextResponse.json({ refund });
  } catch (err) {
    return jsonError(err);
  }
}
