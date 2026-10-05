"use client";

/**
 * ProductCard — a modern, image-free catalogue card sized for the 2-column
 * mobile grid. Instead of a photo it uses a clean festive "cracker tile"
 * treatment: a soft gradient header with a firework glyph, a category pill,
 * and the product initials — consistent, fast, and never misleading.
 *
 * Quantity behaviour (per request): the on-card selector STARTS AT 0. The
 * customer must press + at least once; "Add to Cart" is ignored while the
 * pending quantity is 0, so nothing with qty 0 ever enters the cart. Once the
 * product is in the cart, the selector drives the cart line and is clamped at
 * the product's minimum quantity (reducer rule).
 *
 * Requirements: 2.2, 3.2, 3.4, 3.5, 2.11, 15.1, 15.2
 */

import { useState } from "react";

import type { Product } from "../lib/types";
import { useCart } from "../lib/cart/CartContext";
import QuantitySelector from "./QuantitySelector";
import { chipForCategory } from "../data/categoryMap";

export interface ProductCardProps {
  product: Product;
}

/** A small set of accent gradients cycled by product id for visual variety. */
const TILE_GRADIENTS = [
  "from-[#ff8a3d] via-[#f5c518] to-[#e11d48]",
  "from-[#7c3aed] via-[#e11d48] to-[#f5c518]",
  "from-[#0ea5e9] via-[#6366f1] to-[#e11d48]",
  "from-[#f5c518] via-[#ff8a3d] to-[#9f1239]",
  "from-[#10b981] via-[#0ea5e9] to-[#6366f1]",
] as const;

/** Up to two uppercase initials from the product name (festive glyph fallback). */
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

export default function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, removeItem, increment, decrement } = useCart();

  const line = items.find((it) => it.productId === product.id);
  const inCart = line !== undefined;

  // On-card pending quantity starts at 0 (per request). Only matters pre-cart.
  const [pendingQty, setPendingQty] = useState<number>(0);
  const displayQty = inCart ? line!.quantity : pendingQty;

  let chipLabel: string | null = null;
  try {
    chipLabel = chipForCategory(product.category);
  } catch {
    chipLabel = null;
  }

  const gradient = TILE_GRADIENTS[product.id % TILE_GRADIENTS.length];

  const handleIncrement = () => {
    if (inCart) increment(product.id);
    else setPendingQty((q) => q + 1);
  };

  const handleDecrement = () => {
    if (inCart) decrement(product.id); // reducer clamps at minimum
    else setPendingQty((q) => Math.max(0, q - 1)); // card can go to 0
  };

  // Ignore the add while nothing is selected (qty 0). Adds the chosen quantity,
  // which the cart reducer clamps up to the product minimum if needed.
  const handleAdd = () => {
    if (pendingQty <= 0) return;
    addItem(product, pendingQty);
    setPendingQty(0);
  };

  const handleRemove = () => removeItem(product.id);

  return (
    <article className="card card-hover flex flex-col animate-fade-up">
      {/* Image-free festive tile. */}
      <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
        {/* Decorative sparkle burst. */}
        <span aria-hidden="true" className="absolute -right-3 -top-3 text-5xl opacity-30 blur-[1px]">✦</span>
        <span aria-hidden="true" className="absolute bottom-1 left-2 text-2xl opacity-40">🎆</span>
        <span className="select-none text-3xl font-extrabold tracking-wide text-white drop-shadow">
          {initialsFor(product.name)}
        </span>
        {chipLabel && (
          <span className="absolute left-2 top-2 inline-flex items-center rounded-pill bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {chipLabel}
          </span>
        )}
        {inCart && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-pill bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-festive-red shadow">
            In cart
          </span>
        )}
      </div>

      {/* Content. */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-navy">
          {product.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-lg font-extrabold text-festive-red">₹{product.price}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            / {product.unit}
          </span>
        </div>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Min: {product.minimumQuantity}
        </p>

        <div className="mt-3">
          <QuantitySelector
            quantity={displayQty}
            minimumQuantity={inCart ? product.minimumQuantity : 0}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            ariaLabel={`Quantity for ${product.name}`}
          />
        </div>

        {inCart ? (
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${product.name} from cart`}
            className="mt-3 min-h-[44px] w-full rounded-card border-2 border-festive-red bg-white px-3 text-sm font-bold uppercase tracking-wide text-festive-red transition-colors hover:bg-festive-red hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-festive-red focus-visible:ring-offset-1"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={pendingQty <= 0}
            aria-label={`Add ${product.name} to cart`}
            className="btn-festive mt-3 min-h-[44px] w-full rounded-card px-3 text-sm font-bold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  );
}
