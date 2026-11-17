import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, Download, ShieldCheck } from "lucide-react";
import { getAlbumBySlug, listAlbums } from "@/lib/repo";
import { CoverArt } from "@/components/cover-art";
import { PreviewPlayer } from "@/components/preview-player";
import { AddToCart } from "@/components/add-to-cart";
import { AlbumCard } from "@/components/album-card";
import { formatIDR, formatSize } from "@/lib/utils";
import { TrackList } from "@/components/track-list";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const album = await getAlbumBySlug(params.slug);
  if (!album) return { title: "Album tidak ditemukan" };
  return {
    title: `${album.title} — ${album.artist}`,
    description: `${album.title} oleh ${album.artist}. ${album.format} ${album.bitDepth} / ${album.sampleRate}, ${album.trackCount} track, ${formatSize(album.totalSizeMb)}. ${album.description.slice(0, 120)}`,
    openGraph: {
      title: `${album.title} — ${album.artist}`,
      description: album.description.slice(0, 180),
    },
  };
}

export default async function AlbumPage({ params }: { params: { slug: string } }) {
  const album = await getAlbumBySlug(params.slug);
  if (!album) notFound();

  const all = await listAlbums();
  const related = all
    .filter((a) => a.id !== album.id && (a.genre === album.genre || a.format === album.format))
    .slice(0, 4);

  const specs = [
    { label: "Format audio", value: album.format },
    { label: "Sample rate", value: album.sampleRate },
    { label: "Bit depth", value: album.bitDepth },
    { label: "Jumlah track", value: `${album.trackCount} track` },
    { label: "Durasi total", value: album.totalDuration },
    { label: "Ukuran total", value: formatSize(album.totalSizeMb) },
    { label: "Label", value: album.label },
    { label: "Katalog", value: album.catalogueNo },
  ];

  return (
    <>
      <div className="shell pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
        >
          <ArrowLeft size={12} />
          Kembali ke katalog
        </Link>
      </div>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-[0.28]"
          style={{
            background: `radial-gradient(70% 100% at 30% 0%, ${album.coverPalette[1]} 0%, transparent 70%)`,
          }}
        />
        <div className="shell relative grid gap-12 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-16">
          {/* cover */}
          <div className="animate-fade-in">
            <div className="group relative mx-auto max-w-[460px]">
              <div className="absolute -right-4 top-6 hidden h-[88%] w-[86%] transition-transform duration-700 ease-spring group-hover:translate-x-5 sm:block">
                <div className="vinyl h-full w-full animate-spin-slow" />
              </div>
              <div className="relative aspect-square transition-transform duration-700 ease-spring group-hover:-translate-x-2">
                <CoverArt
                  title={album.title}
                  artist={album.artist}
                  palette={album.coverPalette}
                  mark={album.coverMark}
                  catalogueNo={album.catalogueNo}
                  variant="hero"
                />
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-[460px]">
              <PreviewPlayer seed={album.slug} title={album.title} />
            </div>
          </div>

          {/* details */}
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip-gold">{album.genre}</span>
              <span className="chip">{album.year}</span>
              <span className="chip">{album.format}</span>
              {album.featured && <span className="chip">Pilihan redaksi</span>}
            </div>

            <h1 className="display mt-6 text-[2.6rem] leading-[0.94] text-ink md:text-[3.6rem]">
              {album.title}
            </h1>
            <p className="mt-3 font-mono text-xs uppercase tracking-wide2 text-ink-mute">
              {album.artist}
            </p>

            <p className="mt-7 max-w-xl text-[0.9375rem] leading-[1.75] text-ink-soft">
              {album.description}
            </p>

            {/* price + buy */}
            <div className="mt-9 border-y border-white/[0.08] py-6">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
                    Harga Album ({album.trackCount} track · Rp 500/lagu)
                  </p>
                  <p className="num mt-1.5 font-display text-4xl text-ink">
                    {formatIDR(album.price)}
                  </p>
                </div>
                <AddToCart albumId={album.id} albumTitle={album.title} />
              </div>
            </div>

            {/* specs */}
            <div className="glass-card mt-8 p-5">
              <h2 className="eyebrow">Spesifikasi teknis</h2>
              <table className="spec-table mt-3">
                <tbody>
                  {specs.map((s) => (
                    <tr key={s.label}>
                      <th scope="row">{s.label}</th>
                      <td>{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Download, text: "Unduh tanpa batas selama akses aktif" },
                { icon: ShieldCheck, text: "Garansi 7 hari untuk tautan bermasalah" },
                { icon: Check, text: "Akses langsung ke email Google Anda" },
                { icon: Check, text: "Tanda terima dikirim lewat email" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-[0.8125rem] text-ink-mute">
                  <Icon size={13} className="mt-0.5 shrink-0 text-gold/80" strokeWidth={2} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* tracklist */}
      <section className="border-y border-white/[0.07] bg-carbon-950/50">
        <div className="shell py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Daftar lagu</p>
              <h2 className="display mt-2 text-2xl text-ink md:text-3xl">
                {album.trackCount} track · {album.totalDuration}
              </h2>
            </div>
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Preview 30 detik per track tersedia
            </p>
          </div>
          <TrackList tracks={album.tracklist} seed={album.slug} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-pad">
          <div className="shell">
            <div className="mb-8">
              <p className="eyebrow">Lanjutkan mendengarkan</p>
              <h2 className="display mt-2 text-2xl text-ink md:text-3xl">Album terkait</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
              {related.map((a, i) => (
                <AlbumCard key={a.id} album={a} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
