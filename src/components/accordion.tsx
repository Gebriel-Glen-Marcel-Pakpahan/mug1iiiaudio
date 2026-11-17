"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
}: {
  items: { q: string; a: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-gold-bright"
            >
              <span className={cn("text-[0.9375rem]", isOpen ? "text-ink" : "text-ink-soft")}>
                {item.q}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center border transition-colors",
                  isOpen ? "border-gold/50 text-gold" : "border-white/15 text-ink-faint",
                )}
              >
                {isOpen ? <Minus size={11} /> : <Plus size={11} />}
              </span>
            </button>
            <div
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows] duration-300",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0">
                <div className="max-w-2xl pb-6 text-sm leading-relaxed text-ink-mute">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
