"use client";

/**
 * Checkout page (`/checkout`) - Task 18.4 (+ minimum order value).
 *
 * Composes the pre-submit OrderSummary above the CheckoutForm and owns the
 * client submit flow against the server-only `/api/order` route.
 *
 * Minimum order value: orders below the configured minimum (see
 * `MINIMUM_ORDER_VALUE`) are blocked on the client - a notice is shown and the
 * submit is guarded so the request never leaves the browser. The server also
 * re-checks this authoritatively.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import OrderSummary from "../../components/OrderSummary";
import CheckoutForm from "../../components/CheckoutForm";
import { useCart } from "../../lib/cart/CartContext";
import {
  isBelowMinimumOrderValue,
  minimumOrderValueMessage,
} from "../../lib/validation";
import type {
  CustomerDetails,
  ValidationError,
  OrderResponse,
} from "../../lib/types";

/**
 * Generate a UUID for the idempotency key. Prefers crypto.randomUUID; falls
 * back to a v4-ish string on older runtimes.
 */
function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
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
  const belowMinimum = isBelowMinimumOrderValue(grandTotal);

  const [idempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<ValidationError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (isEmpty) {
      router.replace("/cart");
    }
  }, [isEmpty, router]);

  async function handleSubmit(customer: CustomerDetails) {
    if (submittingRef.current) {
      return;
    }

    // Guard: do not even attempt the request below the minimum order value.
    if (isBelowMinimumOrderValue(grandTotal)) {
      setGeneralError(minimumOrderValueMessage(grandTotal));
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
        router.push(`/confirmation?orderId=${encodeURIComponent(body.orderId)}`);
        return;
      }

      submittingRef.current = false;
      setSubmitting(false);
      if (body.errors && body.errors.length > 0) {
        setServerErrors(body.errors);
      } else {
        setGeneralError(
          body.message ?? "We couldn't submit your order. Please try again.",
        );
      }
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setGeneralError(
        "We couldn't reach the server. Please check your connection and try again.",
      );
    }
  }

  if (isEmpty) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
        <p className="py-10 text-center text-base text-navy/70">
          Your cart is empty. Redirecting...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">
        Checkout
      </h1>

      <OrderSummary
        items={items}
        totalProducts={distinctCount}
        totalQuantity={totalQuantity}
        grandTotal={grandTotal}
      />

      {/* Minimum order value notice (blocks checkout below the threshold). */}
      {belowMinimum ? (
        <div
          role="alert"
          className="rounded-card border border-gold bg-gold/10 px-4 py-3 text-sm font-semibold text-navy"
        >
          {minimumOrderValueMessage(grandTotal)}
        </div>
      ) : null}

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
        disabled={belowMinimum}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

