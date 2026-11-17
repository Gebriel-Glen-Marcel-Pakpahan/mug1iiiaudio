import { NextResponse } from "next/server";
import { listOrdersForUser } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/orders — buyer order history. */
export async function GET() {
  try {
    const user = await requireUser();
    const orders = await listOrdersForUser(user.id);
    return NextResponse.json({ orders });
  } catch (err) {
    return jsonError(err);
  }
}
