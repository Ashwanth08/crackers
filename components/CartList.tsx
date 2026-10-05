"use client";

/**
 * CartList — the cart page line items plus a totals footer. Modern stacked
 * cards (no desktop table). Each line uses an image-free festive tile (gradient
 * + initials) instead of a photo. Totals recompute from the hook. Logic and
 * handlers unchanged.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { useCart } from "../lib/cart/CartContext";
import QuantitySelector from "./QuantitySelector";

const TILE_GRADIENTS = [
  "from-[#ff8a3d] via-[#f5c518] to-[#e11d48]",
  "from-[#7c3aed] via-[#e11d48] to-[#f5c518]",
  "from-[#0ea5e9] via-[#6366f1] to-[#e11d48]",
  "from-[#f5c518] via-[#ff8a3d] to-[#9f1239]",
  "from-[#10b981] via-[#0ea5e9] to-[#6366f1]",
] as const;

function initialsFor(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w.trim()[0])
    .filter((c) => c && /[A-Za-z0-9]/.test(c))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return letters || "✦";
}

function formatInr(amount: number): string {
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
  } catch {
    return String(amount);
  }
}

export default function CartList() {
  const { items, distinctCount, totalQuantity, grandTotal, removeItem, increment, decrement } = useCart();

  if (items.length === 0) {
    return (
      <section aria-label="Your cart" className="card flex flex-col items-center gap-2 p-10 text-center">
        <span aria-hidden="true" className="text-5xl">🛒</span>
        <h2 className="text-lg font-bold text-navy">Your cart is empty</h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Browse the crackers and add your favourites to get started.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Your cart" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((line) => {
          const lineTotal = line.price * line.quantity;
          const gradient = TILE_GRADIENTS[line.productId % TILE_GRADIENTS.length];
          return (
            <li key={line.productId} className="card flex gap-3 p-3">
              {/* Image-free festive tile. */}
              <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient}`}>
                <span className="select-none text-xl font-extrabold text-white drop-shadow">
                  {initialsFor(line.name)}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold leading-tight text-navy">{line.name}</h3>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      ₹{formatInr(line.price)} / {line.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(line.productId)}
                    aria-label={`Remove ${line.name} from cart`}
                    className="min-h-[44px] min-w-[44px] shrink-0 rounded-pill border border-festive-red/40 px-3 text-xs font-bold uppercase tracking-wide text-festive-red transition-colors hover:bg-festive-red hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-festive-red"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <QuantitySelector
                    quantity={line.quantity}
                    minimumQuantity={line.minimumQuantity}
                    onIncrement={() => increment(line.productId)}
                    onDecrement={() => decrement(line.productId)}
                    ariaLabel={`Quantity for ${line.name}`}
                  />
                  <span className="text-base font-extrabold text-festive-red tabular-nums">
                    ₹{formatInr(lineTotal)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="card flex flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--color-text-muted)" }}>Total Products</span>
          <span className="font-semibold text-navy tabular-nums">{distinctCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--color-text-muted)" }}>Total Quantity</span>
          <span className="font-semibold text-navy tabular-nums">{totalQuantity}</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-navy/10 pt-2">
          <span className="text-base font-bold text-navy">Grand Total</span>
          <span className="text-xl font-extrabold text-festive-red tabular-nums">₹{formatInr(grandTotal)}</span>
        </div>
      </div>
    </section>
  );
}
