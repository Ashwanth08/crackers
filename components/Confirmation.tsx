"use client";

/**
 * Confirmation — celebratory modern success screen shown after submission.
 * Keeps the exact heading, Order ID display, reassurance, and the two action
 * buttons. Props/handlers unchanged.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

export interface ConfirmationProps {
  orderId: string;
  onContinueShopping: () => void;
  onViewOrderSummary: () => void;
}

const BUTTON_BASE =
  "min-h-[48px] inline-flex items-center justify-center rounded-pill px-6 " +
  "text-base font-bold leading-none transition-all select-none " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2";

const ACCENTS: ReadonlyArray<{ top: string; left: string; color: string; size: string }> = [
  { top: "10%", left: "8%", color: "var(--color-gold)", size: "10px" },
  { top: "16%", left: "88%", color: "var(--color-red)", size: "8px" },
  { top: "78%", left: "14%", color: "var(--color-red)", size: "8px" },
  { top: "84%", left: "84%", color: "var(--color-gold)", size: "10px" },
];

export default function Confirmation({ orderId, onContinueShopping, onViewOrderSummary }: ConfirmationProps) {
  return (
    <section aria-label="Order confirmation" className="festive-bg flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div role="status" aria-live="polite" className="relative w-full max-w-md overflow-hidden rounded-card bg-card px-6 py-10 text-center shadow-card-hover sm:px-8 animate-fade-up">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {ACCENTS.map((a, i) => (
            <span key={i} className="absolute block rounded-full" style={{ top: a.top, left: a.left, width: a.size, height: a.size, backgroundColor: a.color, boxShadow: `0 0 10px 1px ${a.color}` }} />
          ))}
        </div>

        <div className="relative flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-festive-red text-3xl shadow-glow">🎉</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            🎉 Order Submitted Successfully!
          </h1>

          <div className="w-full rounded-card border-2 border-dashed border-gold bg-cream px-4 py-4">
            <p className="text-sm font-medium uppercase tracking-wide text-navy/60">Order ID</p>
            <p className="mt-1 text-2xl font-bold tracking-wider text-festive-red sm:text-3xl">{orderId}</p>
          </div>

          <p className="text-base leading-relaxed text-navy/80">
            Your order has been received successfully. You'll get a call for confirmation within 2 hours to confirm availability, delivery and payment details.
          </p>

          <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:flex-row">
            <button type="button" onClick={onContinueShopping} className={`${BUTTON_BASE} btn-festive flex-1`}>
              Continue Shopping
            </button>
            <button type="button" onClick={onViewOrderSummary} className={`${BUTTON_BASE} flex-1 border-2 border-navy bg-transparent text-navy hover:bg-navy/5`}>
              View Order Summary
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

