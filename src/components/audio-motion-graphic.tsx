"use client";

import { useEffect, useRef } from "react";

/**
 * Audiophile Harmonic Oscilloscope & Spectrum Motion Graphic.
 * Renders multi-layer analog sine harmonics and frequency bars on an HTML5 Canvas at 60fps.
 */
export function AudioMotionGraphic({
  className = "",
  density = "medium",
}: {
  className?: string;
  density?: "low" | "medium" | "high";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      t += 0.016;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, w, h);

      if (w <= 0 || h <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const centerY = h * 0.52;

      // 1. Draw subtle background frequency spectrum bars (32 bars)
      const bars = density === "low" ? 24 : 36;
      const barWidth = Math.max(2, (w / bars) * 0.35);
      const gap = w / bars;

      for (let i = 0; i < bars; i++) {
        const x = i * gap + gap * 0.5;
        const norm = i / bars;
        // Frequency envelope (bell curve centered around mid-frequencies)
        const envelope = Math.sin(norm * Math.PI);
        const dynamicH =
          (Math.sin(t * 2.2 + i * 0.35) * 0.4 +
            Math.cos(t * 1.5 + i * 0.2) * 0.35 +
            0.55) *
          envelope *
          (h * 0.42);

        const gradient = ctx.createLinearGradient(x, centerY - dynamicH, x, centerY + dynamicH);
        gradient.addColorStop(0, "rgba(242, 220, 140, 0.22)");
        gradient.addColorStop(0.5, "rgba(212, 175, 55, 0.08)");
        gradient.addColorStop(1, "rgba(212, 175, 55, 0.0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x - barWidth / 2, centerY - dynamicH, barWidth, dynamicH * 2);

        // Peak dot
        ctx.fillStyle = "rgba(242, 220, 140, 0.45)";
        ctx.beginPath();
        ctx.arc(x, centerY - dynamicH, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Harmonic Sine Wave 1 — Fundamental (Deep Gold, Smooth)
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const k = x / w;
        const amp = Math.sin(k * Math.PI) * (h * 0.22);
        const y = centerY + Math.sin(k * 9 + t * 1.8) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 3. Harmonic Sine Wave 2 — 2nd Harmonic (Warm Amber, Faster Phase)
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const k = x / w;
        const amp = Math.sin(k * Math.PI) * (h * 0.16);
        const y = centerY + Math.sin(k * 18 - t * 2.4 + 1.2) * amp * Math.cos(t * 0.8 + k * 4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(242, 220, 140, 0.65)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Harmonic Sine Wave 3 — Hi-Res Micro Ripple (Fine Texture)
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const k = x / w;
        const amp = Math.sin(k * Math.PI) * (h * 0.08);
        const y =
          centerY +
          (Math.sin(k * 36 + t * 3.2) * 0.5 + Math.cos(k * 24 - t * 1.5) * 0.5) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 253, 240, 0.28)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return (
    <div className={`relative overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
}
