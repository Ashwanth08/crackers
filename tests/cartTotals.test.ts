import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  distinctCount,
  totalQuantity,
  grandTotal,
  lineTotal,
} from "../lib/cart/cartTotals";
import type { Cart, CartLineItem } from "../lib/types";

/**
 * Property 3: Cart totals are the sum of line values.
 *
 * The derived selectors must always equal the direct sums over the line
 * items, for any cart:
 *   distinctCount(cart) === cart.items.length
 *   totalQuantity(cart) === sum(item.quantity)
 *   grandTotal(cart)    === sum(item.price * item.quantity)
 *   grandTotal(cart)    === sum(lineTotal(item))
 *
 * **Validates: Requirements 5.8, 5.9, 1.3, 20.1**
 */

/** Arbitrary for a single CartLineItem with realistic field constraints. */
const lineItemArb: fc.Arbitrary<CartLineItem> = fc.record({
  productId: fc.integer({ min: 1, max: 1_000_000 }),
  name: fc.string(),
  category: fc.string(),
  unit: fc.string(),
  price: fc.integer({ min: 1, max: 10_000 }),
  minimumQuantity: fc.integer({ min: 1, max: 5 }),
  quantity: fc.integer({ min: 1, max: 50 }),
});

/** Arbitrary for a Cart built from an array of line items. */
const cartArb: fc.Arbitrary<Cart> = fc
  .array(lineItemArb)
  .map((items) => ({ items }));

describe("cart totals (Property 3)", () => {
  it("distinctCount(cart) === cart.items.length", () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        expect(distinctCount(cart)).toBe(cart.items.length);
      }),
      { numRuns: 100 }
    );
  });

  it("totalQuantity(cart) === sum of quantities", () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        const expected = cart.items.reduce((s, i) => s + i.quantity, 0);
        expect(totalQuantity(cart)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("grandTotal(cart) === sum of price * quantity", () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        const expected = cart.items.reduce(
          (s, i) => s + i.price * i.quantity,
          0
        );
        expect(grandTotal(cart)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("grandTotal(cart) === sum of lineTotal(item)", () => {
    fc.assert(
      fc.property(cartArb, (cart) => {
        const expected = cart.items.reduce((s, i) => s + lineTotal(i), 0);
        expect(grandTotal(cart)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("an empty cart yields 0 for all three totals", () => {
    const empty: Cart = { items: [] };
    expect(distinctCount(empty)).toBe(0);
    expect(totalQuantity(empty)).toBe(0);
    expect(grandTotal(empty)).toBe(0);
  });
});
