import Link from "next/link";
import { listRefunds } from "@/lib/repo";
import { formatDateTime, formatIDR } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { RefundDecision } from "@/components/admin/admin-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refund & garansi" };

export default async function AdminRefundPage() {
  const refunds = (await listRefunds()).sort(
    (a, b) =>
      Number(b.status === "REQUESTED") - Number(a.status === "REQUESTED") ||
      +new Date(b.requestedAt) - +new Date(a.requestedAt),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Garansi · PRD §13</p>
        <h2 className="display mt-2 text-2xl text-ink">Permintaan refund</h2>
        <p className="mt-2 max-w-xl text-[0.8125rem] leading-relaxed text-ink-mute">
          Tinjau maksimal 2×24 jam. Menyetujui refund otomatis mencabut izin Google Drive pembeli dan
          mengirim email pemberitahuan.
        </p>
      </header>

      {refunds.length === 0 && (
        <p className="plate px-5 py-12 text-center text-[0.8125rem] text-ink-faint">
          Belum ada permintaan garansi.
        </p>
      )}

      <ul className="space-y-4">
        {refunds.map((r) => (
          <li key={r.id} className="plate grid gap-5 p-5 md:grid-cols-[1fr_minmax(260px,340px)]">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={r.status} />
                {r.order && (
                  <Link
                    href={`/admin/pesanan/${r.order.id}`}
                    className="font-mono text-[0.75rem] text-ink hover:text-gold-bright"
                  >
                    {r.order.orderNumber}
                  </Link>
                )}
                <span className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                  {formatDateTime(r.requestedAt)}
                </span>
              </div>
              {r.order && (
                <p className="text-[0.75rem] text-ink-mute">
                  {r.order.userEmail} · {r.order.albumTitles.join(", ")} ·{" "}
                  <span className="num text-ink-soft">{formatIDR(r.order.totalAmount)}</span>
                </p>
              )}
              <blockquote className="border-l border-gold/40 pl-4 text-[0.875rem] leading-relaxed text-ink-soft">
                {r.reason}
              </blockquote>
            </div>

            {r.status === "REQUESTED" ? (
              <RefundDecision refundId={r.id} />
            ) : (
              <div className="border-t border-white/[0.07] pt-4 text-[0.75rem] text-ink-mute md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                  Diputuskan {formatDateTime(r.resolvedAt)} oleh {r.resolvedBy ?? "—"}
                </p>
                <p className="mt-2 leading-relaxed">{r.resolutionNote ?? "—"}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
