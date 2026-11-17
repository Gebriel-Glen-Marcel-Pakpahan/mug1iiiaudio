import { NextResponse } from "next/server";
import { getAlbumBySlug } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/preview/[slug] — preview endpoint (§9.1).
 *
 * No 30s audio asset exists in the demo build, so this returns the preview
 * descriptor and lets the client synthesise it. Replace the body with a
 * redirect/stream to `album.previewUrl` in production.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const album = await getAlbumBySlug(params.slug);
  if (!album) return NextResponse.json({ error: "Preview tidak ditemukan." }, { status: 404 });

  return NextResponse.json({
    albumId: album.id,
    title: album.title,
    artist: album.artist,
    durationSeconds: 30,
    previewUrl: album.previewUrl,
    note: "Demo build: preview disintesis di browser (Web Audio API).",
  });
}
