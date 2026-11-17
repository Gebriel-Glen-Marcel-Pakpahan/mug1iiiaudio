import { cn } from "@/lib/utils";

interface CoverArtProps {
  title: string;
  artist: string;
  palette: [string, string, string];
  mark: string;
  catalogueNo?: string;
  className?: string;
  /** controls the density of the generated texture */
  variant?: "card" | "hero" | "thumb";
}

/**
 * Generative cover art — every album gets a deterministic composition built from
 * its palette. No bitmap assets needed, and it stays razor-sharp at any size.
 */
export function CoverArt({
  title,
  artist,
  palette,
  mark,
  catalogueNo,
  className,
  variant = "card",
}: CoverArtProps) {
  const [deep, mid, light] = palette;
  const seed = hash(title);
  const ringCount = variant === "thumb" ? 3 : 6;

  return (
    <div
      className={cn("cover-frame relative isolate h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: deep }}
      role="img"
      aria-label={`Cover album ${title} oleh ${artist}`}
    >
      {/* base wash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at ${20 + (seed % 40)}% 8%, ${light}33 0%, transparent 55%),
                       radial-gradient(100% 100% at 80% 100%, ${mid}66 0%, transparent 62%),
                       linear-gradient(160deg, ${deep} 0%, ${mid} 120%)`,
        }}
      />

      {/* concentric grooves */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.5]">
        <div className="relative aspect-square w-[86%]">
          {Array.from({ length: ringCount }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                inset: `${i * (variant === "thumb" ? 9 : 7)}%`,
                borderColor: `${light}${i % 2 === 0 ? "26" : "14"}`,
                transform: `rotate(${seed % 30}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* geometric accent */}
      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={100 - (seed % 55)}
          x2="100"
          y2={(seed % 70) + 12}
          stroke={light}
          strokeWidth="0.25"
          strokeOpacity="0.5"
        />
        <line
          x1={seed % 60}
          y1="0"
          x2={(seed % 40) + 45}
          y2="100"
          stroke={light}
          strokeWidth="0.2"
          strokeOpacity="0.3"
        />
      </svg>

      {/* typographic plate */}
      <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-mono uppercase leading-none tracking-[0.2em]"
            style={{
              color: light,
              fontSize: variant === "thumb" ? "0.4rem" : "0.5rem",
              opacity: 0.85,
            }}
          >
            {catalogueNo ?? "MUG1III"}
          </span>
          <span
            className="font-mono uppercase tracking-[0.2em]"
            style={{ color: light, fontSize: variant === "thumb" ? "0.4rem" : "0.5rem", opacity: 0.6 }}
          >
            {mark}
          </span>
        </div>

        <div>
          <div
            className="font-display font-semibold leading-[1.08] tracking-[-0.015em] line-clamp-2"
            style={{
              color: light,
              fontSize:
                variant === "thumb"
                  ? "0.85rem"
                  : variant === "hero"
                    ? "clamp(1.8rem, 4.5vw, 3.25rem)"
                    : "clamp(1rem, 2vw, 1.45rem)",
              textShadow: `0 2px 24px ${deep}`,
            }}
          >
            {title}
          </div>
          {variant !== "thumb" && (
            <div
              className="mt-1.5 font-mono uppercase tracking-[0.2em] truncate"
              style={{ color: light, opacity: 0.78, fontSize: "0.5625rem" }}
            >
              {artist}
            </div>
          )}
        </div>
      </div>

      {/* edge vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.65)]" />
    </div>
  );
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
