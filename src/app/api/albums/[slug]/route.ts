import { NextResponse } from "next/server";
import { getAlbumBySlug, listAlbums } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** GET /api/albums/:slug — detail + tracklist + specs (§9.1). */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const album = await getAlbumBySlug(params.slug);
  if (!album) return NextResponse.json({ error: "Album tidak ditemukan." }, { status: 404 });
  const all = await listAlbums();
  const related = all.filter((a) => a.id !== album.id && a.genre === album.genre).slice(0, 4);
  return NextResponse.json({ album, related });
}
