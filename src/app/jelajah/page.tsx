import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listAlbums } from "@/lib/repo";
import { CatalogueBrowser } from "@/components/catalogue-browser";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Jelajah katalog",
  description: "Telusuri seluruh album lossless MUG1III AUDIO berdasarkan genre, format, dan harga.",
};

export default async function JelajahPage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const albums = await listAlbums();
  const genres = Array.from(new Set(albums.map((a) => a.genre))).sort();

  return (
    <div className="shell py-14">
      <div className="mb-10 max-w-2xl">
        <p className="eyebrow">Jelajah</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Seluruh arsip</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-mute">
          {albums.length} album lossless, dikurasi satu per satu. Setiap halaman album memuat
          spesifikasi teknis lengkap dan preview 30 detik.
        </p>
      </div>

      <CatalogueBrowser albums={albums} genres={genres} initialGenre={searchParams.genre ?? "Semua"} />

      <div className="mt-16 flex flex-col items-start justify-between gap-5 border border-white/[0.08] bg-carbon-850 p-6 md:flex-row md:items-center md:p-8">
        <div>
          <p className="font-display text-xl text-ink">Tidak menemukan album yang dicari?</p>
          <p className="mt-1.5 text-sm text-ink-mute">
            Hubungi kami — banyak rilis masuk tanpa pengumuman.
          </p>
        </div>
        <Link href="/kontak" className="btn-outline shrink-0">
          Hubungi support
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
