import { NextResponse } from "next/server";
import { removeCartItem } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** DELETE /api/cart/:itemId — remove one line item. */
export async function DELETE(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    const user = await requireUser();
    const removed = await removeCartItem(user.id, params.itemId);
    if (!removed) return NextResponse.json({ error: "Item tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
