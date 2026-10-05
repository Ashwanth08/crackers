"use client";

/**
 * Confirmation page — `/confirmation`.
 *
 * Shown after a successful order submission. The checkout page (Task 18.4)
 * navigates here with the generated Order_ID in the URL query string, e.g.
 * `/confirmation?orderId=SC-2026-00001`. Because this is a purely client-side
 * app with no server session, the Order_ID is read from the query string via
 * {@link useSearchParams} rather than from server state.
 *
 * Suspense boundary: in the App Router, `useSearchParams()` makes the calling
 * component depend on request-time data, so Next requires it to be wrapped in
 * a <Suspense> boundary (otherwise the production build errors / opts the
 * whole page into client-side rendering). We therefore isolate the
 * `useSearchParams()` call in {@link ConfirmationContent} and wrap it in
 * <Suspense> here with a lightweight fallback.
 *
 * Cart clearing: on mount we call `useCart().clear()` so that returning to the
 * shop after an order starts from an empty cart (Req 10.x follow-through). The
 * checkout flow may also clear the cart, but clearing here is idempotent and
 * guarantees a fresh state when the confirmation screen is reached.
 *
 * "View Order Summary" navigation choice: the cart is cleared post-order and
 * no order summary is persisted client-side, so there is nothing to re-render
 * as a detailed summary. We therefore wire `onViewOrderSummary` to navigate
 * home ("/"), which is the simplest acceptable, functional behaviour per the
 * task. "Continue Shopping" navigates to the catalogue ("/catalogue").
 *
 * Requirements: 10.1, 10.2, 10.5, 10.6
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Confirmation from "../../components/Confirmation";
import { useCart } from "../../lib/cart/CartContext";

/**
 * Inner client content that reads the Order_ID from the URL query string.
 *
 * Kept separate from the default export so the `useSearchParams()` call lives
 * strictly inside the <Suspense> boundary declared by {@link ConfirmationPage}.
 */
function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clear } = useCart();

  // The key piece of state: the generated Order_ID (Req 10.2).
  const orderId = searchParams.get("orderId");

  // Clear the cart once on mount so returning to the shop starts fresh.
  // Idempotent: clearing an already-empty cart is a no-op.
  useEffect(() => {
    clear();
  }, [clear]);

  // Defensive fallback: if someone lands here without an Order_ID (e.g. a
  // direct visit or a stale link), show a gentle message instead of an empty
  // confirmation, and offer a way back to the catalogue (Req 10.5).
  if (!orderId) {
    return (
      <section
        aria-label="Order confirmation"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-gradient-to-b from-navy via-navy to-[#1a1f45] px-6 py-12 text-center"
      >
        <div className="w-full max-w-md rounded-card bg-card px-6 py-10 shadow-card sm:px-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">
            No order to show
          </h1>
          <p className="mt-4 text-base leading-relaxed text-navy/80">
            We couldn&apos;t find an order to confirm. If you&apos;ve just
            placed an order, please check your email; otherwise, browse our
            crackers to start a new order.
          </p>
          <button
            type="button"
            onClick={() => router.push("/catalogue")}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded bg-gold px-6 text-base font-semibold leading-none text-navy transition-colors hover:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            Browse Crackers
          </button>
        </div>
      </section>
    );
  }

  return (
    <Confirmation
      orderId={orderId}
      // Req 10.5 — "Continue Shopping" returns to the catalogue.
      onContinueShopping={() => router.push("/catalogue")}
      // Req 10.6 — no client-side summary persists after the cart is cleared,
      // so route home as the simplest functional behaviour.
      onViewOrderSummary={() => router.push("/")}
    />
  );
}

/** Lightweight fallback rendered while the query string resolves. */
function ConfirmationFallback() {
  return (
    <section
      aria-label="Loading order confirmation"
      className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-navy via-navy to-[#1a1f45] px-6 py-12 text-center"
    >
      <p className="text-base font-medium text-white/80">
        Loading your confirmation…
      </p>
    </section>
  );
}

export default function ConfirmationPage() {
  return (
    <main>
      <Suspense fallback={<ConfirmationFallback />}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}
