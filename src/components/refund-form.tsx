"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, LifeBuoy } from "lucide-react";

export function RefundForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 12) {
      setError("Jelaskan masalahnya minimal 12 karakter.");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim permintaan.");
      setState("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="mt-4 flex items-start gap-2.5 border border-signal-ok/30 bg-signal-ok/[0.06] p-4">
        <Check size={14} className="mt-0.5 shrink-0 text-signal-ok" />
        <p className="text-[0.75rem] leading-relaxed text-ink-soft">
          Permintaan garansi terkirim. Admin meninjau maksimal 2×24 jam dan akan menghubungi email
          Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-white/[0.08] p-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
        >
          <LifeBuoy size={13} />
          Laporkan masalah / ajukan garansi
        </button>
      ) : (
        <form onSubmit={submit}>
          <label className="label" htmlFor="reason">
            Jelaskan masalah akses
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Contoh: folder album terbuka tetapi track 6 dan 7 tidak ada."
            className="field resize-none text-[0.8125rem]"
          />
          <div className="mt-3 flex items-start gap-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0 text-ink-faint" />
            <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
              Garansi hanya untuk tautan bermasalah atau file tidak lengkap karena kesalahan
              penjual. Barang digital tidak dapat dikembalikan.
            </p>
          </div>
          {error && (
            <p className="mt-2 text-xs text-signal-bad" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={state === "loading"} className="btn-gold btn-sm flex-1 justify-center">
              {state === "loading" ? <Loader2 size={13} className="animate-spin" /> : null}
              Kirim permintaan
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-outline btn-sm flex-1 justify-center"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
