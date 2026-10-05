import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "../lib/cart/CartContext";
import type { CartLineItem, Product } from "../lib/types";

/**
 * Unit tests for CartContext localStorage persistence.
 *
 * Covers rehydration from localStorage on mount, persistence on every change,
 * re-clamping of sub-minimum rehydrated lines to their minimum, and graceful
 * handling of corrupt storage (treated as an empty cart, no throw).
 *
 * **Validates: Requirements 5.1, 6.4**
 */

const STORAGE_KEY = "sri-crackers-cart";

/**
 * A minimal in-memory `Storage` implementation.
 *
 * Depending on the Node/jsdom version, `window.localStorage` may be filtered
 * out and left `undefined` under the jsdom test environment. The CartContext
 * reads `window.localStorage`, so we install a deterministic in-memory store
 * on `window` before each test. This keeps the persistence code under test on
 * its real code path while making the fixture setup reliable across versions.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

/** The provider wrapper used by every renderHook call in this suite. */
const wrapper = CartProvider;

/** A valid product used for the persistence-on-change test. */
const sampleProduct: Product = {
  id: 42,
  name: "Mega Sky Shot",
  category: "Multi Sky Shot Varieties",
  price: 250,
  unit: "1 box - 5 pcs",
  minimumQuantity: 2,
};

/** Build a well-typed stored line snapshot (shape persisted to localStorage). */
function storedLine(overrides: Partial<CartLineItem> = {}): CartLineItem {
  return {
    productId: 7,
    name: "Colour Flower Pot",
    category: "Flower Pots Varieties",
    unit: "1 box",
    price: 120,
    minimumQuantity: 3,
    quantity: 5,
    ...overrides,
  };
}

describe("CartContext persistence (Req 5.1, 6.4)", () => {
  beforeEach(() => {
    // Ensure a working localStorage exists on window, then start from empty.
    Object.defineProperty(window, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    window.localStorage.clear();
  });

  it("rehydrates the cart from localStorage on mount", async () => {
    const line = storedLine({ quantity: 5 });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([line]));

    const { result } = renderHook(() => useCart(), { wrapper });

    // The mount useEffect replays stored lines asynchronously; wait for it.
    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    const item = result.current.items[0];
    expect(item.productId).toBe(line.productId);
    expect(item.name).toBe(line.name);
    expect(item.quantity).toBe(5);

    // Totals reflect the rehydrated line (Req 5.1).
    expect(result.current.distinctCount).toBe(1);
    expect(result.current.totalQuantity).toBe(5);
    expect(result.current.grandTotal).toBe(line.price * 5);
  });

  it("persists the cart to localStorage when an item is added", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Let the initial (empty) rehydration complete before mutating.
    await waitFor(() => {
      expect(result.current.items).toHaveLength(0);
    });

    act(() => {
      result.current.addItem(sampleProduct);
    });

    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string) as CartLineItem[];
      expect(Array.isArray(parsed)).toBe(true);
      const stored = parsed.find((l) => l.productId === sampleProduct.id);
      expect(stored).toBeDefined();
      // First add defaults to the product minimum quantity (Req 6.3).
      expect(stored?.quantity).toBe(sampleProduct.minimumQuantity);
    });
  });

  it("re-clamps a sub-minimum rehydrated line up to its minimum (Req 6.4)", async () => {
    // Stored quantity (0) is below the stored minimum (3).
    const line = storedLine({ quantity: 0, minimumQuantity: 3 });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([line]));

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // The reducer's ADD clamps to max(quantity, minimumQuantity) = 3.
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("treats corrupt storage as an empty cart without throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not json {");

    const { result } = renderHook(() => useCart(), { wrapper });

    // Give the mount effect a chance to run, then assert the cart stays empty.
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.distinctCount).toBe(0);
    expect(result.current.grandTotal).toBe(0);
  });
});
