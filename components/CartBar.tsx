"use client";

/**
 * CartBar — a sleek floating glass pill pinned near the bottom of the viewport.
 * Shows item count, grand total, and a VIEW action linking to /cart. Hidden
 * when the cart is empty. The total pulses on change (framer-motion), disabled
 * under prefers-reduced-motion. Props/behaviour unchanged.
 *
 * Requirements: 5.1, 5.2, 5.3, 14.4, 20.1
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { useCart } from "../lib/cart/CartContext";

export default function CartBar() {
  const { distinctCount, totalQuantity, grandTotal } = useCart();
  const prefersReducedMotion = useReducedMotion();

  if (distinctCount <= 0) return null;

  const formattedTotal = grandTotal.toLocaleString("en-IN");

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:bottom-5">
      <Link
        href="/cart"
        aria-label={`View cart, ${totalQuantity} items, total ₹${formattedTotal}`}
        className="glass mx-auto flex min-h-[56px] w-full max-w-md items-center justify-between gap-3 rounded-pill px-5 py-2 text-white shadow-card-hover transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
      >
        <span className="flex items-center gap-2 text-sm font-semibold leading-none">
          <span aria-hidden="true" className="text-lg">🛒</span>
          <span>{totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}</span>
        </span>

        {prefersReducedMotion ? (
          <span className="text-lg font-extrabold leading-none text-gold">₹{formattedTotal}</span>
        ) : (
          <motion.span
            key={grandTotal}
            initial={{ scale: 1.18, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-lg font-extrabold leading-none text-gold"
          >
            ₹{formattedTotal}
          </motion.span>
        )}

        <span className="btn-festive inline-flex min-h-[40px] items-center justify-center gap-1 rounded-pill px-5 text-sm font-bold leading-none">
          VIEW <span aria-hidden="true">→</span>
        </span>
      </Link>
    </div>
  );
}
