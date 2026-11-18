import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { adminStats } from "@/lib/repo";
import { formatIDR, formatDate, formatDateTime, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { getOutbox } from "@/lib/services/email";
import { SystemDiagnostics } from "@/components/admin/system-diagnostics";
import { DatabaseStorageMonitor } from "@/components/admin/database-storage-monitor";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await adminStats();
  const outbox = getOutbox().slice(0, 4);

  const kpis = [
    { label: "Pendapatan (lunas)", value: formatIDR(stats.revenue), accent: true },
    { label: "Pendapatan 30 hari", value: formatIDR(stats.revenue30d) },
    { label: "Order lunas", value: String(stats.paidOrders) },
    { label: "Order menunggu", value: String(stats.pendingOrders) },
    { label: "Akses gagal", value: String(stats.failedAccess) },
    { label: "Refund terbuka", value: String(stats.openRefunds) },
  ];

  return (
    <div className="space-y-8">
      <SystemDiagnostics />
      <DatabaseStorageMonitor />

      <section>
        <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-carbon-900 p-5">
              <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                {k.label}
              </p>
              <p
                className={`num mt-2 font-display ${k.accent ? "text-2xl text-gold-bright" : "text-xl text-ink"}`}
              >
                {k.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="plate">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              Pesanan terbaru
            </h2>
            <Link
              href="/admin/pesanan"
              className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint transition-colors hover:text-gold-bright"
            >
              Semua <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Pembeli</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={`/admin/pesanan/${o.id}`}
                        className="font-mono text-[0.6875rem] text-ink transition-colors hover:text-gold-bright"
                      >
                        {o.orderNumber}
                      </Link>
                      <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                        {formatDate(o.createdAt)}
                      </p>
                    </td>
                    <td className="max-w-[190px] truncate text-[0.75rem]">{o.userEmail}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="num text-right text-[0.75rem]">{formatIDR(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="plate">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
              Email terkirim
            </h2>
            <span className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
              {outbox.length} terakhir
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {outbox.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.75rem] text-ink-faint">
                Belum ada email. Selesaikan satu pembayaran untuk melihat alur nota.
              </p>
            ) : (
              outbox.map((m, i) => (
                <div key={i} className="px-5 py-3.5">
                  <p className="truncate text-[0.75rem] text-ink-soft">{m.subject}</p>
                  <p className="mt-1 truncate font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                    {m.to} · {formatDateTime(m.sentAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="plate">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
            Aktivitas sistem
          </h2>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint transition-colors hover:text-gold-bright"
          >
            Audit log <ArrowUpRight size={10} />
          </Link>
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {stats.audit.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  a.level === "critical"
                    ? "bg-signal-bad"
                    : a.level === "warn"
                      ? "bg-signal-warn"
                      : "bg-signal-ok"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.75rem] text-ink-soft">
                  <span className="font-mono text-[0.6875rem] text-gold/80">{a.action}</span>{" "}
                  <span className="text-ink-mute">— {a.target}</span>
                </p>
                <p className="mt-0.5 truncate text-[0.6875rem] text-ink-faint">{a.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                {formatDateTime(a.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "KPI akses",
            body: `${stats.paidOrders - stats.failedAccess}/${stats.paidOrders} order lunas punya akses aktif.`,
            icon: TrendingUp,
          },
          {
            title: `TTL QRIS ${stats.qrisTtl} menit`,
            body: "Kode kedaluwarsa otomatis; tidak ada izin Drive dibuat untuk order gagal.",
            icon: null,
          },
          {
            title: `${stats.albums} album`,
            body: `${stats.buyers} pembeli terdaftar. Semua konten disimpan di Google Drive.`,
            icon: null,
          },
        ].map((c) => (
          <div key={c.title} className="border border-white/[0.08] p-5">
            <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
              {c.title}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{c.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
