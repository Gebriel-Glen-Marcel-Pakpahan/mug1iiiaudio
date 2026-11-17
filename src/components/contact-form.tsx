"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [form, setForm] = useState({ name: "", email: "", order: "", message: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    // Demo: no mail transport wired. The real build posts to the support inbox.
    setTimeout(() => setState("done"), 900);
  }

  if (state === "done") {
    return (
      <div className="mt-6 flex items-start gap-3 border border-signal-ok/30 bg-signal-ok/[0.06] p-5">
        <Check size={16} className="mt-0.5 shrink-0 text-signal-ok" />
        <div>
          <p className="text-sm text-ink">Pesan terkirim</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-mute">
            Terima kasih, {form.name || "kak"}. Tim support akan membalas ke {form.email} pada hari
            kerja berikutnya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">
            Nama
          </label>
          <input
            id="c-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field"
            placeholder="Nama Anda"
          />
        </div>
        <div>
          <label className="label" htmlFor="c-email">
            Email
          </label>
          <input
            id="c-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
            placeholder="nama@gmail.com"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="c-order">
          Nomor pesanan (opsional)
        </label>
        <input
          id="c-order"
          value={form.order}
          onChange={(e) => setForm({ ...form, order: e.target.value })}
          className="field"
          placeholder="ORD-20261117-XXXX"
        />
      </div>

      <div>
        <label className="label" htmlFor="c-message">
          Pesan
        </label>
        <textarea
          id="c-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="field resize-none"
          placeholder="Ceritakan kendala Anda…"
        />
      </div>

      <button type="submit" disabled={state === "loading"} className="btn-gold w-full justify-center">
        {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
        Kirim pesan
      </button>
    </form>
  );
}
