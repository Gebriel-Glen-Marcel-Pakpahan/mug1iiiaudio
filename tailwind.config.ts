import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#F5F2EA",
          soft: "#C9C5BA",
          mute: "#8B877D",
          faint: "#807C72", // ≥4.5:1 on carbon-900 (WCAG AA for small labels)
        },
        carbon: {
          950: "#070709",
          900: "#0B0B0F",
          850: "#0E0E13",
          800: "#121218",
          750: "#17171F",
          700: "#1D1D26",
          600: "#26262F",
          500: "#33333D",
        },
        gold: {
          DEFAULT: "#D4AF37",
          bright: "#F2DC8C",
          deep: "#A8842A",
          dim: "#6E5720",
        },
        signal: {
          ok: "#6FBF8B",
          warn: "#D9A441",
          bad: "#D2665A",
          info: "#7FA6C9",
        },
      },
      fontFamily: {
        display: ["'Outfit'", "'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        editorial: ["'Playfair Display'", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "'Inter Tight'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      letterSpacing: {
        label: "0.18em",
        wide2: "0.28em",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        plate: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.9)",
        gold: "0 0 0 1px rgba(212,175,55,0.28), 0 18px 50px -24px rgba(212,175,55,0.35)",
        lift: "0 30px 80px -40px rgba(0,0,0,1)",
      },
      backgroundImage: {
        "gold-line": "linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)",
        "gold-sheen":
          "linear-gradient(135deg, #F2DC8C 0%, #D4AF37 38%, #A8842A 70%, #F2DC8C 100%)",
        "plate": "linear-gradient(180deg, #14141A 0%, #0E0E13 100%)",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "bar-dance": {
          "0%, 100%": { transform: "scaleY(0.28)" },
          "50%": { transform: "scaleY(1)" },
        },
        "needle-in": {
          from: { transform: "rotate(-24deg) translateY(-4px)", opacity: "0" },
          to: { transform: "rotate(0deg) translateY(0)", opacity: "1" },
        },
        "gold-sweep": {
          "0%": { transform: "translateX(-140%) skewX(-18deg)" },
          "45%, 100%": { transform: "translateX(240%) skewX(-18deg)" },
        },
        "wave-drift": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "vu-idle": {
          "0%, 100%": { transform: "rotate(-34deg)" },
          "50%": { transform: "rotate(-28deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 9s linear infinite",
        "fade-up": "fade-up 0.65s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.55s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2.6s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.16,1,0.3,1) infinite",
        "bar-dance": "bar-dance 0.85s cubic-bezier(0.45,0.05,0.55,0.95) infinite",
        "needle-in": "needle-in 0.75s cubic-bezier(0.16,1,0.3,1) both",
        "gold-sweep": "gold-sweep 4.2s cubic-bezier(0.16,1,0.3,1) infinite",
        "wave-drift": "wave-drift 8s linear infinite",
        "vu-idle": "vu-idle 3.6s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
