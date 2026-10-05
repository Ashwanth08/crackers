import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CartProvider, useCart } from "../lib/cart/CartContext";
import ProductCard from "../components/ProductCard";
import ProductGrid from "../components/ProductGrid";
import CategoryChips from "../components/CategoryChips";
import type { Product } from "../lib/types";

/**
 * Component tests for the catalogue components.
 *
 *  - ProductCard adds to the cart at the product's minimum quantity, and the
 *    card switches to its in-cart "REMOVE" state (Req 2.11).
 *  - ProductGrid renders a friendly empty-state message when it has no
 *    products to show (Req 2.5, 4.4).
 *  - CategoryChips renders the 8 chips in the fixed order, defaults the "All"
 *    chip to aria-pressed=true, and reports selections via onSelect (Req 2.6,
 *    2.8).
 *
 * **Validates: Requirements 2.11, 2.5, 2.6, 2.8**
 */

/**
 * A minimal in-memory `Storage`. Under this Node/jsdom combination
 * `window.localStorage` may be left `undefined`, and CartProvider reads it, so
 * we install a deterministic in-memory store on `window` before each test (the
 * same pattern used by tests/CartContext.test.tsx).
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

/** A sample product shaped like Product, with a numeric id and a min qty of 2. */
const sampleProduct: Product = {
  id: 101,
  name: "Mega Sky Shot",
  category: "Multi Sky Shot Varieties",
  price: 250,
  unit: "1 box - 5 pcs",
  minimumQuantity: 2,
};

/**
 * A tiny probe that reads the live cart via useCart and renders the distinct
 * count plus the line quantity for the sample product, so a sibling test can
 * observe the cart state through the DOM while sharing ONE CartProvider.
 */
function CartProbe({ productId }: { productId: number }) {
  const { items, distinctCount } = useCart();
  const line = items.find((it) => it.productId === productId);
  return (
    <div>
      <span data-testid="distinct-count">{distinctCount}</span>
      <span data-testid="line-qty">{line ? line.quantity : "none"}</span>
    </div>
  );
}

beforeEach(() => {
  // Ensure a working localStorage exists on window, then start from empty so
  // the cart does not leak between tests.
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
  window.localStorage.clear();
});

describe("ProductCard add-to-cart (Req 2.11)", () => {
  it("adds the product at its minimum quantity and switches to the in-cart state", async () => {
    render(
      <CartProvider>
        <ProductCard product={sampleProduct} />
        <CartProbe productId={sampleProduct.id} />
      </CartProvider>
    );

    // Let the provider's one-time (empty) rehydration settle first.
    await waitFor(() => {
      expect(screen.getByTestId("distinct-count").textContent).toBe("0");
    });

    // The on-card selector starts at 0, so the add action is disabled until
    // the customer selects a quantity (new 0-default behaviour).
    const addButton = screen.getByRole("button", {
      name: `Add ${sampleProduct.name} to cart`,
    }) as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(true);

    // Press + once (pending qty 1), then the add becomes enabled.
    fireEvent.click(screen.getByLabelText(`Quantity for ${sampleProduct.name}`).querySelector("[aria-label=\"Increase quantity\"]") as HTMLElement);
    expect(addButton.disabled).toBe(false);

    fireEvent.click(addButton);

    // The card switches to its in-cart "Remove" state (Req 2.11 in-cart view).
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: `Remove ${sampleProduct.name} from cart`,
        })
      ).toBeTruthy();
    });

    // The cart line is present; the reducer clamps the selected qty (1) up to
    // the product's minimum quantity (2).
    expect(screen.getByTestId("distinct-count").textContent).toBe("1");
    expect(screen.getByTestId("line-qty").textContent).toBe(
      String(sampleProduct.minimumQuantity)
    );
  });
});

describe("ProductGrid empty state (Req 2.5, 4.4)", () => {
  it("renders an empty-state message when there are no products", () => {
    render(
      <CartProvider>
        <ProductGrid products={[]} />
      </CartProvider>
    );

    // No product cards render for the empty case.
    expect(screen.queryByRole("list")).toBeNull();

    // The friendly empty-state message appears (default: "No crackers found...").
    expect(screen.getByText(/no .*found/i)).toBeTruthy();
  });
});

describe("CategoryChips (Req 2.6, 2.8)", () => {
  const EXPECTED_CHIPS = [
    "All",
    "Sound",
    "Flower",
    "Rocket",
    "Kids",
    "Fancy",
    "Sparklers",
    "Gift",
  ];

  it("renders all 8 chips in the fixed order with 'All' selected by default", () => {
    render(<CategoryChips selected="All" onSelect={vi.fn()} />);

    const group = screen.getByRole("group", {
      name: /filter crackers by category/i,
    });
    const buttons = within(group).getAllByRole("button");

    // Exactly 8 chips, in the fixed order.
    expect(buttons).toHaveLength(EXPECTED_CHIPS.length);
    expect(buttons.map((b) => b.textContent)).toEqual(EXPECTED_CHIPS);

    // "All" is pressed; every other chip is not (Req 2.8).
    buttons.forEach((button) => {
      const expected = button.textContent === "All" ? "true" : "false";
      expect(button.getAttribute("aria-pressed")).toBe(expected);
    });
  });

  it("calls onSelect with the tapped chip label (Req 2.6)", () => {
    const onSelect = vi.fn();
    render(<CategoryChips selected="All" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Sound" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Sound");
  });
});

