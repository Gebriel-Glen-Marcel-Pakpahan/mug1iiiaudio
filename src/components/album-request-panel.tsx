"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Check,
  Clock,
  Compass,
  Disc,
  Filter,
  Headphones,
  Loader2,
  MessageSquare,
  Music,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { AlbumRequest, AlbumRequestStatus } from "@/lib/types";

const FORMAT_OPTIONS = [
  "FLAC 24-bit Hi-Res (Direkomendasikan)",
  "FLAC 16-bit 44.1kHz (CD Quality)",
  "DSD / SACD Rip",
  "Semua Format Lossless yang Tersedia",
];

const STATUS_CONFIG: Record<
  AlbumRequestStatus,
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Menunggu Kurasi",
    badgeClass: "border-signal-warn/40 bg-signal-warn/10 text-signal-warn",
    icon: Clock,
  },
  SEARCHING: {
    label: "Sedang Dicari",
    badgeClass: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    icon: Compass,
  },
  FULFILLED: {
    label: "Tersedia di Katalog",
    badgeClass: "border-signal-ok/40 bg-signal-ok/10 text-signal-ok",
    icon: Check,
  },
  REJECTED: {
    label: "Belum Ditemukan",
    badgeClass: "border-white/20 bg-white/5 text-ink-mute",
    icon: Disc,
  },
};

