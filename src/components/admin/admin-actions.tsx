"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, X } from "lucide-react";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Aksi gagal.");
}

export function ApproveOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!confirm("Verifikasi bahwa dana QRIS telah diterima dan aktifkan akses Google Drive pembeli?")) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/api/admin/orders/${orderId}/approve`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy} className="btn-gold btn-sm w-full justify-center">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        Verifikasi Lunas &amp; Buka Akses Drive
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-signal-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function RetryAccessButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/admin/orders/${orderId}/retry-access`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy} className="btn-outline btn-sm">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        Kirim ulang akses Drive
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-signal-bad">
          {error}
        </p>
      )}
    </div>
  );
}

/** Approve (revokes Drive access, PRD §8.3) or reject a warranty request. */
export function RefundDecision({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(kind: "approve" | "reject") {
    if (note.trim().length < 4) {
      setError("Isi catatan resolusi (min. 4 karakter) — catatan dikirim ke pembeli.");
      return;
    }
    if (kind === "approve" && !confirm("Setujui refund? Akses Google Drive pembeli akan dicabut.")) return;
    setBusy(kind);
    setError(null);
    try {
      await post(`/api/admin/refunds/${refundId}/${kind}`, { note: note.trim() });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <label className="label" htmlFor={`note-${refundId}`}>
        Catatan resolusi
      </label>
      <textarea
        id={`note-${refundId}`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Mis. file track 6 korup, tidak dapat diganti — refund penuh."
        className="field resize-none text-[0.8125rem]"
      />
      {error && (
        <p role="alert" className="text-xs text-signal-bad">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => decide("approve")} disabled={!!busy} className="btn-gold btn-sm">
          {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Setujui &amp; cabut akses
        </button>
        <button onClick={() => decide("reject")} disabled={!!busy} className="btn-outline btn-sm">
          {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Tolak
        </button>
      </div>
    </div>
  );
}
