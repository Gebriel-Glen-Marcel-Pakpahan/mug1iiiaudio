import { NextResponse } from "next/server";
import { adminStats, listAudit } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit — audit trail (§9.4). */
export async function GET() {
  try {
    await requireAdmin();
    const [audit, stats] = await Promise.all([listAudit(200), adminStats()]);
    return NextResponse.json({ audit, stats });
  } catch (err) {
    return jsonError(err);
  }
}
