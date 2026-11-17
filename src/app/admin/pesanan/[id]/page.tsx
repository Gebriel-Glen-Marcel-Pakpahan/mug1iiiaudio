import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getOrderById, listAudit } from "@/lib/repo";
import { readDb } from "@/lib/db";
import { formatDateTime, formatIDR } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { ApproveOrderButton, RefundDecision, RetryAccessButton } from "@/components/admin/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail pesanan" };

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);
  if (!order) notFound();

  const db = await readDb();
  const items = order.items.map((i) => ({
    ...i,
    album: db.albums.find((a) => a.id === i.albumId),
    link: order.driveLinks.find((d) => d.albumId === i.albumId),
  }));
  const trail = (await listAudit(500)).filter((a) => a.target === order.orderNumber);

  const facts = [
    ["Pembeli", order.userEmail],
    ["Dibuat", formatDateTime(order.createdAt)],
    ["Dibayar", formatDateTime(order.paidAt)],
    ["Ref. gateway", order.payment?.gatewayRef ?? "—"],
    ["Diverifikasi", formatDateTime(order.payment?.verifiedAt)],
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/pesanan"
        className="inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute hover:text-gold-bright"
      >
        <ArrowLeft size={11} /> Semua pesanan
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pesanan</p>
          <h2 className="display mt-2 font-mono text-2xl text-ink">{order.orderNumber}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} labelOverride={`Bayar: ${order.paymentStatus}`} />
          <StatusBadge status={order.accessStatus} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="plate">
          <h3 className="border-b border-white/[0.07] px-5 py-3.5 font-mono text-2xs uppercase tracking-label text-ink-mute">
            Item &amp; akses Drive
          </h3>
          <ul className="divide-y divide-white/[0.06]">
            {items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.875rem] text-ink">{i.album?.title ?? i.albumId}</p>
                  <p className="mt-0.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                    {i.album?.artist} · {i.album?.format} {i.album?.bitDepth}/{i.album?.sampleRate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-[0.8125rem] text-ink-soft">{formatIDR(i.priceSnapshot)}</span>
                  {i.link ? (
                    <a
                      href={i.link.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-label text-gold hover:text-gold-bright"
                    >
                      {i.link.isActive ? "Folder" : "Dicabut"} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                      Belum ada izin
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
            <span className="font-mono text-2xs uppercase tracking-label text-ink-mute">Total (Harga Bersih)</span>
            <span className="num font-display text-xl text-gold-bright">{formatIDR(order.totalAmount)}</span>
          </div>
        </section>

        <section className="plate space-y-5 p-5">
          <dl className="space-y-2.5 text-[0.75rem]">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="truncate text-right font-mono text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>
          {order.status === "PENDING" && (
            <div className="border-t border-white/[0.07] pt-4">
              <ApproveOrderButton orderId={order.id} />
            </div>
          )}
          {order.status === "PAID" && order.accessStatus !== "GRANTED" && (
            <RetryAccessButton orderId={order.id} />
          )}
          {order.refund && (
            <div className="border-t border-white/[0.07] pt-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-2xs uppercase tracking-label text-ink-mute">Garansi</span>
                <StatusBadge status={order.refund.status} />
              </div>
              <p className="mb-4 text-[0.8125rem] leading-relaxed text-ink-soft">{order.refund.reason}</p>
              {order.refund.status === "REQUESTED" ? (
                <RefundDecision refundId={order.refund.id} />
              ) : (
                <p className="text-[0.75rem] text-ink-mute">{order.refund.resolutionNote}</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="plate">
        <h3 className="border-b border-white/[0.07] px-5 py-3.5 font-mono text-2xs uppercase tracking-label text-ink-mute">
          Jejak audit
        </h3>
        <ol className="divide-y divide-white/[0.06]">
          {trail.length === 0 && <li className="px-5 py-6 text-[0.75rem] text-ink-faint">Tidak ada entri.</li>}
          {trail.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-[0.75rem]">
              <span className="font-mono text-[0.625rem] text-ink-faint">{formatDateTime(a.at)}</span>
              <span className="font-mono text-gold/85">{a.action}</span>
              <span className="text-ink-mute">{a.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
