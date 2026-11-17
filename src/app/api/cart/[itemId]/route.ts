import { NextResponse } from "next/server";
import { removeCartItem } from "@/lib/repo";
import { jsonError, requireUser } from "@/lib/session";
import { CART_COOKIE_NAME, getCartAlbumIdsFromCookies } from "@/lib/cart-cookie";

export const dynamic = "force-dynamic";

/** DELETE /api/cart/:itemId — remove one line item. */
export async function DELETE(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    const user = await requireUser();
    await removeCartItem(user.id, params.itemId);

    // Sync to cookie
    const currentCookieIds = getCartAlbumIdsFromCookies();
    const cleanId = params.itemId.replace(/^cart_/, "");
    const updatedIds = currentCookieIds.filter((id) => id !== cleanId && id !== params.itemId);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(CART_COOKIE_NAME, JSON.stringify(updatedIds), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
