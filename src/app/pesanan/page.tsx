import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, PackageOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { listOrdersForUser } from "@/lib/repo";
import { formatDate, formatIDR, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan Saya" };

export default async function PesananPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/masuk?next=/pesanan");
  const user = await getSessionUser();
  if (!user) redirect("/masuk?next=/pesanan");

  const orders = await listOrdersForUser(user.id);

  return (
    <div className="shell py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Akun</p>
          <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Pesanan saya</h1>
        </div>
        <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
          {orders.length} pesanan · {user.email}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/12 py-28 text-center">
          <PackageOpen size={28} strokeWidth={1.2} className="text-ink-faint" />
          <p className="mt-5 font-display text-2xl text-ink">Belum ada pesanan</p>
          <p className="mt-2 max-w-xs text-sm text-ink-mute">
            Setelah Anda menyelesaikan pembelian, tautan unduhan akan muncul di sini.
          </p>
          <Link href="/" className="btn-gold mt-7">
            Telusuri katalog
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/pesanan/${order.id}`}
                className="group block border border-white/[0.08] bg-carbon-850/60 transition-colors hover:border-gold/30 hover:bg-carbon-850"
              >
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs text-ink">{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                      {order.status === "PAID" && (
                        <StatusBadge status={order.accessStatus} labelOverride={statusLabel[order.accessStatus]} />
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm text-ink-soft">
                      {order.albumTitles.join(" · ")}
                    </p>
                    <p className="mt-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                      {formatDate(order.createdAt)} · {order.items.length} album
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-6 md:justify-end">
                    <span className="num text-sm text-ink">{formatIDR(order.totalAmount)}</span>
                    <ArrowRight
                      size={15}
                      className="text-ink-faint transition-all group-hover:translate-x-1 group-hover:text-gold"
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
