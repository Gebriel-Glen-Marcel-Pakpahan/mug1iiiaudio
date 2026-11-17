"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { CoverArt } from "./cover-art";
import { formatIDR, formatSize } from "@/lib/utils";

interface Row {
  id: string;
  albumId: string;
  slug: string;
  title: string;
  artist: string;
  price: number;
  format: string;
  sampleRate: string;
  bitDepth: string;
  totalSizeMb: number;
  palette: [string, string, string];
  mark: string;
  catalogueNo: string;
}

export function CartView({
  items,
  subtotal,
  email,
}: {
  items: Row[];
  subtotal: number;
  email: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function remove(itemId: string) {
    setRemoving(itemId);
    try {
      await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setRemoving(null);
    }
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-white/12 py-28 text-center">
        <ShoppingBag size={28} strokeWidth={1.2} className="text-ink-faint" />
        <p className="mt-5 font-display text-2xl text-ink">Keranjang masih kosong</p>
        <p className="mt-2 max-w-xs text-sm text-ink-mute">
          Tambahkan album dari katalog untuk memulai pembelian.
        </p>
        <Link href="/" className="btn-gold mt-7">
          Telusuri katalog
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
      <div>
        <ul className="border-t border-white/[0.08]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-5 border-b border-white/[0.08] py-6 first:pt-5"
            >
              <Link
                href={`/album/${item.slug}`}
                className="relative aspect-square w-20 shrink-0 sm:w-24"
              >
                <CoverArt
                  title={item.title}
                  artist={item.artist}
                  palette={item.palette}
                  mark={item.mark}
                  catalogueNo={item.catalogueNo}
                  variant="thumb"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/album/${item.slug}`}
                      className="block truncate font-display text-lg text-ink transition-colors hover:text-gold-bright"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 font-mono text-2xs uppercase tracking-label text-ink-mute">
                      {item.artist}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm text-ink">{formatIDR(item.price)}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                  <span className="text-gold/80">{item.format}</span>
                  <span>{item.bitDepth}</span>
                  <span>{item.sampleRate}</span>
                  <span>{formatSize(item.totalSizeMb)}</span>
                </div>

                <button
                  onClick={() => void remove(item.id)}
                  disabled={removing === item.id}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint transition-colors hover:text-signal-bad"
                >
                  {removing === item.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass-panel p-6">
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink-faint">
            Ringkasan pesanan
          </h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-mute">Subtotal</dt>
              <dd className="num text-ink">{formatIDR(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-mute">Tarif</dt>
              <dd className="font-mono text-[0.6875rem] text-ink-faint">Rp 500 / lagu</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-mute">Metode bayar</dt>
              <dd className="font-mono text-[0.6875rem] text-ink-soft">QRIS</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-white/[0.08] pt-5">
            <span className="font-mono text-2xs uppercase tracking-label text-ink-mute">Total</span>
            <span className="num font-display text-2xl text-ink">{formatIDR(subtotal)}</span>
          </div>

          <div className="mt-5 border border-white/[0.08] bg-carbon-950/60 p-3.5">
            <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
              File dikirim ke
            </p>
            <p className="mt-1.5 truncate font-mono text-xs text-gold-bright">{email}</p>
          </div>

          <Link href="/checkout" className="btn-gold mt-5 w-full justify-center">
            Lanjut ke checkout
            <ArrowRight size={15} />
          </Link>

          <p className="mt-4 text-center font-mono text-[0.5rem] uppercase leading-relaxed tracking-label text-ink-faint">
            Barang digital · non-refundable setelah akses terkirim
          </p>
        </div>
      </aside>
    </div>
  );
}
