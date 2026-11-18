import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverArt } from "./cover-art";
import { formatIDR } from "@/lib/utils";
import type { Album } from "@/lib/types";

/**
 * Hero composition: a large sleeve with the vinyl sliding out behind it, framed by
 * brass measurement ticks — a deliberate nod to turntable hardware.
 */
export function HeroVisual({ album }: { album: Album }) {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* measurement frame */}
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 hidden sm:block">
        <div className="absolute left-0 top-0 h-3 w-px bg-gold/30" />
        <div className="absolute left-0 top-0 h-px w-3 bg-gold/30" />
        <div className="absolute right-0 top-0 h-3 w-px bg-gold/30" />
        <div className="absolute right-0 top-0 h-px w-3 bg-gold/30" />
        <div className="absolute bottom-0 left-0 h-3 w-px bg-gold/30" />
        <div className="absolute bottom-0 left-0 h-px w-3 bg-gold/30" />
        <div className="absolute bottom-0 right-0 h-3 w-px bg-gold/30" />
        <div className="absolute bottom-0 right-0 h-px w-3 bg-gold/30" />
        <span className="absolute -top-6 left-0 font-mono text-[0.5rem] uppercase tracking-[0.24em] text-ink-faint">
          Ref. MUG-{album.catalogueNo}
        </span>
      </div>

      <Link href={`/album/${album.slug}`} className="group relative block">
        {/* vinyl peeking out & sliding further on hover */}
        <div className="absolute right-[-9%] top-[7%] aspect-square w-[86%] transition-transform duration-700 ease-spring group-hover:translate-x-4">
          <div className="vinyl h-full w-full animate-spin-slow transition-transform duration-700 ease-spring group-hover:scale-[1.03]" />
        </div>

        {/* sleeve */}
        <div className="relative aspect-square w-[86%] translate-y-0 transition-transform duration-700 ease-spring group-hover:-translate-x-2.5">
          <CoverArt
            title={album.title}
            artist={album.artist}
            palette={album.coverPalette}
            mark={album.coverMark}
            catalogueNo={album.catalogueNo}
            variant="hero"
          />
        </div>

        {/* smoked glass spec plate - positioned cleanly below sleeve without overlapping artwork text */}
        <div className="glass-panel mt-4 w-[86%] p-3.5 transition-all duration-500 ease-spring group-hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-ink-faint">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Spesifikasi
            </span>
            <span className="chip-gold backdrop-blur-md !px-1.5 !py-0.5 !text-[0.5rem]">{album.format}</span>
          </div>

          {/* animated micro sine-wave divider */}
          <div className="my-2.5 h-3 w-full overflow-hidden opacity-75" aria-hidden="true">
            <svg
              viewBox="0 0 240 16"
              className="h-full w-[200%] animate-wave-drift text-gold/55"
              fill="none"
            >
              <path
                d="M0 8 Q 15 1, 30 8 T 60 8 T 90 8 T 120 8 T 150 8 T 180 8 T 210 8 T 240 8"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          <dl className="space-y-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.1em]">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-faint">Sample rate</dt>
              <dd className="text-ink-soft">{album.sampleRate}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-faint">Bit depth</dt>
              <dd className="text-ink-soft">{album.bitDepth}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-faint">Durasi</dt>
              <dd className="text-ink-soft">{album.totalDuration}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.1] pt-3">
            <span className="num text-sm text-gold-bright">{formatIDR(album.price)}</span>
            <ArrowUpRight
              size={14}
              className="text-gold transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </Link>

      <p className="mt-16 text-center font-mono text-[0.5rem] uppercase tracking-[0.24em] text-ink-faint sm:mt-14">
        {album.artist} — {album.year}
      </p>
    </div>
  );
}
