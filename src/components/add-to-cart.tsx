"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Loader2, Plus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddToCart({ albumId, albumTitle }: { albumId: string; albumTitle: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function buyNow() {
    if (!session?.user) {
      router.push(`/masuk?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setState("loading");
    setMessage(null);
    try {
      // Sync to cart and navigate directly to checkout with albumId for instant, zero-delay flow
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      }).catch(() => {});
      router.push(`/checkout?albumId=${albumId}`);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Gagal memproses pembelian.");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  async function add() {
    if (!session?.user) {
      router.push(`/masuk?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menambahkan ke keranjang.");
      setState("added");
      router.refresh();
      setTimeout(() => setState("idle"), 2600);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Gagal menambahkan.");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  if (status === "loading") {
    return <div className="h-12 w-56 animate-pulse bg-white/[0.04]" />;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={buyNow}
          disabled={state === "loading"}
          className="btn-gold min-w-[12rem] justify-center"
        >
          {state === "loading" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ArrowRight size={15} />
          )}
          Beli Sekarang
        </button>

        <button
          onClick={add}
          disabled={state === "loading"}
          className={cn(
            "btn-outline",
            state === "added" && "!border-signal-ok !text-signal-ok",
          )}
        >
          {state === "added" ? <Check size={14} /> : <Plus size={14} />}
          {state === "added" ? "Ditambahkan" : "Tambah ke Keranjang"}
        </button>
      </div>

      {state === "added" && (
        <button
          onClick={() => router.push("/keranjang")}
          className="mt-1 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-gold-bright hover:underline"
        >
          <ShoppingBag size={13} />
          Buka Keranjang Belanja &rarr;
        </button>
      )}

      {!session?.user && (
        <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
          Butuh akun Google untuk akses file
        </p>
      )}
      {message && (
        <p className="text-xs text-signal-bad" role="alert">
          {message}
        </p>
      )}
      <span className="sr-only">{albumTitle}</span>
    </div>
  );
}
