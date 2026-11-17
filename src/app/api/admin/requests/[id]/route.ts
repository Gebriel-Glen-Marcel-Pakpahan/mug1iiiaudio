import { NextResponse } from "next/server";
import { deleteAlbumRequest, updateAlbumRequestStatus } from "@/lib/repo";
import { jsonError, requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  status: z.enum(["PENDING", "SEARCHING", "FULFILLED", "REJECTED"]),
  adminNote: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Data tidak valid." }, { status: 400 });
    }

    const updated = await updateAlbumRequestStatus(params.id, parsed.data.status, parsed.data.adminNote);
    if (!updated) {
      return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const ok = await deleteAlbumRequest(params.id);
    if (!ok) {
      return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
