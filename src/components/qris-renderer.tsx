"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn, formatDateTime, formatIDR } from "@/lib/utils";
import type { DriveLink, OrderView } from "@/lib/types";

type Live = {
  paid?: boolean;
  status: OrderView["status"];
  paymentStatus: OrderView["paymentStatus"];
  accessStatus: OrderView["accessStatus"];
  paidAt?: string | null;
  driveLinks?: DriveLink[];
  checkedAt?: string;
  message?: string;
};

export function QrisRenderer({ order }: { order: OrderView }) {
  const router = useRouter();
  const [live, setLive] = useState<Live>({
    paid: order.status === "PAID" || order.status === "REFUNDED",
    status: order.status,
    paymentStatus: order.paymentStatus,
    accessStatus: order.accessStatus,
    paidAt: order.paidAt,
    driveLinks: order.status === "PAID" ? order.driveLinks : [],
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(() =>
    order.payment?.expiresAt
      ? Math.max(0, Math.floor((new Date(order.payment.expiresAt).getTime() - Date.now()) / 1000))
      : 15 * 60,
  );
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showUnpaidScreen, setShowUnpaidScreen] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [unpaidReason, setUnpaidReason] = useState<string | null>(null);

  /* ── 1. Render QR image from stored QRIS payload ── */
  useEffect(() => {
    if (!order.payment?.qrString) return;
    fetch(`/api/orders/${order.id}/qr`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setQrDataUrl(d.qrDataUrl))
      .catch(() => undefined);
  }, [order.id, order.payment?.qrString]);

  /* ── 2. Automatic Background Polling (Setiap 4 Detik) ── */
  useEffect(() => {
    if (live.status !== "PENDING") return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Live;
        if (!alive) return;
        setLive((prev) => ({
          ...prev,
          ...data,
          driveLinks: data.driveLinks ?? prev.driveLinks,
        }));
        if (data.status === "PAID" || data.status === "REFUNDED") {
          setShowUnpaidScreen(false);
          router.refresh();
        }
      } catch {
        /* transient */
      }
    };
    const t = setInterval(poll, 4000);
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

  /* ── Strict Payment Status Verification ──
   * Checks backend (/api/orders/:id/confirm) whether payment has genuinely settled.
   * - If PAID: unlocks Google Drive link screen.
   * - If NOT PAID (PENDING): displays the "BELUM BAYAR" screen & keeps Drive link locked.
   */
  const handleVerifyPayment = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Live & { error?: string };

      const nowStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastCheckedAt(`${nowStr} WIB`);

      if (res.ok && (data.paid === true || data.status === "PAID")) {
        setLive({
          paid: true,
          status: "PAID",
          paymentStatus: data.paymentStatus ?? "SUCCESS",
          accessStatus: data.accessStatus ?? "GRANTED",
          paidAt: data.paidAt ?? new Date().toISOString(),
          driveLinks: data.driveLinks ?? order.driveLinks,
        });
        setShowUnpaidScreen(false);
        router.refresh();
      } else {
        // Still unpaid — transition to the explicit "BELUM BAYAR" screen
        setLive((prev) => ({
          ...prev,
          paid: false,
          status: data.status ?? "PENDING",
          paymentStatus: data.paymentStatus ?? "PENDING",
          accessStatus: data.accessStatus ?? "PENDING",
          driveLinks: [],
        }));
        setUnpaidReason(
          data.message ||
            "Pembayaran belum terdeteksi di sistem. Silakan pindai QRIS dan selesaikan transfer terlebih dahulu.",
        );
        setShowUnpaidScreen(true);
      }
    } catch {
      setUnpaidReason("Gagal menghubungi server pengecekan pembayaran. Silakan coba lagi.");
      setShowUnpaidScreen(true);
    } finally {
      setVerifying(false);
    }
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  /* ─────────────────────────────────────────────────────────────
   * EVALUASI LOGIKA KONDISI (IF BRANCHING):
   * 1. isPaid: Sudah Terbayar (LUNAS) -> Buka Link Google Drive
   * 2. isExpired / isFailed: Waktu QRIS Habis / Dibatalkan
   * 3. showUnpaidScreen: Hasil Cek Status = BELUM BAYAR (Tampilan Belum Bayar)
   * 4. Default Pending: Tampilan Scan QRIS Menunggu Pembayaran
   * ───────────────────────────────────────────────────────────── */
  const isPaid = live.status === "PAID" || live.status === "REFUNDED";
  const isExpired = remaining === 0 && live.status === "PENDING";
  const isFailed = live.status === "CANCELLED";

  /* ═════════════════════════════════════════════════════════════
   * [IF 1]: PROSES SUDAH TERBAYAR (STATUS: PAID / LUNAS)
   * Lanjut untuk ambil link Google Drive
   * ═════════════════════════════════════════════════════════════ */
  if (isPaid) {
    const activeLinks = live.driveLinks?.length ? live.driveLinks : order.driveLinks;
    const granted = live.accessStatus === "GRANTED" || Boolean(activeLinks && activeLinks.length > 0);
    const primaryDriveLink =
      activeLinks?.[0]?.linkUrl ||
      `https://drive.google.com/drive/folders/14GmRuZ5WAz-FaYBuLhPb1ktBghsjSJ2m?authuser=${encodeURIComponent(order.userEmail)}`;

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
              Terima kasih! Pembayaran untuk pesanan{" "}
              <span className="font-mono text-gold-bright">{order.orderNumber}</span> sebesar{" "}
              <span className="num font-semibold text-ink">{formatIDR(order.totalAmount)}</span> telah
              terverifikasi lunas.
            </p>
            {(live.paidAt || order.paidAt) && (
              <p className="mt-1 font-mono text-2xs uppercase tracking-label text-ink-faint">
                Waktu Verifikasi: {formatDateTime(live.paidAt ?? order.paidAt)}
              </p>
            )}
          </div>

          {/* Tahapan Berurutan (Sequence Selesai) */}
          <div className="mt-7 grid grid-cols-3 gap-2 border border-white/[0.08] bg-carbon-950/60 p-3 text-center font-mono text-[0.625rem] uppercase tracking-wider">
            <div className="border border-signal-ok/30 bg-signal-ok/10 py-2 text-signal-ok">
              1. Pesanan ✓
            </div>
            <div className="border border-signal-ok/30 bg-signal-ok/10 py-2 text-signal-ok">
              2. Sudah Bayar ✓
            </div>
            <div className="border border-gold/40 bg-gold/15 py-2 font-bold text-gold-bright">
              3. Ambil Link Drive ✓
            </div>
          </div>

          {/* Kotak Akses Link Google Drive */}
          <div className="mt-6 border border-gold/30 bg-carbon-950/80 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                {granted ? (
                  <ShieldCheck size={18} className="text-signal-ok" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-signal-warn" />
                )}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-label text-ink">
                    {granted ? "Link Google Drive Siap Diambil" : "Menyiapkan Izin Folder…"}
                  </h3>
                  <p className="mt-0.5 text-2xs text-ink-mute">
                    Akun Penerima: <span className="font-mono text-gold-bright">{order.userEmail}</span>
                  </p>
                </div>
              </div>
              <span className="border border-signal-ok/40 bg-signal-ok/10 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-signal-ok">
                Akses Terbuka
              </span>
            </div>

            <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
              Silakan klik tombol di bawah untuk mengambil dan mengunduh file master audio FLAC 24-bit
              langsung dari folder Google Drive Anda:
            </p>

            {/* Direct Google Drive Open Button */}
            <div className="mt-5 space-y-2.5">
              <a
                href={primaryDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold tracking-wide"
              >
                <FolderOpen size={16} />
                Ambil &amp; Buka Link Google Drive [FLAC 24-bit]
                <ExternalLink size={14} />
              </a>

              {activeLinks && activeLinks.length > 1 && (
                <div className="space-y-2 pt-2">
                  {activeLinks.map((dl, idx) => (
                    <a
                      key={dl.id || idx}
                      href={dl.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline flex w-full items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <span>Folder Album: {order.albumTitles[idx] ?? `Album #${idx + 1}`}</span>
                      <ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rincian Ringkas Pesanan */}
          <div className="mt-6 border border-white/[0.08] bg-carbon-900/40 p-4">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Album yang Dibeli:
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
              Lihat Tanda Terima &amp; Detail Pesanan
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
            Akses Google Drive tidak diberikan karena pembayaran belum diselesaikan.
          </p>

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
   * [IF 3]: TAMPILAN BELUM BAYAR (KETIKA CEK STATUS & BELUM TRANSFER)
   * Memblokir akses link Google Drive dan menampilkan status Belum Bayar
   * ═════════════════════════════════════════════════════════════ */
  if (showUnpaidScreen) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-up">
        {/* Banner Merah: Status Belum Bayar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border border-signal-bad/50 bg-signal-bad/15 px-5 py-3.5 text-signal-bad">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Status Pembayaran: BELUM BAYAR (PEMBAYARAN BELUM DITERIMA)
            </span>
          </div>
          <span className="font-mono text-2xs uppercase tracking-label text-signal-bad/90">
            Akses Drive Terkunci
          </span>
        </div>

        <div className="plate p-8 md:p-11">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-signal-bad/50 bg-signal-bad/15 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <Lock size={34} className="text-signal-bad" />
            </div>
            <h1 className="display mt-6 text-3xl text-ink md:text-4xl">
              Anda Belum Menyelesaikan Pembayaran
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-mute">
              Sistem telah memeriksa status transaksi untuk pesanan{" "}
              <span className="font-mono text-gold-bright">{order.orderNumber}</span> senilai{" "}
              <span className="num font-semibold text-ink">{formatIDR(order.totalAmount)}</span>, namun{" "}
              <strong className="text-signal-bad">belum ada dana transfer yang masuk</strong>.
            </p>
            {lastCheckedAt && (
              <p className="mt-2 font-mono text-2xs uppercase tracking-label text-ink-faint">
                Terakhir diperiksa: {lastCheckedAt} · Sisa waktu QRIS: {mm}:{ss}
              </p>
            )}
          </div>

          {/* Tahapan Berurutan (Menunjukkan Terkunci di Tahap 2 & 3) */}
          <div className="mt-7 space-y-2.5 border border-white/[0.1] bg-carbon-950/80 p-5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Urutan Verifikasi Sistem:
            </p>

            <div className="flex items-center justify-between border border-signal-ok/30 bg-signal-ok/[0.06] px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5 text-signal-ok">
                <CheckCircle2 size={15} />
                <span className="font-medium">1. Pembuatan Pesanan ({order.orderNumber})</span>
              </div>
              <span className="font-mono text-[0.625rem] uppercase tracking-wider text-signal-ok">
                Selesai
              </span>
            </div>

            <div className="flex items-center justify-between border border-signal-bad/40 bg-signal-bad/10 px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5 text-signal-bad">
                <AlertCircle size={15} />
                <span className="font-semibold">
                  2. Pengecekan Status Pembayaran ({formatIDR(order.totalAmount)})
                </span>
              </div>
              <span className="border border-signal-bad/40 bg-signal-bad/20 px-2 py-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-wider text-signal-bad">
                BELUM BAYAR
              </span>
            </div>

            <div className="flex items-center justify-between border border-white/10 bg-carbon-900/60 px-4 py-3 text-xs opacity-75">
              <div className="flex items-center gap-2.5 text-ink-mute">
                <Lock size={15} />
                <span>3. Pengambilan Link Google Drive [FLAC 24-bit]</span>
              </div>
              <span className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-faint">
                TERKUNCI
              </span>
            </div>
          </div>

          {/* Keterangan Peringatan */}
          <div className="mt-5 border border-signal-warn/30 bg-signal-warn/[0.07] p-4 text-xs leading-relaxed text-ink-soft">
            <p className="font-semibold text-signal-warn">Mengapa tampilan ini muncul?</p>
            <p className="mt-1 text-ink-mute">
              {unpaidReason ||
                "Tautan Google Drive tidak dapat diakses sebelum pembayaran QRIS berhasil diverifikasi oleh sistem. Silakan kembali ke layar QRIS, lakukan transfer sesuai nominal, lalu cek kembali."}
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="mt-7 space-y-3">
            <button
              onClick={() => setShowUnpaidScreen(false)}
              className="btn-gold w-full justify-center py-3.5 text-xs font-semibold"
            >
              <ArrowLeft size={14} />
              Kembali ke Kode QRIS &amp; Lakukan Pembayaran Sekarang
            </button>

            <button
              onClick={handleVerifyPayment}
              disabled={verifying}
              className="btn-outline w-full justify-center py-3 text-xs"
            >
              <RefreshCw size={14} className={cn(verifying && "animate-spin text-gold")} />
              {verifying
                ? "Memeriksa Ulang Mutasi Pembayaran…"
                : "Sudah Transfer? Cek Ulang Status Pembayaran"}
            </button>

            <div className="border-t border-white/[0.08] pt-4 text-center">
              <p className="mb-2.5 text-xs text-ink-faint">
                Sudah transfer ke QRIS MUG1III STORE namun status belum berubah? Kirim bukti transfer
                agar Admin mengaktifkan akses pesanan Anda:
              </p>
              <a
                href={`https://wa.me/6285973023210?text=${encodeURIComponent(
                  `Halo Admin MUG1III, saya sudah transfer QRIS untuk pesanan ${order.orderNumber} (${order.userEmail}) sebesar ${formatIDR(order.totalAmount)}. Berikut bukti transfer saya, mohon verifikasi agar link Google Drive terbuka.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm w-full justify-center text-xs text-gold-bright"
              >
                Kirim Bukti Transfer via WhatsApp Admin (+6285973023210)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
   * [IF 4]: PROSES MENUNGGU PEMBAYARAN (TAMPILAN SCAN QRIS)
   * ═════════════════════════════════════════════════════════════ */
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
      <div className="animate-fade-up">
        {/* Banner Status Belum Terbayar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-signal-warn/40 bg-signal-warn/[0.08] px-4 py-3 text-signal-warn">
          <div className="flex items-center gap-2">
            <Clock size={16} className="shrink-0 text-signal-warn" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider">
              Status: BELUM BAYAR (MENUNGGU PEMBAYARAN QRIS)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-signal-warn" />
            <span className="font-mono text-[0.625rem] uppercase tracking-label text-ink-mute">
              Link Drive Terkunci Sebelum Lunas
            </span>
          </div>
        </div>

        {/* Header Pembayaran */}
        <div className="mb-6">
          <p className="eyebrow">Langkah 3 dari 3 · Pembayaran QRIS</p>
          <h1 className="display mt-2 text-3xl text-ink md:text-4xl">Pindai QRIS untuk Bayar</h1>
          <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-ink-mute">
            Buka aplikasi mobile banking (BCA, Mandiri, BRI, BNI) atau e-wallet (GoPay, DANA, OVO,
            ShopeePay), lalu pindai kode QRIS di bawah. Setelah transfer selesai, klik tombol{" "}
            <strong className="text-ink-soft">Cek Status Pembayaran</strong> untuk membuka link Google
            Drive.
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
                  src={qrDataUrl && !qrDataUrl.startsWith("data:") ? qrDataUrl : "/qris-mug1iii.jpeg"}
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

            {/* Sisi Kanan: Panduan Langkah & Tombol Cek Status */}
            <div className="space-y-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-label text-gold-bright">
                  Urutan Pembayaran &amp; Akses Drive:
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Buka aplikasi mobile banking atau e-wallet pilihan Anda.",
                    "Pilih menu Bayar / Pindai (Scan) QRIS.",
                    `Pastikan penerima MUG1III STORE & masukkan nominal ${formatIDR(order.totalAmount)}.`,
                    "Selesaikan pembayaran di aplikasi Anda.",
                    "Klik tombol 'Cek Status Pembayaran' di bawah. Jika sudah bayar, link Google Drive akan langsung terbuka.",
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

              {/* Info Keamanan Verifikasi */}
              <div className="border-t border-white/[0.08] pt-4">
                <div className="flex items-start gap-2">
                  <Lock size={14} className="mt-0.5 shrink-0 text-signal-warn" />
                  <p className="text-[0.75rem] leading-relaxed text-ink-soft">
                    Sistem memverifikasi status pembayaran terlebih dahulu. Jika belum bayar, akses link
                    Google Drive tidak akan diberikan.
                  </p>
                </div>
              </div>

              {/* Tombol Pengecekan Status Pembayaran */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleVerifyPayment}
                  disabled={verifying}
                  className="btn-gold w-full justify-center py-3 text-xs font-semibold"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Memeriksa Status Pembayaran…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Cek Status Pembayaran &amp; Ambil Link Drive
                    </>
                  )}
                </button>
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

      {/* Sisi Kanan: Rincian Pesanan & Status Lock */}
      <aside className="space-y-4">
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

          {/* Indikator Link Google Drive Terkunci */}
          <div className="mt-4 flex items-center gap-2.5 border border-white/[0.08] bg-carbon-950/60 p-3 text-xs text-ink-mute">
            <Lock size={14} className="shrink-0 text-signal-warn" />
            <span>
              Link Google Drive: <strong className="text-signal-warn">Terkunci (Belum Bayar)</strong>
            </span>
          </div>

          <p className="mt-4 border-t border-white/[0.07] pt-4 text-[0.75rem] leading-relaxed text-ink-faint">
            Setelah pembayaran lunas, link Google Drive otomatis dibuka untuk:{" "}
            <span className="font-mono text-ink-soft">{order.userEmail}</span>.
          </p>
        </div>

        {/* Bantuan WhatsApp & Discord */}
        <div className="plate space-y-3 p-5">
          <h3 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
            Konfirmasi Manual / Bantuan Admin
          </h3>
          <p className="text-xs leading-relaxed text-ink-faint">
            Jika Anda membayar menggunakan QRIS Statis MUG1III STORE, kirimkan bukti transfer ke
            WhatsApp Admin agar status pesanan Anda langsung diverifikasi lunas:
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`https://wa.me/6285973023210?text=${encodeURIComponent(
                `Halo Admin MUG1III, saya sudah bayar QRIS untuk pesanan ${order.orderNumber} (${order.userEmail}) sebesar ${formatIDR(order.totalAmount)}. Mohon verifikasi agar link Google Drive terbuka.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm w-full justify-center text-center text-xs"
            >
              WhatsApp Admin (+6285973023210)
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
