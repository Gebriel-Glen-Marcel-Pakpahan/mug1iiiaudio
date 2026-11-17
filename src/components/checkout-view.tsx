"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface Item {
  id: string;
  title: string;
  artist: string;
  price: number;
  format: string;
  sampleRate: string;
  albumId?: string;
  bitDepth: string;
}

export function CheckoutView({
  email,
  name,
  subtotal,
  items,
  directAlbumId,
}: {
  email: string;
  name: string | null;
  subtotal: number;
  items: Item[];
  directAlbumId?: string;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!agreed) return;
    setLoading(true);
    setError(null);
    try {
      const targetAlbumId = directAlbumId || (items.length === 1 ? items[0].albumId : undefined);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: targetAlbumId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout gagal.");
      router.push(`/bayar/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout gagal.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
      <div className="space-y-6">
        {/* access email */}
        <section className="plate p-6 md:p-7">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-gold" />
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              Email penerima akses
            </h2>
          </div>

          <div className="mt-4 border border-gold/25 bg-gold/[0.05] p-4">
            <p className="truncate font-mono text-sm text-gold-bright">{email}</p>
            {name && (
              <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                {name}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-signal-warn" />
            <p className="text-[0.75rem] leading-relaxed text-ink-mute">
              Akses file diberikan ke email Google ini dan <strong className="text-ink-soft">tidak
              dapat diganti</strong> setelah pembayaran. Pastikan akun aktif dan dapat membuka
              Google Drive.
            </p>
          </div>
        </section>

        {/* items */}
        <section className="plate p-6 md:p-7">
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
            Album yang dibeli ({items.length})
          </h2>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{item.title}</p>
                  <p className="mt-0.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                    {item.artist} · {item.format} {item.bitDepth} / {item.sampleRate}
                  </p>
                </div>
                <p className="num shrink-0 text-sm text-ink-soft">{formatIDR(item.price)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* policy */}
        <section className="plate p-6 md:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-gold" />
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              Kebijakan pembelian
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-[0.8125rem] leading-relaxed text-ink-mute">
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 bg-gold/60" />
              Barang digital bersifat non-refundable setelah akses link terkirim.
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 bg-gold/60" />
              Garansi 7 hari berlaku untuk link rusak atau file tidak lengkap karena kesalahan
              penjual.
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 bg-gold/60" />
              Unduhan tanpa batas selama akses aktif. Tarif Rp 500 / lagu (harga bersih).
            </li>
          </ul>

          <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-white/[0.07] pt-5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 appearance-none border border-white/25 bg-transparent checked:border-gold checked:bg-gold checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22%3E%3Cpath d=%22M2 6.2l2.6 2.6L10 3.4%22 stroke=%22%230B0B0F%22 stroke-width=%221.8%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E')] focus-visible:outline-none"
            />
            <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
              Saya memahami email akses tidak dapat diganti dan menyetujui kebijakan refund &
              garansi.
            </span>
          </label>
        </section>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="plate p-6">
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink-faint">
            Total pembayaran
          </h2>
          <p className="num mt-3 font-display text-4xl text-ink">{formatIDR(subtotal)}</p>
          <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
            Harga Bersih · IDR
          </p>

          <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-5 text-[0.8125rem]">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between gap-3 text-ink-mute">
                <span className="truncate">{i.title}</span>
                <span className="num shrink-0">{formatIDR(i.price)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={pay}
            disabled={!agreed || loading}
            className="btn-gold mt-6 w-full justify-center"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            Bayar dengan QRIS
          </button>

          <p className="mt-4 text-center font-mono text-[0.5rem] uppercase leading-relaxed tracking-label text-ink-faint">
            Kode QR akan tampil dalam beberapa detik
          </p>

          {error && (
            <p className="mt-3 text-center text-xs text-signal-bad" role="alert">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
