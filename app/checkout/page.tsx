"use client";

/**
 * Checkout page (`/checkout`) — Task 18.4.
 *
 * Composes the pre-submit {@link OrderSummary} (Req 7.4) ABOVE the
 * {@link CheckoutForm}, and owns the client submit flow against the server-only
 * `/api/order` route:
 *
 *  - Builds the `OrderRequest` from the live cart (only `productId` + quantity
 *    are sent; the server re-resolves prices/names from `products.json`).
 *  - Generates ONE idempotency key per mounted checkout session (Req 8.11) and
 *    reuses it across retries, so a double-submit of the same order is
 *    idempotent server-side. The key is created lazily via `useState(() => …)`
 *    with a UUID fallback for runtimes lacking `crypto.randomUUID`.
 *  - Disables duplicate submits: the form disables its own button while
 *    submitting (Req 8.8) and `onSubmit` is additionally guarded to no-op when
 *    a submission is already in flight.
 *  - On success navigates to `/confirmation?orderId=…` (that page clears the
 *    cart). On failure re-enables the form (Req 8.8/20.4) and surfaces either
 *    the server's field errors (fed back into the form) or a general inline
 *    error message.
 *
 * If the cart is empty the page redirects to `/cart` (there is nothing to
 * check out).
 *
 * Requirements: 7.4, 8.8, 8.11, 20.3, 20.4.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import OrderSummary from "../../components/OrderSummary";
import CheckoutForm from "../../components/CheckoutForm";
import { useCart } from "../../lib/cart/CartContext";
import type {
  CustomerDetails,
  ValidationError,
  OrderResponse,
} from "../../lib/types";

/**
 * Generate a UUID for the idempotency key. Prefers the native
 * `crypto.randomUUID()`; falls back to a RFC-4122-ish v4 string on older
 * runtimes that don't expose it.
 */
function generateIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback: not cryptographically strong, but unique enough per session.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, distinctCount, totalQuantity, grandTotal } = useCart();

  const isEmpty = distinctCount === 0;

  // One idempotency key per mounted checkout session (Req 8.11). Generated
  // lazily so it's created exactly once and reused across retries.
  const [idempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Submit flow state.
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<ValidationError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Guard against overlapping submits even before the `submitting` state has
  // flushed to a re-render (Req 8.8).
  const submittingRef = useRef(false);

  // Redirect to the cart when there is nothing to check out.
  useEffect(() => {
    if (isEmpty) {
      router.replace("/cart");
    }
  }, [isEmpty, router]);

  async function handleSubmit(customer: CustomerDetails) {
    // No-op if a submission is already in flight (Req 8.8).
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setServerErrors([]);
    setGeneralError(null);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          customer,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const body = (await response.json()) as OrderResponse;

      if (response.ok && body.success && body.orderId) {
        // Success — navigate to confirmation (that page clears the cart).
        router.push(`/confirmation?orderId=${encodeURIComponent(body.orderId)}`);
        // Keep `submitting` true during navigation so the form stays disabled.
        return;
      }

      // Failure — re-enable the form (Req 8.8/20.4) and surface the error(s).
      submittingRef.current = false;
      setSubmitting(false);
      if (body.errors && body.errors.length > 0) {
        setServerErrors(body.errors);
      } else {
        setGeneralError(
          body.message ??
            "We couldn't submit your order. Please try again.",
        );
      }
    } catch {
      // Network/parse failure — re-enable and show a generic error.
      submittingRef.current = false;
      setSubmitting(false);
      setGeneralError(
        "We couldn't reach the server. Please check your connection and try again.",
      );
    }
  }

  // While redirecting an empty cart, render nothing meaningful.
  if (isEmpty) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
        <p className="py-10 text-center text-base text-navy/70">
          Your cart is empty. Redirecting…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">
        Checkout
      </h1>

      {/* Pre-submit order summary ABOVE the form (Req 7.4). */}
      <OrderSummary
        items={items}
        totalProducts={distinctCount}
        totalQuantity={totalQuantity}
        grandTotal={grandTotal}
      />

      {/* General (non-field) error area. */}
      {generalError ? (
        <p
          role="alert"
          className="rounded-card border border-festive-red/40 bg-festive-red/10 px-4 py-3 text-sm font-medium text-festive-red"
        >
          {generalError}
        </p>
      ) : null}

      <CheckoutForm
        submitting={submitting}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
