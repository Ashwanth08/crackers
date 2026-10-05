// tests/cartReducer.minqty.test.ts
//
// Property 4: Line quantity never falls below its minimum.
// **Validates: Requirements 2.13, 3.8, 6.4**
//
// Over an arbitrary sequence of cart actions (ADD / SET_QTY / INCREMENT /
// DECREMENT / REMOVE / CLEAR) folded onto `initialCart`, we assert that:
//   1. After EVERY action (checked at each step), every line item in the
//      resulting cart has quantity >= its minimumQuantity.
//   2. The reducer never mutates the previous state object: the previous
//      cart.items array reference is unchanged after applying a step.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  cartReducer,
  initialCart,
  type CartAction,
} from "../lib/cart/cartReducer";
import type { Product } from "../lib/types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// A small pool of ids so ADD/SET_QTY/INCREMENT/DECREMENT/REMOVE actions
// frequently collide on the same product (exercising the "existing line"
// branches rather than only ever appending fresh lines).
const idArb = fc.integer({ min: 1, max: 5 });

const productArb: fc.Arbitrary<Product> = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  price: fc.integer({ min: 1, max: 1000 }),
  unit: fc.string({ minLength: 1, maxLength: 10 }),
  minimumQuantity: fc.integer({ min: 1, max: 5 }),
});

// One action over the product pool.
const actionArb: fc.Arbitrary<CartAction> = fc.oneof(
  // ADD with an optional explicit quantity (0..20).
  productArb.chain((product) =>
    fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }).map(
      (quantity): CartAction => ({ type: "ADD", product, quantity })
    )
  ),
  // SET_QTY with a possibly sub-minimum / negative quantity (-5..30).
  fc
    .record({ productId: idArb, quantity: fc.integer({ min: -5, max: 30 }) })
    .map((r): CartAction => ({ type: "SET_QTY", ...r })),
  idArb.map((productId): CartAction => ({ type: "INCREMENT", productId })),
  idArb.map((productId): CartAction => ({ type: "DECREMENT", productId })),
  idArb.map((productId): CartAction => ({ type: "REMOVE", productId })),
  fc.constant<CartAction>({ type: "CLEAR" })
);

const actionsArb = fc.array(actionArb, { minLength: 0, maxLength: 40 });

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

describe("Property 4: Line quantity never falls below its minimum (Req 2.13, 3.8, 6.4)", () => {
  it("holds after every action in an arbitrary sequence (>=100 runs)", () => {
    fc.assert(
      fc.property(actionsArb, (actions) => {
        let cart = initialCart;

        for (const action of actions) {
          const prev = cart;
          const prevItemsRef = prev.items;

          const next = cartReducer(prev, action);

          // (2) No mutation of the previous state: its items array reference
          // must be the exact same object after the step.
          expect(prev.items).toBe(prevItemsRef);

          // (1) Invariant: every line is at or above its minimum.
          for (const line of next.items) {
            expect(line.quantity).toBeGreaterThanOrEqual(line.minimumQuantity);
          }

          cart = next;
        }
      }),
      { numRuns: 200 }
    );
  });

  it("holds for a hand-picked sequence that pushes below the minimum", () => {
    const product: Product = {
      id: 1,
      name: "Sparkler",
      category: "Sparklers",
      price: 100,
      unit: "box",
      minimumQuantity: 3,
    };

    const sequence: CartAction[] = [
      { type: "ADD", product }, // defaults to min = 3
      { type: "DECREMENT", productId: 1 }, // clamp at 3
      { type: "DECREMENT", productId: 1 }, // clamp at 3
      { type: "SET_QTY", productId: 1, quantity: 0 }, // clamp at 3
      { type: "SET_QTY", productId: 1, quantity: -10 }, // clamp at 3
      { type: "INCREMENT", productId: 1 }, // 4
    ];

    let cart = initialCart;
    for (const action of sequence) {
      cart = cartReducer(cart, action);
      for (const line of cart.items) {
        expect(line.quantity).toBeGreaterThanOrEqual(line.minimumQuantity);
      }
    }

    expect(cart.items[0]?.quantity).toBe(4);
  });
});
