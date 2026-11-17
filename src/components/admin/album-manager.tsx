"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Edit2, FileAudio, FolderOpen, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn, formatIDR } from "@/lib/utils";

interface Row {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;
  format: string;
  sampleRate: string;
  bitDepth: string;
  trackCount: number;
  totalSizeMb: number;
  isPublished: boolean;
  gdriveFolderId: string;
  priceLabel: string;
  sizeLabel: string;
}

const EMPTY_FORM = {
  id: "",
  title: "",
  artist: "",
  genre: "Indo Pop",
  description: "",
  price: "4500",
  format: "FLAC",
  sampleRate: "44.1 kHz",
  bitDepth: "16-bit",
  totalSizeMb: "250",
  trackCount: "9",
  totalDuration: "35:00",
  year: String(new Date().getFullYear()),
  label: "",
  catalogueNo: "",
  gdriveFolderId: "",
  isPublished: true,
};

export function AdminAlbumManager({ albums }: { albums: Row[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-parse FLAC metadata client-side
  async function handleFlacFile(file: File) {
    try {
      const slice = await file.slice(0, 65536).arrayBuffer();
      const bytes = new Uint8Array(slice);
      const dec = new TextDecoder();
      if (dec.decode(bytes.subarray(0, 4)) !== "fLaC") return;

      const sr = (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4);
      const bps = (((bytes[20] & 0x01) << 4) | (bytes[21] >> 4)) + 1;

      let pos = 4;
      let last = false;
      let artist = form.artist;
      let album = form.title;
      let genre = form.genre;
      let date = form.year;

      while (!last && pos < bytes.length - 4) {
        const hdr = bytes[pos];
        last = (hdr & 0x80) !== 0;
        const type = hdr & 0x7f;
        const len = (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
        pos += 4;
        if (type === 4 && pos + len <= bytes.length) {
          let p = pos;
          const vLen = new DataView(slice).getUint32(p, true);
          p += 4 + vLen;
          const count = new DataView(slice).getUint32(p, true);
          p += 4;
          for (let i = 0; i < count && p < pos + len; i++) {
            const cLen = new DataView(slice).getUint32(p, true);
            p += 4;
            if (p + cLen > bytes.length) break;
            const str = dec.decode(bytes.subarray(p, p + cLen));
            p += cLen;
            const eq = str.indexOf("=");
            if (eq > 0) {
              const k = str.slice(0, eq).toUpperCase();
              const v = str.slice(eq + 1).trim();
              if (k === "ALBUM" && !album) album = v;
              if (k === "ARTIST" && !artist) artist = v;
              if (k === "GENRE") genre = v.split(";")[0].trim();
              if (k === "DATE" || k === "YEAR") date = v.slice(0, 4);
            }
          }
        }
        pos += len;
      }

      const tc = Number(form.trackCount) || 9;
      setForm((prev) => ({
        ...prev,
        title: album || prev.title,
        artist: artist || prev.artist,
        genre: genre || prev.genre,
        year: date || prev.year,
        sampleRate: `${sr / 1000} kHz`,
        bitDepth: `${bps}-bit`,
        price: String(tc * 500),
      }));
    } catch {
      /* transient */
    }
  }

  async function saveAlbum(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    try {
      const url = isEditing ? `/api/admin/albums/${form.id}` : "/api/admin/albums";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          totalSizeMb: Number(form.totalSizeMb),
          trackCount: Number(form.trackCount),
          year: Number(form.year),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan album.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan album.");
    } finally {
      setBusy(null);
    }
  }

  async function togglePublish(row: Row) {
    setBusy(row.id);
    try {
      await fetch(`/api/admin/albums/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !row.isPublished }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteAlbum(row: Row) {
    if (!confirm(`Hapus/arsipkan album "${row.title}"?`)) return;
    setBusy(row.id);
    try {
      await fetch(`/api/admin/albums/${row.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
          {albums.length} album terdaftar · Patokan Rp 500 / lagu
        </p>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setIsEditing(false);
              setForm(EMPTY_FORM);
            } else {
              setForm(EMPTY_FORM);
              setIsEditing(false);
              setShowForm(true);
            }
          }}
          className="btn-gold btn-sm"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "Tutup form" : "Album baru"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveAlbum} className="plate space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-gold" />
              <p className="font-mono text-2xs uppercase tracking-label text-ink-mute">
                {isEditing ? "Edit album" : "Tambah album baru (Auto-Fill Metadata)"}
              </p>
            </div>
          </div>

          {!isEditing && (
            <div className="border border-dashed border-gold/30 bg-gold/[0.04] p-4 text-center">
              <FileAudio size={20} className="mx-auto text-gold" />
              <p className="mt-2 text-xs font-medium text-ink">
                Pilih salah satu file .FLAC dari album ini untuk mengisi otomatis:
              </p>
              <input
                type="file"
                accept=".flac"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFlacFile(f);
                }}
                className="mt-2 text-xs text-ink-mute file:mr-3 file:border-0 file:bg-gold file:px-3 file:py-1 file:font-mono file:text-[0.625rem] file:uppercase file:text-carbon-950"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-title">
                Judul album
              </label>
              <input
                id="f-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="field text-[0.8125rem]"
                placeholder="Musim Yang Baik"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-artist">
                Nama Artis / Band
              </label>
              <input
                id="f-artist"
                required
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="field text-[0.8125rem]"
                placeholder="Sheila On 7"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-genre">
                Genre
              </label>
              <input
                id="f-genre"
                required
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="field text-[0.8125rem]"
                placeholder="Pop / Rock"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-gdrive">
                ID / Tautan Google Drive (Tempat File .ZIP)
              </label>
              <input
                id="f-gdrive"
                value={form.gdriveFolderId}
                onChange={(e) => setForm({ ...form, gdriveFolderId: e.target.value })}
                className="field text-[0.8125rem]"
                placeholder="1ABC...xyz (ID folder Google Drive)"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-tracks">
                Jumlah Lagu
              </label>
              <input
                id="f-tracks"
                required
                type="number"
                value={form.trackCount}
                onChange={(e) => {
                  const tc = Number(e.target.value) || 1;
                  setForm({ ...form, trackCount: e.target.value, price: String(tc * 500) });
                }}
                className="field text-[0.8125rem]"
                placeholder="9"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-price">
                Harga Total (Rp 500 × Jumlah Lagu)
              </label>
              <input
                id="f-price"
                required
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="field text-[0.8125rem]"
                placeholder="4500"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-sr">
                Sample Rate &amp; Bit Depth
              </label>
              <div className="flex gap-2">
                <input
                  id="f-sr"
                  value={form.sampleRate}
                  onChange={(e) => setForm({ ...form, sampleRate: e.target.value })}
                  className="field text-[0.8125rem]"
                  placeholder="96 kHz"
                />
                <input
                  value={form.bitDepth}
                  onChange={(e) => setForm({ ...form, bitDepth: e.target.value })}
                  className="field text-[0.8125rem]"
                  placeholder="24-bit"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="f-year">
                Tahun Rilis &amp; Total Ukuran (MB)
              </label>
              <div className="flex gap-2">
                <input
                  id="f-year"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="field text-[0.8125rem]"
                  placeholder="2014"
                />
                <input
                  value={form.totalSizeMb}
                  onChange={(e) => setForm({ ...form, totalSizeMb: e.target.value })}
                  className="field text-[0.8125rem]"
                  placeholder="570"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="f-desc">
              Catatan Singkat Album
            </label>
            <textarea
              id="f-desc"
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="field resize-none text-[0.8125rem]"
              placeholder="Koleksi master rekaman FLAC..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[0.8125rem] text-ink-soft">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="h-4 w-4 accent-[#D4AF37]"
              />
              Tampilkan di katalog web
            </label>
            <button type="submit" disabled={busy === "save"} className="btn-gold btn-sm ml-auto">
              {busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {isEditing ? "Perbarui album" : "Simpan album"}
            </button>
          </div>

          {error && (
            <p className="text-xs text-signal-bad" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <div className="plate overflow-x-auto">
        <table className="data-table min-w-[780px]">
          <thead>
            <tr>
              <th>Album</th>
              <th>Format</th>
              <th>Drive Folder ID</th>
              <th className="text-right">Harga (Rp 500/lagu)</th>
              <th className="text-center">Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className="text-[0.8125rem] text-ink">{row.title}</p>
                  <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                    {row.artist} · {row.genre} · {row.trackCount} track
                  </p>
                </td>
                <td className="whitespace-nowrap font-mono text-[0.625rem]">
                  {row.format} · {row.bitDepth}
                  <br />
                  <span className="text-ink-faint">{row.sampleRate}</span>
                </td>
                <td className="max-w-[140px] truncate font-mono text-[0.5625rem] text-ink-faint">
                  {row.gdriveFolderId}
                </td>
                <td className="num whitespace-nowrap text-right text-[0.75rem]">
                  {formatIDR(row.price)}
                </td>
                <td className="text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-label",
                      row.isPublished
                        ? "border-signal-ok/35 bg-signal-ok/[0.08] text-signal-ok"
                        : "border-white/12 text-ink-faint",
                    )}
                  >
                    {row.isPublished ? <Check size={9} /> : <Ban size={9} />}
                    {row.isPublished ? "Aktif" : "Draf"}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => void togglePublish(row)}
                      disabled={busy === row.id}
                      className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-mute transition-colors hover:text-gold-bright"
                    >
                      {row.isPublished ? "Sembunyikan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => {
                        setForm({
                          id: row.id,
                          title: row.title,
                          artist: row.artist,
                          genre: row.genre,
                          description: "Koleksi master album FLAC...",
                          price: String(row.price),
                          format: row.format,
                          sampleRate: row.sampleRate,
                          bitDepth: row.bitDepth,
                          totalSizeMb: String(row.totalSizeMb),
                          trackCount: String(row.trackCount),
                          totalDuration: "40:00",
                          year: "2024",
                          label: "",
                          catalogueNo: "",
                          gdriveFolderId: row.gdriveFolderId,
                          isPublished: row.isPublished,
                        });
                        setIsEditing(true);
                        setShowForm(true);
                      }}
                      className="p-1 text-ink-mute hover:text-gold"
                      title="Edit album"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => void deleteAlbum(row)}
                      className="p-1 text-ink-mute hover:text-signal-bad"
                      title="Hapus album"
                    >
                      <Trash2 size={12} />
                    </button>
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