export function AlbumRequestPanel({ initialRequests }: { initialRequests: AlbumRequest[] }) {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<AlbumRequest[]>(initialRequests);
  const [filter, setFilter] = useState<"ALL" | AlbumRequestStatus>("ALL");

  // Form states
  const [albumTitle, setAlbumTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [formatPreference, setFormatPreference] = useState(FORMAT_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [userContact, setUserContact] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const emailToUse = session?.user?.email || userEmail;
    if (!emailToUse) {
      setErrorMsg("Mohon cantumkan alamat email Anda.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumTitle,
          artist,
          year: year || null,
          formatPreference,
          notes: notes || null,
          userContact: userContact || null,
          userEmail: emailToUse,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengirim permintaan.");
      }

      const created = (await res.json()) as AlbumRequest;
      setRequests((prev) => [created, ...prev]);
      setSuccessMsg(`Permintaan untuk album "${created.albumTitle}" berhasil diajukan! Kurator kami akan mencarikan master audio FLAC terbaik.`);
      setAlbumTitle("");
      setArtist("");
      setYear("");
      setNotes("");
      setUserContact("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter((r) => (filter === "ALL" ? true : r.status === filter));

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1.3fr] lg:gap-14">
      {/* ── Sisi Kiri: Formulir Pengajuan Request ── */}
      <div>
        <div className="plate p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            <h2 className="font-mono text-xs uppercase tracking-label text-gold-bright">
              Formulir Permintaan Album
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-mute">
            Katalog kami terus bertambah. Jika album yang Anda inginkan belum tersedia, isi data di bawah.
            Kami memprioritaskan rilisan dengan rekaman master FLAC 24-bit / 16-bit murni.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                Judul Album <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                required
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Contoh: Sheila On 7 - 507 / Bintang Lima"
                className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                Nama Musisi / Band <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Contoh: Sheila On 7 / Dewa 19 / Chrisye"
                className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                  Tahun Rilis / Label (Opsional)
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Contoh: 2006 / Sony Music"
                  className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                  Preferensi Format Audio
                </label>
                <select
                  value={formatPreference}
                  onChange={(e) => setFormatPreference(e.target.value)}
                  className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3 py-2.5 font-sans text-xs text-ink focus:border-gold/60 focus:outline-none"
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-carbon-900 text-ink">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!session?.user && (
              <div>
                <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                  Email Anda (Untuk Notifikasi Saat Tersedia) <span className="text-gold">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                No. WhatsApp / Discord (Opsional)
              </label>
              <input
                type="text"
                value={userContact}
                onChange={(e) => setUserContact(e.target.value)}
                placeholder="Contoh: 0812xxxx / username#0000"
                className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[0.625rem] uppercase tracking-label text-ink-faint">
                Catatan Khusus (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Cari edisi Vinyl Rip 24-bit 96kHz, sertakan booklet jika ada."
                className="mt-1.5 w-full border border-white/10 bg-carbon-950/70 px-3.5 py-2 font-sans text-xs text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
              />
            </div>

            {successMsg && (
              <div className="border border-signal-ok/40 bg-signal-ok/10 p-3 text-xs text-signal-ok">
                <div className="flex items-center gap-2">
                  <Check size={14} />
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="border border-signal-bad/40 bg-signal-bad/10 p-3 text-xs text-signal-bad">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Mengirimkan Permintaan…
                </>
              ) : (
                <>
                  <Send size={13} />
                  Kirim Permintaan Album
                </>
              )}
            </button>
          </form>

          {/* Jalur Cepat via WhatsApp */}
          <div className="mt-6 border-t border-white/[0.08] pt-5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Butuh Cepat atau Ingin Konsultasi Master?
            </p>
            <a
              href={`https://wa.me/6285973023210?text=${encodeURIComponent(
                "Halo Admin MUG1III, saya ingin request album audio FLAC khusus. Apakah bisa dibantu cari?",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm mt-2.5 flex w-full items-center justify-center gap-2 text-xs"
            >
              <MessageSquare size={13} />
              Request Langsung via WhatsApp (+6285973023210)
            </a>
          </div>
        </div>
      </div>

      {/* ── Sisi Kanan: Papan Request Komunitas ── */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-ink">Daftar Permintaan</h2>
            <p className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              {requests.length} album sedang dalam antrean kurasi
            </p>
          </div>

          {/* Filter Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={12} className="text-ink-faint" />
            {(["ALL", "PENDING", "SEARCHING", "FULFILLED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-label transition-colors",
                  filter === s
                    ? "border border-gold/40 bg-gold/10 text-gold-bright"
                    : "border border-white/10 text-ink-mute hover:text-ink",
                )}
              >
                {s === "ALL" ? "Semua" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="plate p-10 text-center">
            <Music size={28} className="mx-auto text-ink-faint" />
            <p className="mt-3 text-sm text-ink-mute">Belum ada permintaan di kategori ini.</p>
            <p className="mt-1 text-xs text-ink-faint">
              Jadilah yang pertama mengajukan album favorit Anda melalui formulir di samping!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={req.id}
                  className="group relative border border-white/[0.08] bg-carbon-850/50 p-4 transition-all hover:border-gold/30 hover:bg-carbon-800/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Headphones size={13} className="text-gold" />
                        <h3 className="font-display text-base font-semibold text-ink group-hover:text-gold-bright">
                          {req.albumTitle}
                        </h3>
                      </div>
                      <p className="mt-1 font-mono text-xs uppercase tracking-label text-ink-mute">
                        {req.artist} {req.year && `· ${req.year}`}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider border",
                        cfg.badgeClass,
                      )}
                    >
                      <Icon size={10} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 text-2xs text-ink-faint">
                    <span className="font-mono">Format: {req.formatPreference || "FLAC 24-bit"}</span>
                    <span>Diajukan {formatDate(req.createdAt)}</span>
                  </div>

                  {req.notes && (
                    <p className="mt-2 text-2xs italic text-ink-soft">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}

                  {req.adminNote && (
                    <div className="mt-2.5 border-l-2 border-gold/60 bg-gold/[0.03] pl-2.5 py-1 text-2xs text-gold-bright">
                      <span className="font-mono uppercase tracking-label text-[0.5rem] text-ink-faint block">
                        Catatan Kurator:
                      </span>
                      {req.adminNote}
                    </div>
                  )}

                  {req.status === "FULFILLED" && (
                    <div className="mt-3">
                      <Link
                        href="/"
                        className="btn-gold btn-sm inline-flex items-center gap-1.5 text-[0.625rem]"
                      >
                        <Check size={11} />
                        Lihat di Katalog
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
