"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 30-second preview player (PRD §14 "Preview 30 detik").
 *
 * Instead of shipping audio files, the preview is synthesised in the browser with
 * the Web Audio API. Each album derives its own scale, tempo and timbre from a
 * seed, so the demo has real, distinct sound while the catalogue stays asset-free.
 * Swapping in `<audio src={previewUrl}>` later is a drop-in change.
 */

const PREVIEW_SECONDS = 30;

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Minor pentatonic + dorian flavours; picked deterministically per album. */
const SCALES = [
  [0, 3, 5, 7, 10, 12, 15, 19],
  [0, 2, 3, 7, 9, 12, 14, 19],
  [0, 5, 7, 10, 12, 15, 17, 22],
  [0, 2, 5, 7, 10, 12, 17, 19],
];

export function PreviewPlayer({
  seed,
  title,
  compact = false,
}: {
  seed: string;
  title: string;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 44 }, () => 0.15));

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const stopRef = useRef<() => void>(() => undefined);

  const cleanup = useCallback(() => {
    timersRef.current.forEach((t) => window.clearInterval(t));
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      masterRef.current?.gain.cancelScheduledValues(0);
      if (masterRef.current) masterRef.current.gain.value = 0;
    } catch {
      /* context may already be closed */
    }
    ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    masterRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(false);
    setElapsed(0);
    setLevels(Array.from({ length: 44 }, () => 0.12));
  }, [cleanup]);

  stopRef.current = stop;

  const start = useCallback(async () => {
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
    masterRef.current = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(master);
    analyserRef.current = analyser;

    // gentle fade-in
    master.gain.linearRampToValueAtTime(0.34, ctx.currentTime + 1.2);

    const seedNum = hashSeed(seed);
    const scale = SCALES[seedNum % SCALES.length];
    const root = 110 * Math.pow(2, (seedNum % 5) / 12);
    const bpm = 54 + (seedNum % 5) * 7;
    const beat = 60 / bpm;

    // Reverb-ish pad: two detuned oscillators through a lowpass.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.7;
    padFilter.connect(analyser);

    const padGain = ctx.createGain();
    padGain.gain.value = 0.11;
    padGain.connect(padFilter);

    [0, 7].forEach((semi) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = root * Math.pow(2, semi / 12) * 0.5;
      osc.detune.value = semi === 0 ? -6 : 7;
      osc.connect(padGain);
      osc.start();
      osc.stop(ctx.currentTime + PREVIEW_SECONDS + 1);
    });

    // Slow filter sweep for movement.
    padFilter.frequency.setValueAtTime(600, ctx.currentTime);
    padFilter.frequency.linearRampToValueAtTime(2200, ctx.currentTime + PREVIEW_SECONDS * 0.55);
    padFilter.frequency.linearRampToValueAtTime(800, ctx.currentTime + PREVIEW_SECONDS);

    let step = 0;
    const pluck = () => {
      if (!ctxRef.current) return;
      const t = ctx.currentTime;
      const noteIndex = (step * 3 + (seedNum % 4)) % scale.length;
      const octave = step % 8 === 0 ? 2 : 1;
      const freq = root * Math.pow(2, scale[noteIndex] / 12) * octave;

      const osc = ctx.createOscillator();
      osc.type = seedNum % 2 === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);

      osc.connect(g);
      g.connect(analyser);
      osc.start(t);
      osc.stop(t + 2);

      step += 1;
    };

    pluck();
    const pluckTimer = window.setInterval(pluck, beat * 1000 * 0.5);

    // Soft kick on the bar for pulse.
    const thump = () => {
      if (!ctxRef.current) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(92, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(g);
      g.connect(analyser);
      osc.start(t);
      osc.stop(t + 0.45);
    };
    const thumpTimer = window.setInterval(thump, beat * 1000 * 2);

    timersRef.current.push(pluckTimer, thumpTimer);

    startRef.current = performance.now();
    setPlaying(true);
    setElapsed(0);

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!ctxRef.current) return;
      const secs = (performance.now() - startRef.current) / 1000;
      setElapsed(Math.min(secs, PREVIEW_SECONDS));

      analyser.getByteFrequencyData(buffer);
      const bins = 44;
      const next: number[] = [];
      for (let i = 0; i < bins; i++) {
        const from = Math.floor((i / bins) * buffer.length * 0.62);
        const to = Math.floor(((i + 1) / bins) * buffer.length * 0.62);
        let sum = 0;
        for (let j = from; j < to; j++) sum += buffer[j] ?? 0;
        const avg = sum / Math.max(to - from, 1) / 255;
        next.push(Math.max(0.1, avg));
      }
      setLevels(next);

      if (secs >= PREVIEW_SECONDS) {
        stopRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [seed]);

  const progress = (elapsed / PREVIEW_SECONDS) * 100;
  const avgLevel = levels.reduce((acc, v) => acc + v, 0) / Math.max(levels.length, 1);
  // Map audio amplitude (0.1..0.85) to analog VU needle angle (-38deg..+34deg)
  const needleAngle = playing ? Math.min(34, Math.max(-38, -42 + avgLevel * 115)) : -34;
  const isPeak = playing && avgLevel > 0.48;

  return (
    <div
      className={cn(
        "group/player glass-card relative overflow-hidden transition-all duration-500 ease-spring",
        playing
          ? "border-gold/50 shadow-[0_0_40px_-15px_rgba(212,175,55,0.3)]"
          : "border-white/[0.1]",
        compact ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      {/* Subtle ambient sine wave background when playing */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-10 overflow-hidden transition-opacity duration-700",
          playing ? "opacity-30" : "opacity-10",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 400 24" className="h-full w-[200%] animate-wave-drift text-gold" fill="none">
          <path
            d="M0 12 Q 25 2, 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 T 350 12 T 400 12"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div className="relative flex items-center gap-4">
        <button
          type="button"
          onClick={() => (playing ? stop() : start())}
          aria-label={playing ? `Hentikan preview ${title}` : `Putar preview 30 detik ${title}`}
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-spring",
            compact ? "h-10 w-10" : "h-12 w-12",
            playing
              ? "border-gold bg-gold text-carbon-950 shadow-[0_0_24px_rgba(212,175,55,0.55)]"
              : "border-gold/45 bg-carbon-950/60 text-gold hover:scale-105 hover:bg-gold hover:text-carbon-950",
          )}
        >
          {playing && (
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-gold/60" />
          )}
          {playing ? (
            <Pause size={compact ? 14 : 16} className="fill-current" />
          ) : (
            <Play size={compact ? 14 : 16} className="ml-0.5 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 truncate font-mono text-2xs uppercase tracking-label text-ink-mute">
              {playing ? (
                <>
                  <span className="text-gold-bright">Preview 30 detik</span>
                  <span className="flex h-2.5 items-end gap-[2px]" aria-hidden="true">
                    {[0, 130, 260, 80].map((d, idx) => (
                      <span
                        key={idx}
                        className="w-[2px] origin-bottom animate-bar-dance bg-gold"
                        style={{ height: "100%", animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </>
              ) : (
                "Dengarkan preview"
              )}
            </span>
            <span className="num shrink-0 font-mono text-2xs text-ink-faint">
              {playing ? `${Math.floor(elapsed)}s / 30s` : "00s / 30s"}
            </span>
          </div>

          <div className="relative h-8">
            <div className="absolute inset-0 flex items-center justify-between gap-[2px]">
              {levels.map((lvl, i) => {
                const passed = (i / levels.length) * 100 <= progress;
                return (
                  <span
                    key={i}
                    className={cn(
                      "w-full origin-center rounded-full transition-[height,background-color] duration-100",
                      passed ? "bg-gold" : playing ? "bg-ink/25" : "bg-ink/15",
                    )}
                    style={{ height: `${Math.max(4, lvl * 100)}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-2 h-px w-full overflow-hidden bg-white/10">
            <div
              className="h-full bg-gold transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Analog dB VU Meter Gauge */}
        {!compact && (
          <div
            className="hidden sm:flex flex-col items-center justify-between border border-gold/25 bg-carbon-950/80 px-2.5 py-1.5 backdrop-blur-md shadow-inner"
            aria-label="Analog VU Meter"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-mono text-[0.4375rem] uppercase tracking-[0.2em] text-gold/80">
                VU · dB
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                  isPeak
                    ? "bg-signal-bad shadow-[0_0_8px_#D2665A]"
                    : playing
                      ? "bg-signal-ok/80"
                      : "bg-white/15",
                )}
                title="Peak Indicator"
              />
            </div>
            <svg viewBox="0 0 88 46" className="h-10 w-20 overflow-visible" aria-hidden="true">
              {/* Warm amber backlight glow */}
              <defs>
                <radialGradient id="vuGlow" cx="50%" cy="95%" r="75%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={playing ? "0.28" : "0.1"} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width="88" height="46" fill="url(#vuGlow)" />
              {/* Scale arc (-20dB to 0dB in gold, 0dB to +3dB in red) */}
              <path
                d="M 10 40 A 38 38 0 0 1 64 14"
                fill="none"
                stroke="rgba(212,175,55,0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M 64 14 A 38 38 0 0 1 78 40"
                fill="none"
                stroke="rgba(210,102,90,0.65)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Scale labels */}
              <text x="10" y="30" fill="#8B877D" fontSize="5" fontFamily="monospace">
                -20
              </text>
              <text x="40" y="13" fill="#C9C5BA" fontSize="5" fontFamily="monospace">
                -3
              </text>
              <text x="58" y="15" fill="#F2DC8C" fontSize="5" fontFamily="monospace">
                0
              </text>
              <text x="70" y="28" fill="#D2665A" fontSize="5" fontFamily="monospace">
                +3
              </text>
              {/* Needle */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: "44px 42px",
                  transition: playing ? "transform 90ms ease-out" : "transform 600ms cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <line
                  x1="44"
                  y1="42"
                  x2="44"
                  y2="8"
                  stroke="#F2DC8C"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </g>
              {/* Pivot cap */}
              <circle cx="44" cy="42" r="3.2" fill="#D4AF37" />
              <circle cx="44" cy="42" r="1.4" fill="#0B0B0F" />
            </svg>
          </div>
        )}

        {elapsed > 0 && (
          <button
            type="button"
            onClick={stop}
            aria-label="Ulangi preview"
            className="shrink-0 text-ink-faint transition-colors hover:text-gold-bright"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
