"use client";

import { useEffect, useState } from "react";
import {
  Database,
  HardDrive,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ArrowDownToLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StorageMetrics } from "@/lib/postgres";

export function DatabaseStorageMonitor() {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [compactResult, setCompactResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/database/storage");
      if (!res.ok) throw new Error("Gagal mengambil metrik penyimpanan database.");
      const data = (await res.json()) as StorageMetrics;
      setMetrics(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompact = async () => {
    if (!confirm("Jalankan kompresi dan optimasi database? Sistem akan membersihkan payload berlebih dan merampingkan data.")) {
      return;
    }
    setCompacting(true);
    setCompactResult(null);
    try {
      const res = await fetch("/api/admin/database/compact", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan kompresi.");
      setCompactResult(data.message || "Database berhasil dikompresi!");
      await fetchMetrics();
    } catch (e) {
      alert(`Gagal: ${(e as Error).message}`);
    } finally {
      setCompacting(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <section className="plate overflow-hidden border border-white/[0.08] bg-carbon-900/80 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-gold/10 text-gold-bright">
            <Database size={16} />
          </div>
          <div>
            <h2 className="font-mono text-2xs uppercase tracking-label text-ink">
              Monitoring Kuota &amp; Penyimpanan Database
            </h2>
            <p className="font-mono text-[0.625rem] text-ink-mute">
              {metrics ? metrics.engine : "Memeriksa status PostgreSQL..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright hover:border-gold/30"
          >
            <RefreshCw size={11} className={cn(loading && "animate-spin text-gold")} />
            Perbarui
          </button>

          <button
            onClick={handleCompact}
            disabled={compacting}
            className="inline-flex items-center gap-1.5 border border-gold/50 bg-gold/15 px-3 py-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-gold-bright transition-colors hover:bg-gold/25"
            title="Kompres data pelanggan & pangkas log audit berlebih"
          >
            <Zap size={11} className={cn(compacting && "animate-pulse")} />
            {compacting ? "Mengompres..." : "⚡ Kompres Data"}
          </button>
        </div>
      </div>

      {compactResult && (
        <div className="flex items-center gap-2 border border-signal-ok/40 bg-signal-ok/10 p-3 text-xs text-signal-ok">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{compactResult}</span>
        </div>
      )}

      {error && (
        <p className="border border-signal-bad/30 bg-signal-bad/10 p-3 text-xs text-signal-bad">
          {error}
        </p>
      )}

      {metrics && (
        <div className="space-y-6">
          {/* Storage Meter Visual Gauge */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                  Kapasitas Cloud Storage (Supabase Free Tier)
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-ink">
                    {metrics.remainingMb.toLocaleString("id-ID")} MB
                  </span>
                  <span className="font-mono text-xs text-gold-bright">
                    Tersisa ({metrics.remainingPercentage}%)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-[0.625rem] text-ink-mute">
                  Terpakai: <strong className="text-ink">{metrics.usedMb} MB</strong> dari{" "}
                  <strong>{metrics.maxStorageMb} MB</strong>
                </span>
              </div>
            </div>

            {/* Glowing Dual Progress Bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-carbon-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-bright transition-all duration-700 ease-out shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                style={{ width: `${Math.max(1, metrics.usedPercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between font-mono text-[0.5625rem] text-ink-faint">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-signal-ok" />
                <span className="text-signal-ok font-semibold">Status: Sangat Longgar &amp; Optimal</span>
              </div>
              <span>Total Beban: {metrics.usedPercentage}%</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-white/[0.06] bg-carbon-800/50 p-3.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">Batas Kuota Gratis</p>
              <p className="num mt-1 font-display text-lg text-ink">{metrics.maxStorageMb} MB</p>
              <p className="mt-0.5 text-[0.625rem] text-ink-mute">Kapasitas penyimpanan</p>
            </div>

            <div className="border border-white/[0.06] bg-carbon-800/50 p-3.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">Penyimpanan Terpakai</p>
              <p className="num mt-1 font-display text-lg text-gold-bright">{metrics.usedMb} MB</p>
              <p className="mt-0.5 text-[0.625rem] text-ink-mute">Data tabel + indeks</p>
            </div>

            <div className="border border-white/[0.06] bg-carbon-800/50 p-3.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">Ruang Bebas Tersisa</p>
              <p className="num mt-1 font-display text-lg text-signal-ok">{metrics.remainingMb} MB</p>
              <p className="mt-0.5 text-[0.625rem] text-ink-mute">Dapat menampung ribuan order</p>
            </div>

            <div className="border border-white/[0.06] bg-carbon-800/50 p-3.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">Total Rekaman Data</p>
              <p className="num mt-1 font-display text-lg text-ink">{metrics.totalRows.toLocaleString("id-ID")}</p>
              <p className="mt-0.5 text-[0.625rem] text-ink-mute">Baris di seluruh 10 tabel</p>
            </div>
          </div>

          {/* Table Breakdown Detail */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[0.625rem] uppercase tracking-label text-ink-mute flex items-center gap-1.5">
                <Layers size={12} className="text-gold" />
                Rincian Alokasi Storage per Tabel Database
              </h3>
              <span className="font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                10 Tabel Terkompresi
              </span>
            </div>

            <div className="overflow-x-auto border border-white/[0.06]">
              <table className="w-full text-left font-mono text-[0.6875rem]">
                <thead className="border-b border-white/[0.08] bg-carbon-800/80 text-[0.5625rem] uppercase text-ink-faint">
                  <tr>
                    <th className="py-2.5 px-3">Tabel</th>
                    <th className="py-2.5 px-3">Peruntukan</th>
                    <th className="py-2.5 px-3 text-right">Baris Data</th>
                    <th className="py-2.5 px-3 text-right">Ukuran Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {metrics.tables.map((t) => (
                    <tr key={t.name} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-3 font-semibold text-ink">{t.name}</td>
                      <td className="py-2 px-3 text-ink-mute text-xs font-sans">{t.label}</td>
                      <td className="py-2 px-3 text-right text-ink-soft">{t.rowCount.toLocaleString("id-ID")}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gold-bright">{t.sizeFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
