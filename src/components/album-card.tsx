import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { formatIDR, formatSize } from "@/lib/utils";
import type { Album } from "@/lib/types";

export function AlbumCard({ album, index = 0 }: { album: Album; index?: number }) {
  return (
    <article
      className="group relative animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 55, 400)}ms` }}
    >
      <Link href={`/album/${album.slug}`} className="block focus-visible:outline-none">
        <div className="relative aspect-square">
          {/* Vinyl record subtle peek & continuous spin on hover */}
          <div
            className="pointer-events-none absolute right-[2%] top-[4%] z-0 aspect-square w-[92%] translate-x-0 opacity-0 transition-all duration-700 ease-spring group-hover:translate-x-[7%] group-hover:opacity-100"
            aria-hidden="true"
          >
            <div className="vinyl h-full w-full animate-spin-slow shadow-[0_12px_36px_rgba(0,0,0,0.8)]" />
          </div>

          {/* Album sleeve */}
          <div className="relative z-10 h-full w-full overflow-hidden transition-transform duration-700 ease-spring group-hover:-translate-x-1 group-hover:-translate-y-1">
            <div className="h-full w-full transition-transform duration-[800ms] ease-spring group-hover:scale-[1.03]">
              <CoverArt
                title={album.title}
                artist={album.artist}
                palette={album.coverPalette}
                mark={album.coverMark}
                catalogueNo={album.catalogueNo}
              />
            </div>

            {/* Subtle darken veil on hover (hanya sedikit lebih gelap, tanpa tombol/elemen yang menutupi) */}
            <div
              className="pointer-events-none absolute inset-0 z-20 bg-black/30 opacity-0 transition-opacity duration-300 ease-spring group-hover:opacity-100"
              aria-hidden="true"
            />

            {/* Format badge on sleeve (subtle, non-obtrusive) */}
            <div className="pointer-events-none absolute right-2 top-2 z-30">
              <span className="glass-pill px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-ink-soft">
                {album.format}
              </span>
            </div>
          </div>
        </div>

        {/* Clean, untruncated info below card */}
        <div className="mt-3.5 flex items-start justify-between gap-3 border-t border-white/[0.08] pt-3 transition-colors duration-300 group-hover:border-gold/30">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 min-h-[2.6rem] font-display text-[1.0625rem] font-semibold leading-snug text-ink transition-colors duration-300 group-hover:text-gold-bright">
              {album.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5">
              {album.featured && (
                <span className="shrink-0 bg-gold px-1.5 py-0.5 font-mono text-[0.45rem] font-bold uppercase tracking-wider text-carbon-950">
                  Pilihan
                </span>
              )}
              <p className="truncate font-mono text-2xs uppercase tracking-label text-ink-mute">
                {album.artist}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="num font-display text-sm font-semibold text-gold-bright">
              {formatIDR(album.price)}
            </p>
            <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
              {album.sampleRate} · {formatSize(album.totalSizeMb)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function FeaturedCard({ album }: { album: Album }) {
  return (
    <Link
      href={`/album/${album.slug}`}
      className="glass-card group relative grid overflow-hidden hover:-translate-y-1 md:grid-cols-[0.9fr_1.1fr]"
    >
      <div className="relative aspect-square md:aspect-auto">
        <CoverArt
          title={album.title}
          artist={album.artist}
          palette={album.coverPalette}
          mark={album.coverMark}
          catalogueNo={album.catalogueNo}
          variant="hero"
        />
      </div>
      <div className="flex flex-col justify-between gap-6 p-6 md:p-9">
        <div>
          <div className="flex items-center gap-2">
            <span className="status-dot bg-gold" />
            <span className="font-mono text-2xs uppercase tracking-label text-gold-bright">
              Rilis pilihan
            </span>
          </div>
          <h3 className="display mt-4 text-3xl text-ink md:text-[2.6rem]">{album.title}</h3>
          <p className="mt-2 font-mono text-2xs uppercase tracking-label text-ink-mute">
            {album.artist} · {album.year} · {album.label}
          </p>
          <p className="mt-5 line-clamp-3 max-w-md text-sm leading-relaxed text-ink-soft">
            {album.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute">
            <span>{album.format}</span>
            <span>{album.sampleRate}</span>
            <span>{album.bitDepth}</span>
            <span>{album.trackCount} track</span>
          </div>
          <span className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-label text-ink transition-colors group-hover:text-gold-bright">
            {formatIDR(album.price)}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
