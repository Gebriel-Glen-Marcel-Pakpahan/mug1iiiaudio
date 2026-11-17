"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/types";

/**
 * Tracklist with per-row 30s preview. Each row synthesises its own motif with the
 * Web Audio API, derived from album seed + track number, so every row sounds
 * different and no audio assets are needed in the demo build.
 */

const PREVIEW_SECONDS = 30;

function seedOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function TrackList({ tracks, seed }: { tracks: Track[]; seed: string }) {
  const [active, setActive] = useState<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; timer: number } | null>(null);

  const stop = useCallback(() => {
    if (nodesRef.current) {
      window.clearInterval(nodesRef.current.timer);
      nodesRef.current.osc.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      nodesRef.current = null;
    }
    ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setActive(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const play = useCallback(
    async (track: Track) => {
      stop();

      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = new AudioCtor();
      ctxRef.current = ctx;
      await ctx.resume();

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);

      const s = seedOf(`${seed}:${track.no}:${track.title}`);
      const scale = [0, 2, 3, 5, 7, 10, 12, 14];
      const root = 130 * Math.pow(2, ((s % 7) - 3) / 12);
      const stepMs = 220 + (s % 5) * 40;

      const oscs: OscillatorNode[] = [];
      let step = 0;

      const ping = () => {
        if (!ctxRef.current) return;
        const t = ctx.currentTime;
        const note = scale[(step * (1 + (s % 3))) % scale.length] + (step % 16 === 0 ? 12 : 0);
        const osc = ctx.createOscillator();
        osc.type = s % 3 === 0 ? "sine" : "triangle";
        osc.frequency.value = root * Math.pow(2, note / 12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + 1.5);
        oscs.push(osc);
        step += 1;
      };

      ping();
      const timer = window.setInterval(ping, stepMs);
      nodesRef.current = { osc: oscs, timer };
      setActive(track.no);

      window.setTimeout(() => {
        if (ctxRef.current === ctx) stop();
      }, PREVIEW_SECONDS * 1000);
    },
    [seed, stop],
  );

  return (
    <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {tracks.map((track) => {
        const isActive = active === track.no;
        return (
          <li
            key={track.no}
            className={cn(
              "flex items-center gap-4 px-1 py-3 transition-colors",
              isActive ? "bg-gold/[0.05]" : "hover:bg-white/[0.02]",
            )}
          >
            <button
              onClick={() => (isActive ? stop() : void play(track))}
              aria-label={isActive ? `Hentikan preview ${track.title}` : `Putar preview ${track.title}`}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                isActive
                  ? "border-gold bg-gold text-carbon-950"
                  : "border-white/12 text-ink-mute hover:border-gold/60 hover:text-gold",
              )}
            >
              {isActive ? (
                <Pause size={11} className="fill-current" />
              ) : (
                <Play size={11} className="ml-0.5 fill-current" />
              )}
            </button>

            <span className="w-6 shrink-0 font-mono text-2xs text-ink-faint">
              {String(track.no).padStart(2, "0")}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm transition-colors",
                  isActive ? "text-gold-bright" : "text-ink-soft",
                )}
              >
                {track.title}
              </span>
              {isActive && (
                <span className="mt-1 flex h-2 items-end gap-[2px]" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[2px] origin-bottom animate-bar-dance bg-gold"
                      style={{ height: "100%", animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                </span>
              )}
            </span>

            <span className="num shrink-0 font-mono text-2xs text-ink-faint">{track.duration}</span>
          </li>
        );
      })}
    </ol>
  );
}
