"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn, formatDateTime, formatIDR } from "@/lib/utils";
import type { OrderView } from "@/lib/types";

type Live = {
  status: OrderView["status"];
  paymentStatus: OrderView["paymentStatus"];
  accessStatus: OrderView["accessStatus"];
  paidAt?: string | null;
};

export function QrisRenderer({ order }: { order: OrderView }) {
  const router = useRouter();
  const [live, setLive] = useState<Live>({
    status: order.status,
    paymentStatus: order.paymentStatus,
    accessStatus: order.accessStatus,
    paidAt: order.paidAt,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(() =>
    order.payment?.expiresAt
      ? Math.max(0, Math.floor((new Date(order.payment.expiresAt).getTime() - Date.now()) / 1000))
      : 15 * 60,
  );
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  /* ── 1. Render QR image from stored QRIS payload ── */
  useEffect(() => {
    if (!order.payment?.qrString) return;
    fetch(`/api/orders/${order.id}/qr`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setQrDataUrl(d.qrDataUrl))
      .catch(() => undefined);
  }, [order.id, order.payment?.qrString]);

  /* ── 2. Automatic Live Polling (Setiap 3 Detik) ── */
  useEffect(() => {
    if (live.status !== "PENDING") return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Live;
        if (!alive) return;
        setLive(data);
        if (data.status !== "PENDING") {
          router.refresh();
        }
      } catch {
        /* transient */
      }
    };
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [live.status, order.id, router]);

  /* ── 3. Countdown Timer QRIS ── */
  useEffect(() => {
    if (live.status !== "PENDING") return;
    const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [live.status]);

  /* ── Manual Check Status ── */
  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Live;
        setLive(data);
        if (data.status !== "PENDING") router.refresh();
      }
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  /* ── Direct Payment Confirmation (for real testing & manual transfer verification) ── */
  const handleConfirmPaid = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as Live;
        setLive(data);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setConfirmError(err.error || "Gagal memproses verifikasi.");
      }
    } catch {
      setConfirmError("Koneksi gagal. Silakan coba kembali.");
    } finally {
      setConfirming(false);
    }
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  /* ─────────────────────────────────────────────────────────────
   * EVALUASI LOGIKA KONDISI (IF BRANCHING):
   * 1. isPaid: Sudah Terbayar (LUNAS)
   * 2. isExpired: Waktu QRIS Habis (Kedaluwarsa)
   * 3. isFailed: Pembayaran Dibatalkan / Gagal
   * 4. isPending: Belum Terbayar (Menunggu Pembayaran dalam Waktu QRIS)
   * ───────────────────────────────────────────────────────────── */
  const isPaid = live.status === "PAID" || live.status === "REFUNDED";
  const isExpired = remaining === 0 && live.status === "PENDING";
  const isFailed = live.status === "CANCELLED";

  /* ═════════════════════════════════════════════════════════════
   * [IF 1]: PROSES SUDAH TERBAYAR (STATUS: PAID / LUNAS)
   * ═════════════════════════════════════════════════════════════ */
  if (isPaid) {
    const granted = live.accessStatus === "GRANTED";
    const driveLink = order.driveLinks?.[0]?.linkUrl ?? `/pesanan/${order.id}`;

    return (
      <div className="mx-auto max-w-2xl animate-fade-up">
        {/* Banner Status Terbayar */}
        <div className="mb-6 flex items-center justify-between border border-signal-ok/40 bg-signal-ok/10 px-5 py-3.5 text-signal-ok">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Status Pembayaran: SUDAH TERBAYAR (LUNAS)
            </span>
          </div>
          <span className="font-mono text-2xs uppercase tracking-label text-signal-ok/80">
            Terverifikasi Sistem
          </span>
        </div>

        <div className="plate p-8 md:p-12">
          {/* Header Berhasil */}
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-signal-ok/50 bg-signal-ok/15 shadow-[0_0_30px_rgba(34,197,94,0.25)]">
              <Check size={36} className="text-signal-ok" />
            </div>
            <h1 className="display mt-6 text-3xl text-ink md:text-4xl">Pembayaran Berhasil</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-mute">
              Terima kasih! Pesanan <span className="font-mono text-gold-bright">{order.orderNumber}</span>{" "}
              telah lunas sebesar <span className="num font-semibold text-ink">{formatIDR(order.totalAmount)}</span>.
            </p>
            {order.paidAt && (
              <p className="mt-1 font-mono text-2xs uppercase tracking-label text-ink-faint">
                Waktu Transaksi: {formatDateTime(order.paidAt)}
              </p>
            )}
          </div>

          {/* Kotak Status Akses Google Drive */}
          <div className="mt-8 border border-white/[0.1] bg-carbon-950/70 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                {granted ? (
                  <ShieldCheck size={18} className="text-signal-ok" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-signal-warn" />
                )}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-label text-ink">
                    {granted ? "Izin Google Drive Aktif" : "Menyiapkan Izin Folder…"}
                  </h3>
                  <p className="mt-0.5 text-2xs text-ink-mute">
                    Email Akun: <span className="font-mono text-gold-bright">{order.userEmail}</span>
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "font-mono text-[0.625rem] uppercase tracking-wider px-2 py-0.5 border",
                  granted
                    ? "border-signal-ok/40 bg-signal-ok/10 text-signal-ok"
                    : "border-signal-warn/40 bg-signal-warn/10 text-signal-warn",
                )}
              >
                {granted ? "Akses Terbuka" : "Memproses"}
              </span>
            </div>

            <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
              {granted
                ? "Izin baca dan unduh master file audio FLAC 24-bit tanpa kompresi telah aktif pada folder Google Drive Anda. Silakan buka tautan di bawah."
                : "Sistem sedang mengaitkan email Anda ke folder Google Drive arsip audio. Halaman ini akan menyegarkan otomatis dalam hitungan detik."}
            </p>

            {/* Direct Google Drive Open Button */}
            {granted && (
              <div className="mt-5">
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold tracking-wide"
                >
                  <FolderOpen size={16} />
                  Buka Folder Google Drive [FLAC 24-bit]
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

          {/* Rincian Ringkas Pesanan */}
          <div className="mt-6 border border-white/[0.08] bg-carbon-900/40 p-4">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Item yang Dibeli:
            </p>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {order.albumTitles.map((title, i) => (
                <li key={title + i} className="flex justify-between py-2 text-xs">
                  <span className="text-ink-soft">{title}</span>
                  <span className="font-mono text-ink-faint">FLAC 24-bit Lossless</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tombol Navigasi Lanjutan */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/pesanan/${order.id}`}
              className="btn-outline flex-1 justify-center py-2.5 text-xs"
            >
              Lihat Tanda Terima & Detail Pesanan
              <ArrowRight size={14} />
            </Link>
            <Link href="/" className="btn-ghost flex-1 justify-center py-2.5 text-xs">
              Kembali ke Katalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
   * [IF 2]: PROSES KEDALUWARSA / WAKTU HABIS (STATUS: EXPIRED / CANCELLED)
   * ═════════════════════════════════════════════════════════════ */
  if (isExpired || isFailed) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        {/* Banner Status Kedaluwarsa */}
        <div className="mb-6 flex items-center justify-between border border-signal-bad/40 bg-signal-bad/10 px-5 py-3.5 text-signal-bad">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Status Pembayaran: {isFailed ? "DIBATALKAN" : "BELUM TERBAYAR (WAKTU QRIS HABIS)"}
            </span>
          </div>
          <span className="font-mono text-2xs uppercase tracking-label text-signal-bad/80">
            Waktu Habis
          </span>
        </div>

        <div className="plate p-8 text-center md:p-11">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-signal-bad/40 bg-signal-bad/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <X size={30} className="text-signal-bad" />
          </div>
          <h1 className="display mt-6 text-3xl text-ink">
            {isFailed ? "Pesanan Dibatalkan" : "Waktu QRIS Kedaluwarsa"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-mute">
            Batas waktu pembayaran 15 menit untuk pesanan{" "}
            <span className="font-mono text-ink-soft">{order.orderNumber}</span> telah berakhir.
            Tidak ada dana yang ditarik dari rekening Anda dan tidak ada izin Drive yang dibuat.
          </p>

          <div className="mt-6 border border-white/[0.08] bg-carbon-950/50 p-4 text-left text-xs leading-relaxed text-ink-faint">
            <p className="font-medium text-ink-soft">Sudah terlanjur transfer saat waktu habis?</p>
            <p className="mt-1">
              Jangan khawatir. Hubungi admin via WhatsApp dengan mengirimkan bukti transfer dan nomor pesanan
              agar akses Google Drive dapat diaktifkan secara manual.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/keranjang" className="btn-gold flex-1 justify-center py-2.5 text-xs">
              Buat Pesanan Baru
            </Link>
            <a
              href={`https://wa.me/6285973023210?text=${encodeURIComponent(
                `Halo Admin, pesanan ${order.orderNumber} (${order.userEmail}) waktu QRIS-nya habis, tapi saya sudah transfer. Mohon bantu verifikasi.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex-1 justify-center py-2.5 text-xs"
            >
              Bantuan WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
   * [IF 3]: PROSES BELUM TERBAYAR (STATUS: PENDING & WAKTU AKTIF)
   * ═════════════════════════════════════════════════════════════ */
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
      <div className="animate-fade-up">
        {/* Banner Status Belum Terbayar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-signal-warn/40 bg-signal-warn/[0.08] px-4 py-3 text-signal-warn">
          <div className="flex items-center gap-2">
            <Clock size={16} className="shrink-0 text-signal-warn" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Status: BELUM TERBAYAR (MENUNGGU PEMBAYARAN)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot animate-pulse bg-signal-warn" />
            <span className="font-mono text-[0.625rem] uppercase tracking-label text-ink-mute">
              Live Polling (3 detik)
            </span>
          </div>
        </div>

        {/* Header Pembayaran */}
        <div className="mb-6">
          <p className="eyebrow">Langkah 3 dari 3 · Pembayaran Aman</p>
          <h1 className="display mt-2 text-3xl text-ink md:text-4xl">Pindai QRIS untuk Bayar</h1>
          <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-ink-mute">
            Buka aplikasi mobile banking (BCA, Mandiri, BRI, BNI) atau e-wallet (GoPay, Dana, OVO, ShopeePay),
            lalu pindai kode QRIS resmi di bawah. Akses folder Google Drive aktif otomatis setelah pembayaran terverifikasi.
          </p>
        </div>

        {/* Panel Utama QRIS */}
        <div className="glass-panel relative overflow-hidden p-6 md:p-8">
          <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-gold/60 via-gold/15 to-transparent" />

          {/* Baris Total & Nomor Pesanan */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                Nomor Pesanan
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-ink-soft">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                Total Tagihan (Bersih)
              </p>
              <p className="num mt-1 font-display text-2xl font-bold text-gold-bright">
                {formatIDR(order.totalAmount)}
              </p>
            </div>
          </div>

          {/* Kotak Timer Sesuai Waktu QRIS */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-white/[0.08] bg-carbon-950/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Clock
                size={16}
                className={remaining < 120 ? "animate-pulse text-signal-bad" : "text-gold"}
              />
              <div>
                <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                  Sisa Waktu Pembayaran QRIS
                </p>
                <p className="text-xs text-ink-mute">
                  {remaining < 120
                    ? "Segera selesaikan sebelum kedaluwarsa"
                    : "QRIS kedaluwarsa otomatis dalam 15 menit"}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "num font-mono text-xl font-bold tracking-widest px-3 py-1 border",
                remaining < 120
                  ? "border-signal-bad/40 bg-signal-bad/10 text-signal-bad animate-pulse"
                  : "border-gold/30 bg-gold/10 text-gold-bright",
              )}
            >
              {mm}:{ss}
            </div>
          </div>

          {/* Area Tampilan QRIS Resmi Toko MUG1III STORE */}
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
            {/* Sisi Kiri: Foto Resmi QRIS */}
            <div className="relative mx-auto w-fit sm:mx-0">
              <div className="relative max-w-[280px] overflow-hidden rounded border border-white/20 bg-white p-2 shadow-2xl transition-transform hover:scale-[1.01]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/qris-mug1iii.jpeg"
                  alt={`Standar Cetak QRIS MUG1III STORE - Pesanan ${order.orderNumber}`}
                  className="block h-auto w-full"
                />
              </div>

              {/* Info Merchant Resmi */}
              <div className="mt-3 text-center sm:text-left">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-gold-bright">
                  MUG1III STORE
                </p>
                <p className="font-mono text-[0.5625rem] text-ink-faint">
                  NMID: ID1025401397498 · ASPI / GPN
                </p>
              </div>

              {/* Tombol Unduh QRIS */}
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href="/qris-mug1iii.jpeg"
                  download={`QRIS-MUG1III-${order.orderNumber}.jpeg`}
                  className="btn-outline btn-sm w-full justify-center text-xs"
                >
                  <Download size={13} />
                  Unduh Foto QRIS (Untuk Scan Galeri)
                </a>
              </div>
            </div>

            {/* Sisi Kanan: Panduan Langkah & Tombol Cek */}
            <div className="space-y-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-label text-gold-bright">
                  Panduan Pembayaran:
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Buka aplikasi mobile banking atau e-wallet pilihan Anda.",
                    "Pilih menu Bayar / Pindai (Scan) QRIS.",
                    "Arahkan kamera ke kode QRIS di samping.",
                    `Periksa nama penerima MUG1III STORE & nominal ${formatIDR(order.totalAmount)}.`,
                    "Masukkan PIN untuk menyelesaikan transaksi.",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5 text-xs text-ink-mute">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-white/15 font-mono text-[0.5rem] text-gold-bright">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status Polling Live */}
              <div className="border-t border-white/[0.08] pt-4">
                <div className="flex items-center gap-2">
                  <span className="status-dot animate-pulse bg-signal-warn" />
                  <p className="text-[0.75rem] text-ink-soft">
                    Sistem mendeteksi mutasi secara otomatis tanpa perlu unggah struk.
                  </p>
                </div>
              </div>

              {/* Tombol Aksi Verifikasi */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="btn-outline btn-sm w-full justify-center text-xs"
                >
                  <RefreshCw size={13} className={cn(checking && "animate-spin text-gold")} />
                  {checking ? "Memeriksa Status…" : "Cek Status Pembayaran Sekarang"}
                </button>

                <button
                  onClick={handleConfirmPaid}
                  disabled={confirming}
                  className="btn-gold btn-sm w-full justify-center text-xs font-semibold"
                >
                  {confirming ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Memverifikasi Pembayaran…
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      Saya Sudah Membayar — Buka Akses Drive
                    </>
                  )}
                </button>

                {confirmError && (
                  <p className="text-center font-mono text-2xs text-signal-bad">
                    {confirmError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Copy Payload String (Optional EMVCo) */}
          {order.payment?.qrString && (
            <button
              onClick={() => {
                void navigator.clipboard.writeText(order.payment!.qrString!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-6 flex w-full items-center justify-between gap-3 border border-white/[0.08] bg-carbon-950/50 px-3.5 py-2.5 text-left transition-colors hover:border-gold/30"
            >
              <span className="truncate font-mono text-[0.5625rem] text-ink-faint">
                {order.payment.qrString.slice(0, 48)}…
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute">
                {copied ? <Check size={11} className="text-signal-ok" /> : <Copy size={11} />}
                {copied ? "Tersalin" : "Salin Payload"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Sisi Kanan: Rincian Pesanan & Bantuan Admin */}
      <aside className="space-y-4">
        {/* Rincian Pesanan */}
        <div className="plate p-6">
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink-faint">
            Rincian Pesanan
          </h2>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {order.albumTitles.map((title, i) => (
              <li key={title + i} className="flex justify-between gap-3 py-2.5 text-[0.8125rem]">
                <span className="truncate text-ink-soft">{title}</span>
                <span className="num shrink-0 text-ink-mute">
                  {formatIDR(order.items[i]?.priceSnapshot ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-white/[0.08] pt-4">
            <span className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              Total Tagihan (Bersih)
            </span>
            <span className="num font-semibold text-sm text-gold-bright">
              {formatIDR(order.totalAmount)}
            </span>
          </div>
          <p className="mt-4 border-t border-white/[0.07] pt-4 text-[0.75rem] leading-relaxed text-ink-faint">
            Izin Google Drive dikirimkan ke:{" "}
            <span className="font-mono text-ink-soft">{order.userEmail}</span>.
          </p>
        </div>

        {/* Bantuan WhatsApp & Discord */}
        <div className="plate space-y-3 p-5">
          <h3 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
            Butuh Bantuan Pembayaran?
          </h3>
          <p className="text-xs leading-relaxed text-ink-faint">
            Jika Anda sudah mentransfer tetapi membutuhkan konfirmasi instan atau mengalami kendala, hubungi admin langsung:
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`https://wa.me/6285973023210?text=${encodeURIComponent(
                `Halo Admin MUG1III, saya sudah bayar QRIS untuk pesanan ${order.orderNumber} (${order.userEmail}) sebesar ${formatIDR(order.totalAmount)}. Mohon konfirmasi akses Google Drive.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm w-full justify-center text-center text-xs"
            >
              WhatsApp (+6285973023210)
            </a>
            <a
              href="https://discord.gg/BYpDGbez9"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm w-full justify-center text-center text-xs"
            >
              Discord Komunitas
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
