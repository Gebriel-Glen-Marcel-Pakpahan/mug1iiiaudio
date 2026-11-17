import { NextResponse } from "next/server";
import { listAlbums } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** GET /api/albums — published catalogue with filter/search/sort/pagination (§9.1). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const genre = searchParams.get("genre");
  const format = searchParams.get("format");
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.min(48, Math.max(1, Number(searchParams.get("perPage") ?? "12")));

  let albums = await listAlbums();

  if (q) {
    albums = albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q) ||
        a.genre.toLowerCase().includes(q),
    );
  }
  if (genre && genre !== "Semua") albums = albums.filter((a) => a.genre === genre);
  if (format) albums = albums.filter((a) => a.format === format);

  albums.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "title") return a.title.localeCompare(b.title, "id");
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const total = albums.length;
  const start = (page - 1) * perPage;
  const items = albums.slice(start, start + perPage);

  return NextResponse.json({
    items,
    pagination: { page, perPage, total, pages: Math.ceil(total / perPage) },
  });
}
