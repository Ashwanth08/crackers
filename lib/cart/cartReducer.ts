/**
 * Pure reducer for the cart.
 *
 * This module manages all cart state transitions as a side-effect-free
 * reducer: given the current `Cart` and a `CartAction`, it returns a NEW
 * `Cart` (fresh objects and arrays) without mutating its inputs. Unknown
 * action types return the current state unchanged.
 *
 * Key invariant: after ANY action, every line item's `quantity` is always
 * `>= line.minimumQuantity`. This is enforced on ADD, SET_QTY, and DECREMENT
 * and underpins the min-quantity requirements.
 *
 * The first time a product is added, its quantity defaults to the product's
 * `minimumQuantity` (unless an explicit higher quantity is supplied).
 *
 * Requirements: 2.11, 2.12, 2.13, 3.6, 3.7, 3.8, 5.5, 5.6, 5.7, 6.3, 6.4
 */

import type { Cart, CartLineItem, Product } from "../types";

/**
 * The set of actions understood by {@link cartReducer}.
 * _Requirements: 2.11, 2.12, 2.13, 3.6, 3.7, 3.8, 5.5, 5.6, 5.7_
 */
export type CartAction =
  | { type: "ADD"; product: Product; quantity?: number }
  | { type: "REMOVE"; productId: number }
  | { type: "SET_QTY"; productId: number; quantity: number }
  | { type: "INCREMENT"; productId: number }
  | { type: "DECREMENT"; productId: number }
  | { type: "CLEAR" };

/**
 * The empty starting cart.
 * _Requirements: 5.6_
 */
export const initialCart: Cart = { items: [] };

/**
 * Build a fresh line item from a product, snapshotting the display/email
 * fields and clamping the quantity to at least the product's minimum.
 * _Requirements: 5.4, 6.3, 6.4_
 */
function createLineItem(product: Product, quantity: number): CartLineItem {
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: product.price,
    minimumQuantity: product.minimumQuantity,
    quantity: Math.max(quantity, product.minimumQuantity),
  };
}

/**
 * Pure cart reducer. Returns a new `Cart` for every recognised action and the
 * same `state` for unknown actions. Never mutates its inputs.
 *
 * _Requirements: 2.11, 2.12, 2.13, 3.6, 3.7, 3.8, 5.5, 5.6, 5.7, 6.3, 6.4_
 */
export function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "ADD": {
      const { product } = action;
      // First-add default quantity is the product minimum (Req 2.11, 6.3).
      const addQuantity = action.quantity ?? product.minimumQuantity;
      const existing = state.items.find(
        (item) => item.productId === product.id
      );

      if (existing) {
        // Increase the existing line by the add quantity, clamped to min.
        const items = state.items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.max(
                  item.quantity + addQuantity,
                  item.minimumQuantity
                ),
              }
            : item
        );
        return { ...state, items };
      }

      // Add a brand-new line, snapshotting the product fields.
      return { ...state, items: [...state.items, createLineItem(product, addQuantity)] };
    }

    case "REMOVE": {
      const items = state.items.filter(
        (item) => item.productId !== action.productId
      );
      return { ...state, items };
    }

    case "SET_QTY": {
      // Ignore non-finite requests; keep the current quantity (Req 2.13, 6.4).
      if (!Number.isFinite(action.quantity)) {
        return state;
      }
      const items = state.items.map((item) =>
        item.productId === action.productId
          ? {
              ...item,
              quantity: Math.max(action.quantity, item.minimumQuantity),
            }
          : item
      );
      return { ...state, items };
    }

    case "INCREMENT": {
      const items = state.items.map((item) =>
        item.productId === action.productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      return { ...state, items };
    }

    case "DECREMENT": {
      // Decrease by one but never below the line minimum (Req 3.8, 6.4).
      const items = state.items.map((item) =>
        item.productId === action.productId
          ? {
              ...item,
              quantity: Math.max(item.quantity - 1, item.minimumQuantity),
            }
          : item
      );
      return { ...state, items };
    }

    case "CLEAR":
      return initialCart;

    default:
      // Unknown action types leave the state unchanged.
      return state;
  }
}
