import { NextResponse } from "next/server";
import { listAllOrders } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/admin/orders — all orders with optional filters. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const access = searchParams.get("access");
    const q = searchParams.get("q")?.toLowerCase();

    let orders = await listAllOrders();
    if (status && status !== "all") orders = orders.filter((o) => o.status === status);
    if (access && access !== "all") orders = orders.filter((o) => o.accessStatus === access);
    if (q) {
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) || o.userEmail.toLowerCase().includes(q),
      );
    }
    return NextResponse.json({ orders });
  } catch (err) {
    return jsonError(err);
  }
}
