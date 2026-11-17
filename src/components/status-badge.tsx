import { cn, statusLabel } from "@/lib/utils";
import type { OrderStatus, AccessStatus, PaymentStatus, RefundStatus } from "@/lib/types";

const TONE: Record<string, string> = {
  ok: "border-signal-ok/35 bg-signal-ok/[0.08] text-signal-ok",
  warn: "border-signal-warn/35 bg-signal-warn/[0.08] text-signal-warn",
  bad: "border-signal-bad/35 bg-signal-bad/[0.08] text-signal-bad",
  info: "border-signal-info/35 bg-signal-info/[0.08] text-signal-info",
  gold: "border-gold/35 bg-gold/[0.08] text-gold-bright",
};

const MAP: Record<string, keyof typeof TONE> = {
  PENDING: "warn",
  PAID: "ok",
  CANCELLED: "bad",
  REFUNDED: "info",
  GRANTING: "warn",
  GRANTED: "ok",
  FAILED: "bad",
  SUCCESS: "ok",
  REQUESTED: "warn",
  APPROVED: "info",
  REJECTED: "bad",
  DONE: "ok",
};

export function StatusBadge({
  status,
  labelOverride,
  className,
}: {
  status: OrderStatus | AccessStatus | PaymentStatus | RefundStatus | string;
  labelOverride?: string;
  className?: string;
}) {
  const tone = MAP[status] ?? "gold";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-label",
        TONE[tone],
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {labelOverride ?? statusLabel[status] ?? status}
    </span>
  );
}
