"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, Search } from "lucide-react";
import { cn, formatDateTime, formatIDR } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

interface Row {
  id: string;
  orderNumber: string;
  userEmail: string;
  albums: string[];
  totalAmount: number;
  status: string;
  accessStatus: string;
  createdAt: string;
  items: number;
}

const STATUS_FILTERS = ["all", "PENDING", "PAID", "CANCELLED", "REFUNDED"] as const;
const ACCESS_FILTERS = ["all", "PENDING", "GRANTING", "GRANTED", "FAILED"] as const;

export function AdminOrders({ orders }: { orders: Row[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [access, setAccess] = useState<string>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = status === "all" || o.status === status;
      const matchAccess = access === "all" || o.accessStatus === access;
      const matchQuery =
        !query ||
        o.orderNumber.toLowerCase().includes(query) ||
        o.userEmail.toLowerCase().includes(query);
      return matchStatus && matchAccess && matchQuery;
    });
  }, [orders, status, access, q]);

  async function retry(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/orders/${id}/retry-access`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function approve(id: string, orderNumber: string) {
    if (!confirm(`Konfirmasi pembayaran untuk pesanan ${orderNumber} telah diterima dan aktifkan akses Google Drive pembeli?`)) {
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Gagal: ${err.error || "Gagal memproses persetujuan."}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nomor pesanan / email"
            className="field py-2 pl-8 text-[0.75rem]"
            aria-label="Cari pesanan"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
              Status
            </span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-label transition-colors",
                  status === s
                    ? "border-gold/45 bg-gold/[0.08] text-gold-bright"
                    : "border-white/10 text-ink-mute hover:text-ink",
                )}
              >
                {s === "all" ? "Semua" : s}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
              Akses
            </span>
            {ACCESS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setAccess(s)}
                className={cn(
                  "border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-label transition-colors",
                  access === s
                    ? "border-gold/45 bg-gold/[0.08] text-gold-bright"
                    : "border-white/10 text-ink-mute hover:text-ink",
                )}
              >
                {s === "all" ? "Semua" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="plate overflow-x-auto">
        <table className="data-table min-w-[840px]">
          <thead>
            <tr>
              <th>Order</th>
              <th>Pembeli</th>
              <th>Album</th>
              <th className="text-right">Total</th>
              <th>Pembayaran</th>
              <th>Akses</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[0.75rem] text-ink-faint">
                  Tidak ada pesanan yang cocok dengan filter.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link
                    href={`/admin/pesanan/${o.id}`}
                    className="font-mono text-[0.6875rem] text-ink transition-colors hover:text-gold-bright"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                    {formatDateTime(o.createdAt)}
                  </p>
                </td>
                <td className="max-w-[180px] truncate text-[0.75rem]">{o.userEmail}</td>
                <td className="max-w-[200px]">
                  <p className="truncate text-[0.75rem]">{o.albums.join(", ")}</p>
                  <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                    {o.items} item
                  </p>
                </td>
                <td className="num whitespace-nowrap text-right text-[0.75rem]">
                  {formatIDR(o.totalAmount)}
                </td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  <StatusBadge status={o.accessStatus} />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {o.status === "PENDING" && (
                      <button
                        onClick={() => void approve(o.id, o.orderNumber)}
                        disabled={busy === o.id}
                        className="inline-flex items-center gap-1 border border-gold/50 bg-gold/10 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-label text-gold-bright transition-colors hover:bg-gold/20"
                        title="Verifikasi dana masuk di DANA Bisnis dan buka akses Google Drive pembeli"
                      >
                        {busy === o.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                        Lunas
                      </button>
                    )}
                    {o.accessStatus === "FAILED" && (
                      <button
                        onClick={() => void retry(o.id)}
                        disabled={busy === o.id}
                        className="inline-flex items-center gap-1.5 border border-signal-warn/40 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-label text-signal-warn transition-colors hover:bg-signal-warn/10"
                      >
                        {busy === o.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <RefreshCw size={10} />
                        )}
                        Retry
                      </button>
                    )}
                    <Link
                      href={`/admin/pesanan/${o.id}`}
                      className="font-mono text-[0.5rem] uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
                    >
                      Detail
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
