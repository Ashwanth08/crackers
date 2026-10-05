import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildOrderEmailHtml,
  buildOrderEmailText,
  type OrderEmailData,
} from "../lib/email/orderEmailTemplate";
import type { CartLineItem, CustomerDetails } from "../lib/types";

/**
 * Property 13: Email body contains all required order information.
 *
 * For any well-formed order, both the HTML body (buildOrderEmailHtml) and the
 * plain-text body (buildOrderEmailText) must contain the "NEW ORDER RECEIVED"
 * heading, the Order ID, every line item's product name, the order-table
 * column headers (HTML), the totals labels, and the customer notes when
 * present.
 *
 * To keep the substring assertions stable we restrict generated free-text
 * values (names/notes) to letters, digits and spaces so that `escapeHtml`
 * leaves them unchanged. The template's `sanitizeCustomerText` trims
 * surrounding whitespace, so expected values for notes are trimmed to match.
 *
 * The HTML body renders the grand total with Indian thousands separators
 * (toLocaleString("en-IN")), so any numeric-total assertion compares against
 * that formatted form rather than the raw number. The subject line (a
 * separate function) uses the raw number and is not exercised here.
 *
 * **Validates: Requirements 9.7**
 */

/** Non-empty ASCII-alphanumeric-and-space text (escaping-stable, trim-stable interior). */
const safeTextArb = (minLength = 1): fc.Arbitrary<string> =>
  fc
    .stringMatching(/^[A-Za-z0-9 ]+$/)
    .filter((s) => s.trim().length >= minLength);

/** Optional variant that may be undefined. */
const optionalSafeTextArb: fc.Arbitrary<string | undefined> = fc.option(
  safeTextArb(),
  { nil: undefined }
);

/** Arbitrary CustomerDetails: required fields non-empty, optionals may be absent. */
const customerArb: fc.Arbitrary<CustomerDetails> = fc.record({
  fullName: safeTextArb(),
  mobile: safeTextArb(),
  address: safeTextArb(),
  email: optionalSafeTextArb,
  city: optionalSafeTextArb,
  pincode: optionalSafeTextArb,
  notes: optionalSafeTextArb,
});

/** Arbitrary CartLineItem with an escaping-stable name. */
const lineItemArb: fc.Arbitrary<CartLineItem> = fc.record({
  productId: fc.integer({ min: 1, max: 186 }),
  name: safeTextArb(),
  category: safeTextArb(),
  unit: safeTextArb(),
  price: fc.integer({ min: 1, max: 100_000 }),
  minimumQuantity: fc.integer({ min: 1, max: 10 }),
  quantity: fc.integer({ min: 1, max: 500 }),
});

/** Arbitrary OrderEmailData with consistently computed totals. */
const orderEmailDataArb: fc.Arbitrary<OrderEmailData> = fc
  .record({
    serial: fc.integer({ min: 1, max: 99_999 }),
    dateTime: safeTextArb(),
    customer: customerArb,
    items: fc.array(lineItemArb, { minLength: 1, maxLength: 15 }),
  })
  .map(({ serial, dateTime, customer, items }) => {
    const orderId = `SC-2026-${String(serial).padStart(5, "0")}`;
    const totalProducts = items.length;
    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    const grandTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      orderId,
      dateTime,
      customer,
      items,
      totalProducts,
      totalQuantity,
      grandTotal,
    };
  });

describe("order email body completeness (Property 13)", () => {
  it("HTML body contains heading, orderId, item names, table headers, totals labels, and notes", () => {
    fc.assert(
      fc.property(orderEmailDataArb, (data) => {
        const html = buildOrderEmailHtml(data);

        // Heading and identifiers.
        expect(html).toContain("NEW ORDER RECEIVED");
        expect(html).toContain(data.orderId);

        // Every line item's product name (escaping-stable).
        for (const item of data.items) {
          expect(html).toContain(item.name);
        }

        // Order-table column headers.
        expect(html).toContain("S.No");
        expect(html).toContain("Product");
        expect(html).toContain("Qty");
        expect(html).toContain("Unit");
        expect(html).toContain("Rate");
        expect(html).toContain("Amount");

        // Totals labels.
        expect(html).toContain("Total Products");
        expect(html).toContain("Total Quantity");
        expect(html).toContain("Grand Total");

        // Grand total is rendered with Indian thousands separators.
        expect(html).toContain(data.grandTotal.toLocaleString("en-IN"));

        // Customer notes, when present, appear (trimmed to match the template).
        if (data.customer.notes !== undefined) {
          const expectedNotes = data.customer.notes.trim();
          if (expectedNotes.length > 0) {
            expect(html).toContain(expectedNotes);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("text body contains heading, orderId, item names, and totals labels", () => {
    fc.assert(
      fc.property(orderEmailDataArb, (data) => {
        const text = buildOrderEmailText(data);

        expect(text).toContain("NEW ORDER RECEIVED");
        expect(text).toContain(data.orderId);

        for (const item of data.items) {
          expect(text).toContain(item.name);
        }

        expect(text).toContain("Total Products");
        expect(text).toContain("Total Quantity");
        expect(text).toContain("Grand Total");
      }),
      { numRuns: 100 }
    );
  });
});
