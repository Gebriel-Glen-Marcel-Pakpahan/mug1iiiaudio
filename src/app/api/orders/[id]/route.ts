import { NextResponse } from "next/server";
import { getOrderForUser } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/orders/:id — detail + links (links only when PAID/access granted). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const order = await getOrderForUser(params.id, user.id);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

    const revealLinks = order.status === "PAID" || order.status === "REFUNDED";
    return NextResponse.json({
      order: {
        ...order,
        driveLinks: revealLinks ? order.driveLinks : [],
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
