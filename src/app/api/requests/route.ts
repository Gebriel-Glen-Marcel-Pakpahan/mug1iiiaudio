import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAlbumRequest, listAlbumRequests } from "@/lib/repo";
import { jsonError, rateLimit } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  albumTitle: z.string().min(2, "Judul album minimal 2 karakter").max(120),
  artist: z.string().min(2, "Nama artis/band minimal 2 karakter").max(120),
  year: z.string().max(30).optional().nullable(),
  formatPreference: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  userContact: z.string().max(100).optional().nullable(),
  userEmail: z.string().email("Format email tidak valid").optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const my = searchParams.get("my") === "true";

    let userId: string | undefined = undefined;
    if (my) {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) userId = session.user.id;
    }

    const requests = await listAlbumRequests(userId ? { userId } : undefined);
    return NextResponse.json(requests);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    if (!rateLimit(`request:${session?.user?.id ?? ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan tunggu sebentar." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Data tidak valid." }, { status: 400 });
    }

    const email = session?.user?.email ?? parsed.data.userEmail;
    if (!email) {
      return NextResponse.json({ error: "Mohon cantumkan email Anda agar kami dapat memberi kabar." }, { status: 400 });
    }

    const newRequest = await createAlbumRequest({
      userId: session?.user?.id ?? null,
      userEmail: email,
      userContact: parsed.data.userContact ?? null,
      albumTitle: parsed.data.albumTitle,
      artist: parsed.data.artist,
      year: parsed.data.year ?? null,
      formatPreference: parsed.data.formatPreference ?? null,
      notes: parsed.data.notes ?? null,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
