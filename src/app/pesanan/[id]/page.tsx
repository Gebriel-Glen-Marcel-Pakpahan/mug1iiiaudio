import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ArrowUpRight, Download, FolderOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser, listAlbums } from "@/lib/repo";
import { getStoredOrderById } from "@/lib/order-cookie";
import { formatDateTime, formatIDR, formatSize, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { RefundForm } from "@/components/refund-form";
import { CoverArt } from "@/components/cover-art";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/masuk?next=/pesanan/${params.id}`);
  const user = await getSessionUser();
  if (!user) redirect(`/masuk?next=/pesanan/${params.id}`);

  let order = await getOrderForUser(params.id, user.id);
  if (!order) {
    const cookieOrder = getStoredOrderById(params.id);
    if (cookieOrder) {
      order = await getOrderForUser(params.id, user.id);
    }
  }
  if (!order) redirect("/pesanan");

  const albums = await listAlbums();
  const items = order.items.map((item, idx) => ({
    item,
    album: albums.find((a) => a.id === item.albumId),
    link: order.driveLinks.find((d) => d.albumId === item.albumId),
    title: order.albumTitles[idx] ?? "Album",
  }));

  const canAccess = order.status === "PAID" || order.status === "REFUNDED";
  const warrantyOpen =
    order.status === "PAID" &&
    order.paidAt &&
    Date.now() - new Date(order.paidAt).getTime() < 7 * 86_400_000;

  return (
    <div className="shell py-10 md:py-14">
      <Link
        href="/pesanan"
        className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
      >
        <ArrowLeft size={12} />
        Semua pesanan
      </Link>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-6 border-b border-white/[0.08] pb-7">
        <div>
          <p className="eyebrow">Detail pesanan</p>
          <h1 className="display mt-2 font-mono text-2xl tracking-tight text-ink md:text-3xl">
            {order.orderNumber}
          </h1>
          <p className="mt-2 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
            Dibuat {formatDateTime(order.createdAt)}
            {order.paidAt && ` · Lunas ${formatDateTime(order.paidAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.accessStatus} />
          {order.refund && <StatusBadge status={order.refund.status} />}
        </div>
      </div>

      <div className="grid gap-10 pt-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <div>
          <h2 className="eyebrow">Album</h2>
          <ul className="mt-4 space-y-3">
            {items.map(({ item, album, link, title }) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 border border-white/[0.08] bg-carbon-850/50 p-4 sm:flex-row sm:items-center"
              >
                {album && (
                  <Link href={`/album/${album.slug}`} className="relative aspect-square w-16 shrink-0">
                    <CoverArt
                      title={album.title}
                      artist={album.artist}
                      palette={album.coverPalette}
                      mark={album.coverMark}
                      variant="thumb"
                    />
                  </Link>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{title}</p>
                  {album && (
                    <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                      {album.artist} · {album.format} {album.bitDepth} / {album.sampleRate} ·{" "}
                      {formatSize(album.totalSizeMb)}
                    </p>
                  )}
                  <p className="num mt-1.5 text-xs text-ink-mute">{formatIDR(item.priceSnapshot)}</p>
                </div>

                {canAccess ? (
                  link?.isActive ? (
                    <a
                      href={link.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline btn-sm shrink-0 justify-center"
                    >
                      <FolderOpen size={13} />
                      Buka di Drive
                      <ArrowUpRight size={12} />
                    </a>
                  ) : (
                    <span className="shrink-0 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                      Akses dicabut
                    </span>
                  )
                ) : (
                  <span className="shrink-0 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                    Menunggu pembayaran
                  </span>
                )}
              </li>
            ))}
          </ul>

          {canAccess && (
            <div className="mt-5 flex items-start gap-3 border border-gold/20 bg-gold/[0.04] p-4">
              <Download size={14} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-[0.8125rem] font-medium text-ink">Cara membuka file</p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-mute">
                  Buka tautan lalu masuk dengan email Google yang sama saat checkout
                  (<span className="font-mono text-ink-soft">{order.userEmail}</span>). Folder akan
                  terbuka di Google Drive — pilih file lalu tekan Download.
                </p>
              </div>
            </div>
          )}

          {order.refund && (
            <div className="mt-5 border border-white/[0.08] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
                  Permintaan garansi
                </h3>
                <StatusBadge status={order.refund.status} />
              </div>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-mute">
                {order.refund.reason}
              </p>
              {order.refund.resolutionNote && (
                <p className="mt-3 border-t border-white/[0.07] pt-3 text-[0.75rem] leading-relaxed text-ink-soft">
                  <span className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                    Tanggapan admin ·{" "}
                  </span>
                  {order.refund.resolutionNote}
                </p>
              )}
            </div>
          )}
        </div>

        {/* invoice */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="plate p-6">
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink-faint">Tanda Terima</h2>

            <dl className="mt-5 space-y-2.5 text-[0.8125rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Status pembayaran</dt>
                <dd className="text-ink-soft">{statusLabel[order.paymentStatus] ?? order.paymentStatus}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Metode</dt>
                <dd className="font-mono text-xs text-ink-soft">QRIS</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Gateway</dt>
                <dd className="font-mono text-xs text-ink-soft">Midtrans</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Tarif</dt>
                <dd className="font-mono text-xs text-ink-faint">Rp 500 / lagu (Bersih)</dd>
              </div>
              {order.payment?.gatewayRef && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-mute">Ref</dt>
                  <dd className="max-w-[55%] truncate font-mono text-[0.625rem] text-ink-faint">
                    {order.payment.gatewayRef}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-white/[0.08] pt-5">
              <span className="font-mono text-2xs uppercase tracking-label text-ink-mute">Total</span>
              <span className="num font-display text-2xl text-ink">{formatIDR(order.totalAmount)}</span>
            </div>

            <p className="mt-4 border-t border-white/[0.07] pt-4 text-[0.6875rem] leading-relaxed text-ink-faint">
              Akses dikirim langsung ke <span className="font-mono text-ink-mute">{order.userEmail}</span>. Tanda terima ini adalah bukti kontribusi arsip digital.
            </p>

            <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.07] pt-4">
              <a
                href={`https://wa.me/6285973023210?text=${encodeURIComponent(`Halo Admin, saya butuh bantuan untuk pesanan ${order.orderNumber} (${order.userEmail}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline btn-sm w-full justify-center text-center"
              >
                Bantuan WhatsApp
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

          {warrantyOpen && !order.refund && <RefundForm orderId={order.id} />}

          {!warrantyOpen && order.status === "PAID" && !order.refund && (
            <p className="mt-4 border border-white/[0.08] p-4 text-[0.75rem] leading-relaxed text-ink-faint">
              Masa garansi 7 hari telah berakhir. Hubungi support jika masih ada masalah akses.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
