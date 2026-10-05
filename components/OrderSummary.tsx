/**
 * OrderSummary — presentational pre-submit summary (Req 7.4). Pure, prop-driven,
 * no hooks. Mobile-first stacked line cards + totals. Props unchanged.
 */

import type { CartLineItem } from "../lib/types";

export interface OrderSummaryProps {
  items: CartLineItem[];
  totalProducts: number;
  totalQuantity: number;
  grandTotal: number;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function OrderSummary({ items, totalProducts, totalQuantity, grandTotal }: OrderSummaryProps) {
  return (
    <section aria-labelledby="order-summary-heading" className="card p-4">
      <h2 id="order-summary-heading" className="mb-3 text-lg font-extrabold text-navy">
        Order Summary
      </h2>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Your order is empty.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {items.map((item) => {
            const amount = item.price * item.quantity;
            return (
              <li key={item.productId} className="rounded-xl border border-navy/10 bg-cream/40 p-3">
                <h3 className="text-sm font-bold leading-tight text-navy">{item.name}</h3>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {item.quantity} × <span className="font-semibold text-festive-red">{formatInr(item.price)}</span>
                  </span>
                  <span className="text-sm font-extrabold text-navy">{formatInr(amount)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="mt-4 space-y-1 border-t border-navy/10 pt-3 text-sm text-navy">
        <div className="flex items-center justify-between">
          <dt style={{ color: "var(--color-text-muted)" }}>Total Products</dt>
          <dd className="font-semibold">{totalProducts}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt style={{ color: "var(--color-text-muted)" }}>Total Quantity</dt>
          <dd className="font-semibold">{totalQuantity}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-gold/60 pt-2">
          <dt className="text-base font-extrabold text-navy">Grand Total</dt>
          <dd className="text-xl font-extrabold text-festive-red">{formatInr(grandTotal)}</dd>
        </div>
      </dl>
    </section>
  );
}
