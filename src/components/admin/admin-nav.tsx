"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/album", label: "Kelola album" },
  { href: "/admin/pesanan", label: "Kelola pesanan" },
  { href: "/admin/requests", label: "Request album" },
  { href: "/admin/refund", label: "Refund" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5" aria-label="Navigasi admin">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            className={cn(
              "relative shrink-0 border-l px-4 py-2.5 font-mono text-[0.625rem] uppercase tracking-label transition-colors",
              active
                ? "border-gold bg-gold/[0.06] text-gold-bright"
                : "border-white/[0.07] text-ink-mute hover:border-white/20 hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
