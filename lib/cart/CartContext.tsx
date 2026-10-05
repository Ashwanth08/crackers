"use client";

/**
 * React Context + useReducer wrapper around the pure {@link cartReducer}.
 *
 * This client module owns the live cart state for the whole app. It wires the
 * pure reducer to React, exposes a convenient {@link useCart} hook with derived
 * selectors and action dispatchers, and persists the cart to `localStorage`.
 *
 * SSR-safety: the reducer always starts from {@link initialCart} on first
 * render (both server and client), so the server-rendered markup matches the
 * client's first render and there is NO hydration mismatch. Only AFTER mount
 * (in a `useEffect`) do we read `localStorage` and replay the stored lines as
 * `ADD` actions, which re-clamps each line to its minimum via the reducer.
 * Persistence is likewise gated behind the mounted/hydrated flag and
 * `typeof window !== "undefined"` so no storage is touched during render.
 *
 * Requirements: 5.1, 5.5, 5.6, 5.7, 6.4, 20.1
 */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Cart, CartLineItem, Product } from "../types";
import { cartReducer, initialCart, type CartAction } from "./cartReducer";
import { distinctCount, grandTotal, totalQuantity } from "./cartTotals";

/** The `localStorage` key under which the cart's line items are persisted. */
const STORAGE_KEY = "sri-crackers-cart";

/**
 * The shape of the value exposed by {@link useCart}: the current cart, its
 * line items, the three derived totals, and the action dispatchers.
 */
export interface CartContextValue {
  /** The current cart state. */
  cart: Cart;
  /** Convenience alias for `cart.items`. */
  items: CartLineItem[];
  /** Number of distinct products (one per line). _Req 1.3, 5.8_ */
  distinctCount: number;
  /** Sum of all line quantities. _Req 5.8_ */
  totalQuantity: number;
  /** Sum of all line totals (₹). _Req 5.9, 20.1_ */
  grandTotal: number;
  /** Add a product; defaults to its minimum quantity when `quantity` is omitted. */
  addItem: (product: Product, quantity?: number) => void;
  /** Remove a product's line entirely. */
  removeItem: (productId: number) => void;
  /** Set a line's quantity (clamped to its minimum by the reducer). */
  setQuantity: (productId: number, quantity: number) => void;
  /** Increase a line's quantity by one. */
  increment: (productId: number) => void;
  /** Decrease a line's quantity by one (never below its minimum). */
  decrement: (productId: number) => void;
  /** Empty the cart. */
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Read and validate the persisted line items from `localStorage`.
 *
 * Returns an array of `{ product, quantity }` replay instructions — never the
 * raw stored objects — so the reducer rebuilds each line and re-clamps the
 * quantity to the product's minimum. Any missing, non-JSON, non-array, or
 * malformed entry is treated as an empty cart (no throw).
 */
function readStoredItems(): Array<{ product: Product; quantity: number }> {
  if (typeof window === "undefined") {
    return [];
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Access can throw (e.g. disabled storage); treat as empty.
    return [];
  }
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const result: Array<{ product: Product; quantity: number }> = [];
    for (const entry of parsed) {
      if (entry === null || typeof entry !== "object") {
        continue;
      }
      const line = entry as Partial<CartLineItem>;
      // Only accept well-typed line snapshots; skip anything tampered/stale.
      if (
        typeof line.productId !== "number" ||
        typeof line.name !== "string" ||
        typeof line.category !== "string" ||
        typeof line.unit !== "string" ||
        typeof line.price !== "number" ||
        typeof line.minimumQuantity !== "number" ||
        typeof line.quantity !== "number" ||
        !Number.isFinite(line.price) ||
        !Number.isFinite(line.minimumQuantity) ||
        !Number.isFinite(line.quantity)
      ) {
        continue;
      }

      // Reconstruct the product snapshot; the reducer's ADD will re-clamp the
      // quantity to max(quantity, minimumQuantity) (Req 6.4).
      const product: Product = {
        id: line.productId,
        name: line.name,
        category: line.category,
        price: line.price,
        unit: line.unit,
        minimumQuantity: line.minimumQuantity,
      };
      result.push({ product, quantity: line.quantity });
    }
    return result;
  } catch {
    // Corrupt JSON — treat as empty (Req: guard against tampered storage).
    return [];
  }
}

/**
 * Provides the cart state to the component tree.
 *
 * On mount, replays persisted lines (re-clamped to their minimums) and then
 * keeps `localStorage` in sync with every state change.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  // Always start from the empty cart so SSR and the first client render agree.
  const [state, dispatch] = useReducer(cartReducer, initialCart);
  const [hydrated, setHydrated] = useState(false);
  // Avoid re-running the one-time rehydration under React StrictMode double-invoke.
  const rehydratedRef = useRef(false);

  // One-time rehydration from localStorage after mount (client only).
  useEffect(() => {
    if (rehydratedRef.current) {
      return;
    }
    rehydratedRef.current = true;

    const stored = readStoredItems();
    for (const { product, quantity } of stored) {
      dispatch({ type: "ADD", product, quantity });
    }
    setHydrated(true);
  }, []);

  // Persist the line items on every change — but only once we've rehydrated,
  // so the initial empty state never clobbers stored data before we load it.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Persistence is best-effort; ignore quota/availability errors.
    }
  }, [state, hydrated]);

  const value: CartContextValue = {
    cart: state,
    items: state.items,
    distinctCount: distinctCount(state),
    totalQuantity: totalQuantity(state),
    grandTotal: grandTotal(state),
    addItem: (product, quantity) =>
      dispatch({ type: "ADD", product, quantity }),
    removeItem: (productId) => dispatch({ type: "REMOVE", productId }),
    setQuantity: (productId, quantity) =>
      dispatch({ type: "SET_QTY", productId, quantity }),
    increment: (productId) => dispatch({ type: "INCREMENT", productId }),
    decrement: (productId) => dispatch({ type: "DECREMENT", productId }),
    clear: () => dispatch({ type: "CLEAR" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Access the cart. Must be called inside a {@link CartProvider}; throws
 * otherwise so misuse surfaces immediately in development.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

// Re-exported for consumers that need the action union type directly.
export type { CartAction };
