"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X, UserRound, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Katalog" },
  { href: "/jelajah", label: "Jelajah" },
  { href: "/request", label: "Request Album" },
  { href: "/cara-unduh", label: "Cara Unduh" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!session?.user) {
      setCartCount(null);
      return;
    }
    let alive = true;
    const load = () =>
      fetch("/api/cart")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && setCartCount(d?.items?.length ?? 0))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session?.user, pathname]);

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 ease-spring",
        scrolled
          ? "glass-navbar"
          : "border-b border-white/[0.04] bg-carbon-950/35 backdrop-blur-md",
      )}
    >
      <div className="shell flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="group flex shrink-0 items-center" aria-label="MUG1III AUDIO — beranda">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                className={cn(
                  "underline-sweep font-mono text-[0.6875rem] uppercase tracking-label transition-colors duration-300",
                  active ? "text-gold-bright" : "text-ink-mute hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link
                href="/keranjang"
                className="relative flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-md text-ink-soft transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold/[0.08] hover:text-gold-bright"
                aria-label="Keranjang belanja"
              >
                <ShoppingBag size={16} strokeWidth={1.5} />
                {cartCount ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-mono text-[0.5625rem] font-medium text-carbon-950 shadow-[0_0_12px_rgba(212,175,55,0.6)]">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/pesanan"
                className="hidden h-10 items-center gap-2 border border-white/10 bg-white/[0.03] backdrop-blur-md px-3.5 font-mono text-[0.6875rem] uppercase tracking-label text-ink-soft transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold/[0.08] hover:text-gold-bright sm:flex"
              >
                <UserRound size={14} strokeWidth={1.5} />
                Pesanan
              </Link>

              {isAdmin ? (
                <Link
                  href="/admin"
                  className="hidden h-10 items-center gap-2 border border-gold/40 bg-gold/15 backdrop-blur-md px-3 font-mono text-[0.6875rem] uppercase tracking-label text-gold-bright transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:bg-gold/25 sm:flex"
                  title={`Login sebagai Admin: ${session.user.email}`}
                >
                  <ShieldCheck size={14} className="text-gold" />
                  <span>Admin Toko</span>
                </Link>
              ) : (
                <div
                  className="hidden h-10 items-center gap-2 border border-white/10 bg-white/[0.03] backdrop-blur-md px-3 font-mono text-[0.625rem] uppercase tracking-label text-ink-soft md:flex"
                  title={`Login sebagai Pelanggan: ${session.user.email}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="max-w-[120px] truncate text-ink font-medium">
                    {session.user.name || session.user.email?.split("@")[0]}
                  </span>
                  <span className="border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[0.55rem] font-semibold text-emerald-400">
                    Pelanggan
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-md text-ink-mute transition-all duration-300 ease-spring hover:border-signal-bad/40 hover:bg-signal-bad/[0.08] hover:text-signal-bad sm:flex"
                aria-label="Keluar"
              >
                <LogOut size={15} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <Link href="/masuk" className="btn-outline btn-sm hidden sm:inline-flex">
              Masuk
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-md text-ink transition-colors hover:border-gold/40 lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Tutup menu" : "Buka menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-t border-gold/15 bg-carbon-900/90 backdrop-blur-2xl transition-[max-height,opacity] duration-500 ease-spring lg:hidden",
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="shell flex flex-col gap-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b border-white/[0.06] py-3 font-mono text-xs uppercase tracking-label text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
          {session?.user ? (
            <>
              {/* User Identity Pill in Mobile Menu */}
              <div className="mb-2 border-b border-white/[0.08] pb-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-ink">
                    {session.user.name || session.user.email}
                  </span>
                  {isAdmin ? (
                    <span className="flex items-center gap-1 border border-gold/40 bg-gold/15 px-2 py-0.5 font-mono text-[0.5625rem] font-bold text-gold-bright">
                      <ShieldCheck size={11} /> ADMIN TOKO
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[0.5625rem] font-bold text-emerald-400">
                      <UserRound size={11} /> PELANGGAN
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[0.5625rem] text-ink-mute">
                  {session.user.email}
                </p>
              </div>

              <Link
                href="/pesanan"
                className="border-b border-white/[0.06] py-3 font-mono text-xs uppercase tracking-label text-ink-soft"
              >
                Pesanan Saya
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="border-b border-white/[0.06] py-3 font-mono text-xs uppercase tracking-label text-gold-bright"
                >
                  Admin Panel (Operasional)
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="py-3 text-left font-mono text-xs uppercase tracking-label text-ink-mute"
              >
                Keluar
              </button>
            </>
          ) : (
            <Link
              href="/masuk"
              className="mt-2 border border-gold/40 bg-gold/[0.08] py-3 text-center font-mono text-xs uppercase tracking-label text-gold-bright"
            >
              Masuk dengan Google
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
