"use client";

import { useState } from "react";
import { Check, Clock, Compass, Disc, Loader2, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { AlbumRequest, AlbumRequestStatus } from "@/lib/types";

const STATUSES: { value: AlbumRequestStatus; label: string }[] = [
  { value: "PENDING", label: "Menunggu Kurasi" },
  { value: "SEARCHING", label: "Sedang Dicari" },
  { value: "FULFILLED", label: "Tersedia di Katalog" },
  { value: "REJECTED", label: "Belum Ditemukan" },
];

export function AdminRequestsTable({ initialRequests }: { initialRequests: AlbumRequest[] }) {
  const [requests, setRequests] = useState<AlbumRequest[]>(initialRequests);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    initialRequests.reduce((acc, r) => ({ ...acc, [r.id]: r.adminNote || "" }), {}),
  );

  const handleUpdate = async (id: string, newStatus: AlbumRequestStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNote: notes[id] || null }),
      });
      if (res.ok) {
        const updated = (await res.json()) as AlbumRequest;
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus permintaan album ini?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="plate p-12 text-center">
        <Disc size={32} className="mx-auto text-ink-faint" />
        <p className="mt-4 text-sm text-ink-soft">Belum ada permintaan album dari pelanggan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="plate p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-ink">{req.albumTitle}</h3>
                <span className="font-mono text-xs uppercase tracking-label text-gold-bright">
                  by {req.artist}
                </span>
              </div>
              <p className="mt-1 font-mono text-2xs text-ink-mute">
                Format: <span className="text-ink">{req.formatPreference || "FLAC 24-bit"}</span> · Diajukan oleh:{" "}
                <span className="text-gold-bright">{req.userEmail}</span>{" "}
                {req.userContact && `(WA/Kontak: ${req.userContact})`} · {formatDate(req.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={req.status}
                disabled={updatingId === req.id}
                onChange={(e) => handleUpdate(req.id, e.target.value as AlbumRequestStatus)}
                className="border border-white/10 bg-carbon-900 px-3 py-1.5 font-mono text-xs text-ink focus:border-gold/60 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleDelete(req.id)}
                disabled={updatingId === req.id}
                className="p-1.5 text-ink-faint transition-colors hover:text-signal-bad"
                title="Hapus"
              >
                {updatingId === req.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          </div>

          {req.notes && (
            <div className="border border-white/[0.06] bg-carbon-950/60 p-3 text-xs text-ink-mute">
              <span className="font-mono text-2xs uppercase tracking-label text-ink-faint block mb-1">
                Catatan Pemohon:
              </span>
              {req.notes}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={notes[req.id] || ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
              placeholder="Tulis catatan kurator / admin untuk pemohon..."
              className="flex-1 border border-white/10 bg-carbon-950 px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-gold/60 focus:outline-none"
            />
            <button
              onClick={() => handleUpdate(req.id, req.status)}
              disabled={updatingId === req.id}
              className="btn-outline btn-sm px-3 text-xs"
            >
              Simpan Catatan
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
