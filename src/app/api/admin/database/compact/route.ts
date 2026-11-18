import { NextResponse } from "next/server";
import { compactAndOptimizeDatabase } from "@/lib/postgres";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/database/compact
 * Optimizes database footprint:
 * - Strips bulky debug traces from payment payloads
 * - Prunes orphaned cart items
 * - Trims old audit logs exceeding 500 entries
 * - Executes PostgreSQL index optimization
 */
export async function POST() {
  try {
    await requireAdmin();
    const result = await compactAndOptimizeDatabase();
    return NextResponse.json({
      ok: true,
      message: `Database berhasil dikompres dan dioptimalkan! ${result.freedFormatted} ruang berhasil dibebaskan.`,
      result,
    });
  } catch (err) {
    return jsonError(err);
  }
}
