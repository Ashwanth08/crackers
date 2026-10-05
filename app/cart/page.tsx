"use client";

/**
 * Cart page (`/cart`) — Task 18.3.
 *
 * Composes the {@link CartList} line-item list + totals footer with a
 * "Proceed to Checkout" action. CartList already renders its own empty state
 * when there are no line items, so this page only adds the proceed action.
 *
 * The proceed action is hidden when the cart is empty (`distinctCount === 0`)
 * — there is nothing to check out — and uses a `next/link` to `/checkout`.
 * The link is styled as a festive gold-on-navy CTA with a >=44px touch target.
 *
 * Bottom padding (`pb-24`) keeps the content clear of the mobile BottomNav
 * rendered by the root layout.
 *
 * Requirements: 5.4, 5.8, 20.2
 */

import Link from "next/link";

import CartList from "../../components/CartList";
import { useCart } from "../../lib/cart/CartContext";

export default function CartPage() {
  const { distinctCount } = useCart();
  const isEmpty = distinctCount === 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">
        Your Cart
      </h1>

      <CartList />

      {/* Proceed to Checkout — hidden when the cart is empty (nothing to buy). */}
      {!isEmpty && (
        <Link
          href="/checkout"
          className="inline-flex min-h-[44px] items-center justify-center rounded-card bg-gold px-6 text-base font-bold text-navy shadow-sm transition-colors hover:bg-gold-light active:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          Proceed to Checkout
        </Link>
      )}
    </main>
  );
}
