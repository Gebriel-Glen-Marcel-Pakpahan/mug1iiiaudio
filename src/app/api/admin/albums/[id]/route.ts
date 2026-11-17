import { NextResponse } from "next/server";
import { withDb, audit } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/albums/:id — update metadata / publish state. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const album = await withDb((db) => {
      const found = db.albums.find((a) => a.id === params.id);
      if (!found) return null;
      const allowed = [
        "title",
        "artist",
        "genre",
        "description",
        "price",
        "format",
        "sampleRate",
        "bitDepth",
        "gdriveFolderId",
        "trackCount",
        "totalSizeMb",
        "year",
        "isPublished",
        "featured",
      ] as const;
      allowed.forEach((key) => {
        if (key in body) {
          // @ts-expect-error dynamic assignment over a known key set
          found[key] = body[key];
        }
      });
      audit(db, {
        actor: admin.email,
        action: "album.updated",
        target: found.title,
        detail: `Field diubah: ${Object.keys(body).join(", ") || "—"}`,
      });
      return found;
    });

    if (!album) return NextResponse.json({ error: "Album tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ album });
  } catch (err) {
    return jsonError(err);
  }
}

/** DELETE /api/admin/albums/:id — unpublish (soft, keeps order history intact). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const album = await withDb((db) => {
      const found = db.albums.find((a) => a.id === params.id);
      if (!found) return null;
      found.isPublished = false;
      audit(db, {
        actor: admin.email,
        action: "album.unpublished",
        target: found.title,
        detail: "Album disimpan sebagai draf; riwayat pesanan tetap utuh.",
        level: "warn",
      });
      return found;
    });
    if (!album) return NextResponse.json({ error: "Album tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ album });
  } catch (err) {
    return jsonError(err);
  }
}
