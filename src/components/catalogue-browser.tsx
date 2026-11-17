"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AlbumCard } from "./album-card";
import { cn, formatIDR } from "@/lib/utils";
import type { Album } from "@/lib/types";

type Sort = "terbaru" | "harga-asc" | "harga-desc" | "judul";

const SORTS: { id: Sort; label: string }[] = [
  { id: "terbaru", label: "Terbaru" },
  { id: "judul", label: "A–Z" },
  { id: "harga-asc", label: "Harga ↑" },
  { id: "harga-desc", label: "Harga ↓" },
];

export function CatalogueBrowser({
  albums,
  genres,
  initialGenre = "Semua",
  compact = false,
}: {
  albums: Album[];
  genres: string[];
  initialGenre?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState(initialGenre);
  const [sort, setSort] = useState<Sort>("terbaru");
  const [showFilters, setShowFilters] = useState(false);

  const formats = useMemo(
    () => Array.from(new Set(albums.map((a) => a.format))),
    [albums],
  );
  const [format, setFormat] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = albums.filter((a) => {
      const matchesQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        a.genre.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q);
      const matchesGenre = genre === "Semua" || a.genre === genre;
      const matchesFormat = !format || a.format === format;
      return matchesQuery && matchesGenre && matchesFormat;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "harga-asc":
          return a.price - b.price;
        case "harga-desc":
          return b.price - a.price;
        case "judul":
          return a.title.localeCompare(b.title, "id");
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
  }, [albums, query, genre, sort, format]);

  const activeFilters = (genre !== "Semua" ? 1 : 0) + (format ? 1 : 0);

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-y border-white/[0.07] py-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, artis, label…"
            aria-label="Cari album"
            className="field py-2.5 pl-9 pr-3 text-[0.8125rem]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={cn(
                  "px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-label transition-colors",
                  sort === s.id
                    ? "bg-gold/[0.12] text-gold-bright"
                    : "text-ink-mute hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 border px-3.5 py-2 font-mono text-[0.625rem] uppercase tracking-label transition-colors",
              showFilters || activeFilters
                ? "border-gold/40 text-gold-bright"
                : "border-white/12 text-ink-mute hover:text-ink",
            )}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={12} />
            Filter
            {activeFilters > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[0.5rem] text-carbon-950">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* filter drawer */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-500 ease-spring",
          showFilters ? "max-h-60 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="glass-card my-3 flex flex-col gap-5 p-5 md:flex-row md:gap-10">
          <div>
            <p className="label">Genre</p>
            <div className="flex flex-wrap gap-1.5">
              {["Semua", ...genres].map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={cn(
                    "border px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-label transition-colors",
                    genre === g
                      ? "border-gold/50 bg-gold/10 text-gold-bright"
                      : "border-white/10 text-ink-mute hover:border-white/25 hover:text-ink",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Format</p>
            <div className="flex flex-wrap gap-1.5">
              {formats.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat((cur) => (cur === f ? null : f))}
                  className={cn(
                    "border px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-label transition-colors",
                    format === f
                      ? "border-gold/50 bg-gold/10 text-gold-bright"
                      : "border-white/10 text-ink-mute hover:border-white/25 hover:text-ink",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* result meta */}
      <div className="flex items-center justify-between gap-4 py-5">
        <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
          {results.length} album
          {genre !== "Semua" && ` · ${genre}`}
          {format && ` · ${format}`}
        </p>
        {(query || activeFilters > 0) && (
          <button
            onClick={() => {
              setQuery("");
              setGenre("Semua");
              setFormat(null);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
          >
            <X size={11} />
            Reset
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/12 py-24 text-center">
          <p className="font-display text-2xl text-ink">Tidak ada album yang cocok</p>
          <p className="mt-2 max-w-xs text-sm text-ink-mute">
            Coba kata kunci lain atau longgarkan filter genre dan format.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-x-5 gap-y-10",
            compact
              ? "grid-cols-2 lg:grid-cols-3"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {results.map((album, i) => (
            <AlbumCard key={album.id} album={album} index={i} />
          ))}
        </div>
      )}

      {!compact && results.length > 0 && (
        <p className="mt-10 text-center font-mono text-2xs uppercase tracking-label text-ink-faint">
          Tarif Rp 500 / lagu per album · Pembayaran QRIS
        </p>
      )}
    </div>
  );
}
