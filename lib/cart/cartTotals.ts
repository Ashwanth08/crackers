/**
 * Pure total selectors for the cart.
 *
 * These functions are side-effect free: they read a `Cart` (or a single
 * `CartLineItem`) and return a derived number without mutating their inputs
 * or touching any external state. Totals are never persisted — they are
 * recomputed from the line items on demand.
 *
 * Derived selectors (per the design Data Models):
 *   distinctCount = items.length                    (Req 1.3, 5.8)
 *   totalQuantity = sum(item.quantity)              (Req 5.8)
 *   grandTotal    = sum(item.price * item.quantity) (Req 5.9)
 *
 * An empty cart yields 0 for every total.
 *
 * Requirements: 5.8, 5.9, 1.3, 20.1
 */

import type { Cart, CartLineItem } from "../types";

/**
 * The line total for a single cart line: unit price × quantity.
 * _Requirements: 5.9_
 */
export function lineTotal(item: CartLineItem): number {
  return item.price * item.quantity;
}

/**
 * The number of distinct products in the cart (one per line item).
 * Returns 0 for an empty cart.
 * _Requirements: 1.3, 5.8_
 */
export function distinctCount(cart: Cart): number {
  return cart.items.length;
}

/**
 * The sum of all line quantities in the cart.
 * Returns 0 for an empty cart.
 * _Requirements: 5.8_
 */
export function totalQuantity(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * The grand total for the cart: the sum of every line total.
 * Returns 0 for an empty cart.
 * _Requirements: 5.9, 20.1_
 */
export function grandTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + lineTotal(item), 0);
}
