"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity } from "lucide-react";

interface DiagnosticsData {
  midtrans: {
    isConfigured: boolean;
    isProduction: boolean;
    serverKeyPrefix: string;
    clientKeyPrefix: string;
    pingStatus: string;
    qrisStatus: string;
    qrisMessage?: string;
  };
  gdrive: {
    isConfigured: boolean;
    rootFolderId: string;
  };
  email: {
    isConfigured: boolean;
  };
  database: {
    type: string;
  };
  danaWebhook?: {
    status: string;
    endpoint: string;
    secret: string;
  };
}

export function SystemDiagnostics() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) throw new Error("Gagal mengambil data diagnostik.");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  return (
    <section className="plate p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3.5">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-gold" />
          <h2 className="font-mono text-2xs uppercase tracking-label text-ink">
            Status Integrasi &amp; Diagnostik Midtrans
          </h2>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute hover:text-gold-bright transition-colors"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Periksa Ulang
        </button>
      </div>

      {loading && !data && (
        <p className="py-4 text-center font-mono text-2xs uppercase tracking-label text-ink-faint">
          Menguji koneksi ke Midtrans &amp; layanan…
        </p>
      )}

      {error && (
        <p className="border border-signal-bad/30 bg-signal-bad/10 p-3 text-xs text-signal-bad">
          {error}
        </p>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 text-xs">
          {/* Midtrans */}
          <div className="border border-white/[0.08] bg-carbon-900/60 p-3.5 space-y-1.5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">Midtrans Gateway</p>
            <div className="flex items-center gap-1.5 font-semibold">
              {data.midtrans.pingStatus.includes("Terhubung") ? (
                <>
                  <CheckCircle2 size={13} className="text-signal-ok" />
                  <span className="text-signal-ok">API Terhubung</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-signal-warn" />
                  <span className="text-signal-warn">Perlu Perhatian</span>
                </>
              )}
            </div>
            <p className="text-[0.6875rem] text-ink-mute leading-relaxed">{data.midtrans.pingStatus}</p>
            <div className="pt-1 border-t border-white/[0.06]">
              <span className="font-mono text-[0.625rem] text-ink-faint">Status QRIS: </span>
              <span className={data.midtrans.qrisStatus.includes("ACTIVE") ? "text-signal-ok" : "text-signal-warn"}>
                {data.midtrans.qrisStatus}
              </span>
            </div>
          </div>

          {/* DANA Webhook Gateway */}
          <div className="border border-white/[0.08] bg-carbon-900/60 p-3.5 space-y-1.5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">DANA Webhook (HP)</p>
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 size={13} className="text-signal-ok" />
              <span className="text-signal-ok">Gateway Aktif</span>
            </div>
            <p className="font-mono text-[0.625rem] text-ink-mute truncate">/api/webhooks/dana</p>
            <p className="text-[0.625rem] text-gold-bright">Otomatis via Notif HP</p>
          </div>

          {/* Database */}
          <div className="border border-white/[0.08] bg-carbon-900/60 p-3.5 space-y-1.5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">Database</p>
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <CheckCircle2 size={13} className="text-signal-ok" />
              <span>{data.database.type.includes("PostgreSQL") ? "PostgreSQL" : "JSON Database"}</span>
            </div>
            <p className="text-[0.6875rem] text-ink-mute leading-relaxed">{data.database.type}</p>
          </div>

          {/* Google Drive */}
          <div className="border border-white/[0.08] bg-carbon-900/60 p-3.5 space-y-1.5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">Google Drive API</p>
            <div className="flex items-center gap-1.5 font-semibold">
              {data.gdrive.isConfigured ? (
                <>
                  <CheckCircle2 size={13} className="text-signal-ok" />
                  <span className="text-signal-ok">Service Account Aktif</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-signal-warn" />
                  <span className="text-signal-warn">Default Demo Mode</span>
                </>
              )}
            </div>
            <p className="font-mono text-[0.625rem] text-ink-mute truncate">Folder: {data.gdrive.rootFolderId}</p>
          </div>

          {/* Email */}
          <div className="border border-white/[0.08] bg-carbon-900/60 p-3.5 space-y-1.5">
            <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">Email Notifikasi</p>
            <div className="flex items-center gap-1.5 font-semibold">
              {data.email.isConfigured ? (
                <>
                  <CheckCircle2 size={13} className="text-signal-ok" />
                  <span className="text-signal-ok">SMTP Terhubung</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-signal-warn" />
                  <span className="text-signal-warn">Outbox Memory</span>
                </>
              )}
            </div>
            <p className="text-[0.6875rem] text-ink-mute">Pengirim: mugiiistore@gmail.com</p>
          </div>
        </div>
      )}
    </section>
  );
}
