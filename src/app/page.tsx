import Link from "next/link";
import { ArrowRight, ArrowUpRight, Headphones, ShieldCheck, Zap } from "lucide-react";
import { listAlbums } from "@/lib/repo";
import { AlbumCard, FeaturedCard } from "@/components/album-card";
import { PreviewPlayer } from "@/components/preview-player";
import { HeroVisual } from "@/components/hero-visual";
import { CatalogueBrowser } from "@/components/catalogue-browser";
import { AudioMotionGraphic } from "@/components/audio-motion-graphic";

export const dynamic = "force-dynamic";

const STATS = [
  { value: "Rp 500", label: "Per lagu per album" },
  { value: "100%", label: "FLAC tanpa kompresi lossy" },
  { value: "< 5 mnt", label: "Akses Drive terkirim" },
  { value: "∞", label: "Unduh kapan saja" },
];

const STEPS = [
  {
    n: "01",
    title: "Pilih album",
    body: "Dengarkan preview 30 detik dan periksa spesifikasi teknis lengkap sebelum membeli.",
  },
  {
    n: "02",
    title: "Masuk dengan Google",
    body: "Akses file diberikan langsung ke email Google Anda — bukan tautan publik yang bisa bocor.",
  },
  {
    n: "03",
    title: "Bayar dengan QRIS",
    body: "Satu pemindaian dari m-banking atau e-wallet apa pun. Tanpa kartu, tanpa akun tambahan.",
  },
  {
    n: "04",
    title: "Unduh selamanya",
    body: "Folder album muncul di Google Drive Anda dalam hitungan menit, plus nota lewat email.",
  },
];

