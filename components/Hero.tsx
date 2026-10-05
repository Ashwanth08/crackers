"use client";

/**
 * Hero — the immersive festive landing section.
 *
 * Dark festive-gradient stage with layered glow, animated firework sparkles
 * (GPU-cheap transform/opacity, disabled under prefers-reduced-motion), a large
 * gradient display title, tagline, and two glassy CTAs. Props and behaviour are
 * unchanged (onBrowse / onViewCart).
 *
 * Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 14.3
 */

import { useReducedMotion } from "framer-motion";

export interface HeroProps {
  onBrowse: () => void;
  onViewCart: () => void;
}

const SPARKLES: ReadonlyArray<{
  top: string;
  left: string;
  color: string;
  delay: string;
  size: string;
}> = [
  { top: "16%", left: "12%", color: "var(--color-gold)", delay: "0s", size: "10px" },
  { top: "26%", left: "84%", color: "var(--color-red)", delay: "0.4s", size: "8px" },
  { top: "60%", left: "18%", color: "var(--color-gold-light)", delay: "0.8s", size: "7px" },
  { top: "70%", left: "80%", color: "var(--color-gold)", delay: "1.1s", size: "9px" },
  { top: "40%", left: "50%", color: "var(--color-red)", delay: "0.6s", size: "6px" },
  { top: "12%", left: "60%", color: "var(--color-gold-light)", delay: "1.4s", size: "8px" },
  { top: "82%", left: "44%", color: "var(--color-gold)", delay: "1.0s", size: "7px" },
];

const CTA_BASE =
  "min-h-[48px] inline-flex items-center justify-center rounded-pill px-7 " +
  "text-base font-bold leading-none transition-all select-none " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-navy";

export default function Hero({ onBrowse, onViewCart }: HeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Sri Crackers"
      className="festive-bg relative overflow-hidden px-6 py-20 text-center sm:py-28"
    >
      <style>{`
        @keyframes sri-sparkle {
          0%, 100% { transform: scale(0.6); opacity: 0.3; }
          50%      { transform: scale(1.7); opacity: 1; }
        }
        .sri-sparkle-anim { animation: sri-sparkle 2.6s ease-in-out infinite; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) { .sri-sparkle-anim { animation: none; } }
      `}</style>

      {/* Soft radial glows. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 0%, rgba(245,197,24,0.22), transparent 60%), radial-gradient(500px 300px at 80% 100%, rgba(225,29,72,0.18), transparent 60%)",
        }}
      />

      {/* Sparkles. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className={`absolute block rounded-full ${prefersReducedMotion ? "" : "sri-sparkle-anim"}`}
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              backgroundColor: s.color,
              boxShadow: `0 0 14px 3px ${s.color}`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 animate-fade-up">
        <span className="rounded-pill border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light backdrop-blur-sm">
          Sivakasi Wholesale Rate
        </span>

        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          <span className="text-gold-gradient">Sri Crackers</span>{" "}
          <span aria-hidden="true">🎆</span>
        </h1>

        <p className="max-w-md text-base font-medium text-white/80 sm:text-lg">
          Quality Crackers at Sivakasi Wholesale Rate. Light up your festival
          with premium picks delivered to your door.
        </p>

        <div className="mt-3 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onBrowse} className={`${CTA_BASE} btn-festive`}>
            Browse Crackers
          </button>
          <button
            type="button"
            onClick={onViewCart}
            className={`${CTA_BASE} border-2 border-gold/70 bg-white/5 text-gold backdrop-blur-sm hover:bg-white/10`}
          >
            View Cart
          </button>
        </div>
      </div>
    </section>
  );
}
