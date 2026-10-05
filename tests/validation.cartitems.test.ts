// tests/validation.cartitems.test.ts
//
// Property 9: Sub-minimum line items are flagged per line.
// **Validates: Requirements 8.7**
//
// validateCartItems must, for a non-empty cart, produce a per-line error on
// `items[${index}].quantity` for EXACTLY those indices where the line's
// quantity is below its minimumQuantity, and no such error for lines that
// meet or exceed their minimum. An empty cart instead produces a single
// "cart" error (and no per-line errors).

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { validateCartItems } from "../lib/validation";
import type { CartLineItem, ValidationError } from "../lib/types";

/**
 * Arbitrary CartLineItem. minimumQuantity is drawn from 1..5 and quantity
 * from 0..10 so the generator freely straddles the min boundary (some lines
 * below, some at, some above), exercising both the flagged and unflagged
 * branches. The other fields are plausible snapshots and do not affect the
 * min-quantity rule under test.
 */
const cartLineItemArb: fc.Arbitrary<CartLineItem> = fc.record({
  productId: fc.integer({ min: 1, max: 186 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  unit: fc.constantFrom("Packet", "box", "piece", "1 box - 5 pcs"),
  price: fc.integer({ min: 1, max: 5000 }),
  minimumQuantity: fc.integer({ min: 1, max: 5 }),
  quantity: fc.integer({ min: 0, max: 10 }),
});

/** The set of indices for which a per-line quantity error exists. */
function flaggedIndices(errors: ValidationError[]): Set<number> {
  const indices = new Set<number>();
  for (const e of errors) {
    const match = /^items\[(\d+)\]\.quantity$/.exec(e.field);
    if (match) {
      indices.add(Number(match[1]));
    }
  }
  return indices;
}

/** Does the error list contain the empty-cart error on the "cart" field? */
function hasCartError(errors: ValidationError[]): boolean {
  return errors.some((e) => e.field === "cart");
}

describe("Property 9: Sub-minimum line items are flagged per line (Req 8.7)", () => {
  it("flags exactly the indices whose quantity is below minimumQuantity", () => {
    fc.assert(
      fc.property(
        fc.array(cartLineItemArb, { minLength: 1, maxLength: 12 }),
        (items) => {
          const errors = validateCartItems(items);
          const flagged = flaggedIndices(errors);

          const expected = new Set<number>();
          items.forEach((item, index) => {
            if (item.quantity < item.minimumQuantity) {
              expected.add(index);
            }
          });

          // Exactly the sub-minimum indices are flagged — no more, no fewer.
          expect(flagged).toEqual(expected);

          // Non-empty cart: the empty-cart error must never appear.
          expect(hasCartError(errors)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("empty array -> exactly one error on field 'cart'", () => {
    const errors = validateCartItems([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("cart");
  });

  it("all lines satisfying quantity >= minimumQuantity -> no items[...] errors", () => {
    // Generate a line, then force quantity up to at least its minimum.
    const satisfyingItemArb: fc.Arbitrary<CartLineItem> = cartLineItemArb.chain(
      (item) =>
        fc
          .integer({ min: item.minimumQuantity, max: item.minimumQuantity + 10 })
          .map((quantity) => ({ ...item, quantity }))
    );

    fc.assert(
      fc.property(
        fc.array(satisfyingItemArb, { minLength: 1, maxLength: 12 }),
        (items) => {
          const errors = validateCartItems(items);
          expect(flaggedIndices(errors).size).toBe(0);
          expect(hasCartError(errors)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("concrete example: mix of below, at, and above minimum", () => {
    const items: CartLineItem[] = [
      // index 0: below minimum -> flagged
      {
        productId: 1,
        name: "Sparkler 10cm",
        category: "Sparklers",
        unit: "1 box - 5 pcs",
        price: 50,
        minimumQuantity: 3,
        quantity: 1,
      },
      // index 1: exactly at minimum -> not flagged
      {
        productId: 2,
        name: "Flower Pot Small",
        category: "Flower Pots Varieties",
        unit: "box",
        price: 120,
        minimumQuantity: 2,
        quantity: 2,
      },
      // index 2: above minimum -> not flagged
      {
        productId: 3,
        name: "Rocket Red",
        category: "Rocket",
        unit: "Packet",
        price: 200,
        minimumQuantity: 1,
        quantity: 5,
      },
      // index 3: below minimum -> flagged
      {
        productId: 4,
        name: "Sound Bomb",
        category: "Sound Bomb",
        unit: "box",
        price: 300,
        minimumQuantity: 4,
        quantity: 0,
      },
    ];

    const errors = validateCartItems(items);
    expect(flaggedIndices(errors)).toEqual(new Set<number>([0, 3]));
    expect(hasCartError(errors)).toBe(false);

    // The flagged errors carry the expected field names.
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(["items[0].quantity", "items[3].quantity"]);
  });
});
