import { NextResponse } from "next/server";
import { z } from "zod";
import { withDb, id, nowIso, audit } from "@/lib/db";
import { createAlbumFolder } from "@/lib/services/gdrive";
import { listAlbums } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";
import type { Album } from "@/lib/types";

export const dynamic = "force-dynamic";

const AlbumInput = z.object({
  title: z.string().min(2),
  artist: z.string().min(2),
  genre: z.string().min(2),
  description: z.string().min(10),
  price: z.number().int().positive(),
  format: z.enum(["FLAC", "WAV", "ALAC", "DSD"]),
  sampleRate: z.string().min(2),
  bitDepth: z.string().min(1),
  totalSizeMb: z.number().int().positive(),
  trackCount: z.number().int().positive(),
  totalDuration: z.string().min(3),
  year: z.number().int().min(1900).max(2100),
  label: z.string().min(1),
  catalogueNo: z.string().min(1),
  isPublished: z.boolean().default(false),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** GET /api/admin/albums */
export async function GET() {
  try {
    await requireAdmin();
    const albums = await listAlbums({ includeUnpublished: true });
    return NextResponse.json({ albums });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * POST /api/admin/albums — create album metadata.
 * PRD §8.4: the backend creates the Drive folder and returns it; the large audio
 * files are uploaded browser → Drive directly, never through this endpoint.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = AlbumInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data album tidak valid.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const input = parsed.data;

    const existing = await listAlbums({ includeUnpublished: true });
    let slug = slugify(input.title);
    if (existing.some((a) => a.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

    const folder = await createAlbumFolder(input.title);

    const album = await withDb((db) => {
      const created: Album = {
        id: id("alb"),
        slug,
        title: input.title,
        artist: input.artist,
        genre: input.genre,
        description: input.description,
        coverPalette: ["#0B0B0F", "#3A3325", "#D4AF37"],
        coverMark: input.title.slice(0, 2).toUpperCase(),
        price: input.price,
        format: input.format,
        sampleRate: input.sampleRate,
        bitDepth: input.bitDepth,
        totalSizeMb: input.totalSizeMb,
        trackCount: input.trackCount,
        totalDuration: input.totalDuration,
        tracklist: Array.from({ length: input.trackCount }).map((_, i) => ({
          no: i + 1,
          title: `Track ${String(i + 1).padStart(2, "0")}`,
          duration: "0:00",
        })),
        previewUrl: null,
        gdriveFolderId: folder.folderId,
        isPublished: input.isPublished,
        featured: false,
        createdAt: nowIso(),
        year: input.year,
        label: input.label,
        catalogueNo: input.catalogueNo,
      };
      db.albums.push(created);
      audit(db, {
        actor: admin.email,
        action: "album.created",
        target: created.title,
        detail: `Folder Drive ${folder.folderId} (${folder.simulated ? "demo" : "live"}) dibuat.`,
      });
      return created;
    });

    return NextResponse.json({ album, folder }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
