// tests/cartReducer.firstadd.test.ts
//
// Property 5: First add defaults to the minimum quantity.
// **Validates: Requirements 2.11, 6.3**
//
// When a Product is first added to the Cart via an ADD action with NO explicit
// quantity, the resulting Line_Item quantity equals the Product's
// minimumQuantity (Req 6.3, and Req 2.11's "defaulting to the minimum when the
// customer has not changed it").
//
// Companion clamping checks (same first-add path):
//   - ADD with an explicit quantity BELOW the minimum is clamped UP to the
//     minimum.
//   - ADD with an explicit quantity ABOVE the minimum keeps that quantity.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { cartReducer, initialCart } from "../lib/cart/cartReducer";
import type { Product } from "../lib/types";

/**
 * An arbitrary Product with a minimumQuantity in [1, 5]. The other fields are
 * irrelevant to this property but must be well-formed per the Product type.
 */
const productArb: fc.Arbitrary<Product> = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  name: fc.string(),
  category: fc.string(),
  price: fc.double({ min: 0.01, max: 10_000, noNaN: true }),
  unit: fc.string(),
  minimumQuantity: fc.integer({ min: 1, max: 5 }),
});

describe("Property 5: First add defaults to the minimum quantity (Req 2.11, 6.3)", () => {
  it("ADD with no explicit quantity yields one line at the product minimum (>=100 runs)", () => {
    fc.assert(
      fc.property(productArb, (product) => {
        const next = cartReducer(initialCart, { type: "ADD", product });

        expect(next.items).toHaveLength(1);
        const line = next.items[0];
        expect(line.productId).toBe(product.id);
        expect(line.quantity).toBe(product.minimumQuantity);

        // initialCart must not be mutated.
        expect(initialCart.items).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it("ADD with an explicit quantity BELOW the minimum clamps up to the minimum (>=100 runs)", () => {
    fc.assert(
      fc.property(
        productArb,
        // A below-minimum request: anything from 0 down (and strictly < min).
        fc.integer({ min: -10, max: 5 }),
        (product, requested) => {
          // Constrain to a value strictly below the product's minimum.
          const belowMin = Math.min(requested, product.minimumQuantity - 1);

          const next = cartReducer(initialCart, {
            type: "ADD",
            product,
            quantity: belowMin,
          });

          expect(next.items).toHaveLength(1);
          expect(next.items[0].quantity).toBe(product.minimumQuantity);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ADD with an explicit quantity ABOVE the minimum keeps that quantity (>=100 runs)", () => {
    fc.assert(
      fc.property(
        productArb,
        fc.integer({ min: 1, max: 500 }),
        (product, extra) => {
          const requested = product.minimumQuantity + extra;

          const next = cartReducer(initialCart, {
            type: "ADD",
            product,
            quantity: requested,
          });

          expect(next.items).toHaveLength(1);
          expect(next.items[0].quantity).toBe(requested);
        }
      ),
      { numRuns: 100 }
    );
  });
});
