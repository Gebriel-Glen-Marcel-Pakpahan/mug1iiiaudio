import { NextResponse } from "next/server";
import { getDatabaseStorageMetrics } from "@/lib/postgres";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/database/storage
 * Returns live storage consumption, remaining quota (500 MB Supabase Free Tier),
 * and table-by-table sizing breakdown.
 */
export async function GET() {
  try {
    await requireAdmin();
    const metrics = await getDatabaseStorageMetrics();
    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return jsonError(err);
  }
}
