import { NextResponse } from "next/server";
import { addToCart, getCartView } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/cart — read the signed-in buyer's cart. */
export async function GET() {
  try {
    const user = await requireUser();
    const cart = await getCartView(user.id);
    return NextResponse.json({
      items: cart.items.map((i) => ({
        id: i.id,
        albumId: i.albumId,
        addedAt: i.addedAt,
        album: i.album,
      })),
      subtotal: cart.subtotal,
      count: cart.items.length,
    });
  } catch (err) {
    return jsonError(err);
  }
}

/** POST /api/cart — add an album (idempotent per user+album). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { albumId?: string };
    if (!body.albumId) {
      return NextResponse.json({ error: "albumId wajib diisi." }, { status: 400 });
    }
    const item = await addToCart(user.id, body.albumId);
    const cart = await getCartView(user.id);
    return NextResponse.json({ item, count: cart.items.length, subtotal: cart.subtotal });
  } catch (err) {
    return jsonError(err);
  }
}
