import { cookies } from "next/headers";

export const CART_COOKIE_NAME = "mug1iii_cart";

/**
 * Reads persistent cart album IDs from the request cookie.
 * Ensures the cart persists across stateless Vercel Serverless Function instances.
 */
export function getCartAlbumIdsFromCookies(): string[] {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(CART_COOKIE_NAME)?.value;
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(decodeURIComponent(raw));
      } catch {
        return [];
      }
    }
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string" && Boolean(id));
    }
  } catch {
    // Return empty array when called outside request context or on malformed JSON
  }
  return [];
}