export default async function HomePage() {
  const albums = await listAlbums();
  const featured = albums.filter((a) => a.featured).slice(0, 2);
  const heroAlbum = featured[0] ?? albums[0];
  const genres = Array.from(new Set(albums.map((a) => a.genre))).sort();

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="pointer-events-none absolute inset-0 grain" />
        <div
          className="pointer-events-none absolute -right-[18%] top-[-10%] h-[720px] w-[720px] rounded-full opacity-60 blur-[2px]"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 38%, transparent 68%)",
          }}
        />

        {/* Dynamic Harmonic Oscilloscope Motion Graphic */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 opacity-80" aria-hidden="true">
          <AudioMotionGraphic className="h-full w-full" density="high" />
        </div>

        <div className="shell relative grid items-center gap-14 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold/60" />
              <span className="font-mono text-2xs uppercase tracking-wide2 text-gold-bright">
                Arsip High Audio · Indonesia
              </span>
            </div>

            <h1 className="mt-7 font-display text-[3.2rem] font-bold leading-[0.96] tracking-[-0.03em] text-ink sm:text-[4.2rem] lg:text-[4.9rem]">
              Dengar
              <br />
              <span className="text-gold-gradient font-black">setiap</span>{" "}
              <em className="font-editorial text-[1.12em] font-normal italic text-gold-bright">lapisan.</em>
            </h1>

            <p className="mt-7 max-w-md text-[0.9375rem] leading-[1.75] text-ink-soft">
              Koleksi master album FLAC Lossless 16-bit dan Studio Master 24-bit — patokan tarif Rp 500/lagu dikirim langsung ke Google Drive Anda. Beli sekali, akses permanen.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="#katalog" className="btn-gold">
                Telusuri katalog
                <ArrowRight size={15} />
              </Link>
              <Link href="/cara-unduh" className="btn-outline">
                Bagaimana cara kerjanya?
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-white/[0.08] pt-7 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="num font-display text-xl text-ink">{s.value}</p>
                  <p className="mt-1 font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-ink-faint">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in">
            <HeroVisual album={heroAlbum} />
          </div>
        </div>

        {/* format marquee */}
        <div className="relative border-t border-white/[0.06] py-4">
          <div className="flex items-center gap-10 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center gap-10" aria-hidden={dup === 1}>
                {[
                  "FLAC 24-bit / 96 kHz Studio Master",
                  "FLAC 16-bit / 44.1 kHz CD Quality",
                  "Tarif Rp 500 / Lagu Per Album",
                  "Mastering Asli Tanpa Kompresi Lossy",
                  "Akses Langsung ke Google Drive Pribadi",
                  "Bantuan WhatsApp & Discord Aktif",
                ].map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-10 font-mono text-2xs uppercase tracking-wide2 text-ink-faint"
                  >
                    {item}
                    <span className="h-1 w-1 rotate-45 bg-gold/50" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── FEATURED ───────────────────────── */}
      {featured.length > 0 && (
        <section className="section-pad">
          <div className="shell">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Kurasi redaksi</p>
                <h2 className="display mt-3 text-3xl text-ink md:text-[2.75rem]">
                  Rilis yang wajib didengar
                </h2>
              </div>
              <Link
                href="/jelajah"
                className="group inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
              >
                Semua album
                <ArrowUpRight
                  size={13}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {featured.map((album) => (
                <FeaturedCard key={album.id} album={album} />
              ))}
            </div>

            {heroAlbum && (
              <div className="mt-5">
                <PreviewPlayer seed={heroAlbum.slug} title={heroAlbum.title} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────────────────────── CATALOGUE ───────────────────────── */}
      <section id="katalog" className="relative border-y border-white/[0.07] bg-carbon-950/40 section-pad">
        <div className="shell">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Katalog lengkap</p>
              <h2 className="display mt-3 text-3xl text-ink md:text-[2.75rem]">
                {albums.length} album, satu standar
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink-mute">
              Setiap album diverifikasi spesifikasinya dan disimpan sebagai folder pribadi di
              Google Drive — bukan tautan publik.
            </p>
          </div>

          <CatalogueBrowser albums={albums} genres={genres} />
        </div>
      </section>

      {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
      <section className="section-pad">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="eyebrow">Alur pembelian</p>
              <h2 className="display mt-3 text-3xl text-ink md:text-[2.75rem]">
                Empat langkah,
                <br />
                tanpa teka-teki.
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-mute">
                Seluruh proses berjalan berurutan dan terekam. Jika ada yang gagal di tengah
                jalan, sistem mencoba ulang secara otomatis — Anda tidak perlu menghubungi siapa
                pun.
              </p>

              <div className="mt-9 space-y-4">
                {[
                  { icon: Zap, text: "QRIS terbit dalam hitungan detik setelah checkout" },
                  { icon: ShieldCheck, text: "Akses hanya untuk email Google yang Anda pakai" },
                  { icon: Headphones, text: "Garansi 7 hari untuk tautan bermasalah" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-gold/30 bg-gold/[0.06] text-gold">
                      <Icon size={13} strokeWidth={1.6} />
                    </span>
                    <p className="text-sm leading-relaxed text-ink-soft">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <ol className="relative space-y-0">
              <span className="absolute bottom-8 left-[1.4375rem] top-8 w-px bg-gradient-to-b from-gold/50 via-white/10 to-transparent" />
              {STEPS.map((step) => (
                <li key={step.n} className="relative flex gap-6 pb-9 last:pb-0">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center border border-white/12 bg-carbon-900 font-mono text-2xs text-gold">
                    {step.n}
                  </span>
                  <div className="pt-1">
                    <h3 className="font-display text-xl text-ink">{step.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-mute">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────────────────────── FORMATS ───────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/[0.07] bg-carbon-950">
        <div className="pointer-events-none absolute inset-0 groove-bg opacity-40" />
        <div className="shell relative section-pad">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Spesifikasi</p>
            <h2 className="display mt-3 text-3xl text-ink md:text-[2.75rem]">
              Format yang tidak berkompromi
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ink-mute">
              Kami tidak menjual transcode. Setiap master disimpan dalam format aslinya dan
              diverifikasi bit depth serta sample rate-nya sebelum dipublikasikan.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              {
                fmt: "FLAC 24-bit",
                rate: "Hi-Res Studio",
                hz: "48–96 kHz",
                body: "Master studio resolusi tinggi dengan rentang dinamika maksimal dan pemisahan frekuensi yang utuh.",
              },
              {
                fmt: "FLAC 16-bit",
                rate: "CD Lossless",
                hz: "44.1 kHz",
                body: "Kualitas audio murni standar Red Book CD tanpa kompresi bitrate, jauh melampaui streaming lossy biasa.",
              },
              {
                fmt: "Rp 500 / Lagu",
                rate: "Tarif Terjangkau",
                hz: "Per Album",
                body: "Kontribusi transparan Rp 500 per judul lagu dalam 1 album untuk operasional cloud storage dan kurasi arsip.",
              },
            ].map((f) => (
              <div
                key={f.fmt}
                className="glass-card group relative overflow-hidden p-7 hover:-translate-y-1.5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl text-gold-bright">{f.fmt}</span>
                  <span className="glass-pill px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-label text-ink-soft">
                    {f.hz}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-2xs uppercase tracking-label text-ink-mute">
                  {f.rate}
                </p>
                <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-mute transition-colors duration-300 group-hover:text-ink-soft">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="section-pad">
        <div className="shell">
          <div className="glass-panel relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full opacity-70"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.16) 0%, transparent 68%)",
              }}
            />
            <div className="relative flex flex-col items-start justify-between gap-8 p-8 md:flex-row md:items-center md:p-14">
              <div>
                <p className="eyebrow">Mulai mendengarkan</p>
                <h2 className="display mt-3 max-w-xl text-3xl text-ink md:text-[2.6rem]">
                  Album pertama Anda berjarak satu pemindaian QRIS.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-mute">
                  Masuk dengan akun Google, pilih album, dan bayar. Akses dikirim otomatis —
                  biasanya di bawah lima menit.
                </p>
              </div>
              <Link href="/masuk" className="btn-gold shrink-0">
                Masuk & mulai
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
