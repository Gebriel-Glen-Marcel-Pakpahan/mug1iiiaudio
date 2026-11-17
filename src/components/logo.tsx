import { cn } from "@/lib/utils";

/**
 * Wordmark: a stylised tonearm resting on a record groove, set against a serif
 * masthead. The arm rotates in on first paint.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
          <circle cx="20" cy="20" r="18.5" fill="none" stroke="#D4AF37" strokeOpacity="0.32" />
          <circle cx="20" cy="20" r="14" fill="none" stroke="#D4AF37" strokeOpacity="0.18" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="#D4AF37" strokeOpacity="0.12" />
          <circle cx="20" cy="20" r="3.1" fill="#D4AF37" />
          <circle cx="20" cy="20" r="1.1" fill="#0B0B0F" />
          <g className="origin-[31px_9px] animate-needle-in">
            <path
              d="M31 9 L20.8 19.2"
              stroke="#F2DC8C"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="31" cy="9" r="2.6" fill="#F2DC8C" />
            <circle cx="31" cy="9" r="1" fill="#0B0B0F" />
          </g>
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.32rem] tracking-[0.02em] text-ink">
          MUG1III<span className="text-gold"> AUDIO</span>
        </span>
        {!compact && (
          <span className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.3em] text-ink-faint">
            Lossless Archive
          </span>
        )}
      </span>
    </span>
  );
}
