"use client";

/**
 * QuantitySelector — a compact, presentational horizontal control for adjusting
 * a line/product quantity. It renders a decrease ("−") button, the current
 * quantity value, and an increase ("+") button.
 *
 * This component is intentionally "dumb": it never mutates quantity itself. It
 * invokes `onDecrement` / `onIncrement` and the owning reducer enforces the
 * minimum-quantity clamp (Req 6.4). The only min-awareness here is a disabled
 * decrease button when `quantity <= minimumQuantity`, which keeps the user from
 * attempting to go below the minimum (Req 3.8).
 *
 * Accessibility & touch (Req 13.3):
 *  - Both buttons have aria-labels and a >=44x44px touch target.
 *  - The value region announces changes via aria-live="polite".
 *
 * Requirements: 3.3, 3.6, 3.7, 3.8, 6.4, 13.3
 */

export interface QuantitySelectorProps {
  /** Current quantity shown between the two buttons. */
  quantity: number;
  /** Minimum allowed quantity; the decrease button disables at/below this. */
  minimumQuantity: number;
  /** Invoked when the user taps the decrease ("−") button. */
  onDecrement: () => void;
  /** Invoked when the user taps the increase ("+") button. */
  onIncrement: () => void;
  /**
   * Optional explicit override to disable the decrease button (e.g. while a
   * parent is busy). When omitted, disabling is driven solely by the
   * quantity-vs-minimum check.
   */
  disabledDecrement?: boolean;
  /** Optional accessible label for the whole control group. */
  ariaLabel?: string;
}

const buttonBase =
  "min-h-[44px] min-w-[44px] inline-flex items-center justify-center " +
  "rounded border border-navy/20 px-3 text-lg font-bold leading-none " +
  "text-navy transition-colors select-none " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
  "focus-visible:ring-offset-1";

const buttonEnabled = "bg-gold hover:bg-gold-light active:bg-gold-light";

const buttonDisabled =
  "bg-navy/5 text-navy/30 border-navy/10 cursor-not-allowed";

export default function QuantitySelector({
  quantity,
  minimumQuantity,
  onDecrement,
  onIncrement,
  disabledDecrement,
  ariaLabel,
}: QuantitySelectorProps) {
  // At or below the minimum, the user cannot decrease further (Req 3.8, 6.4).
  const decrementDisabled =
    disabledDecrement ?? quantity <= minimumQuantity;

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="group"
      aria-label={ariaLabel ?? "Quantity selector"}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={decrementDisabled}
        aria-label="Decrease quantity"
        className={`${buttonBase} ${
          decrementDisabled ? buttonDisabled : buttonEnabled
        }`}
      >
        <span aria-hidden="true">−</span>
      </button>

      <span
        aria-live="polite"
        className="min-w-[2.25rem] rounded border border-navy/15 bg-card px-2 py-1 text-center text-base font-semibold text-navy tabular-nums"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={`${buttonBase} ${buttonEnabled}`}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
