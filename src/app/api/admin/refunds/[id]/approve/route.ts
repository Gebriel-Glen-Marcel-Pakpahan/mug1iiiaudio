import { NextResponse } from "next/server";
import { approveRefund } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/refunds/:id/approve — approve warranty refund and revoke access
 * (§9.4, §10.3). Requires a resolution note; the note is stored on the refund and
 * included in the buyer's email.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { note?: string };
    const note = body.note?.trim();
    if (!note || note.length < 4) {
      return NextResponse.json({ error: "Catatan resolusi wajib diisi." }, { status: 400 });
    }
    const order = await approveRefund(params.id, admin.email, note);
    if (!order) return NextResponse.json({ error: "Refund tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return jsonError(err);
  }
}
