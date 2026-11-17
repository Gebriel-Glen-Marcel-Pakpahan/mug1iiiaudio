import { NextResponse } from "next/server";
import { requestRefund } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST /api/refunds — file a warranty claim (§9.2). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { orderId?: string; reason?: string };
    if (!body.orderId || !body.reason?.trim() || body.reason.trim().length < 12) {
      return NextResponse.json(
        { error: "Alasan garansi wajib diisi minimal 12 karakter." },
        { status: 400 },
      );
    }
    const refund = await requestRefund(user, body.orderId, body.reason.trim());
    return NextResponse.json({ refund });
  } catch (err) {
    return jsonError(err);
  }
}
