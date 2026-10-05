// tests/categoryMap.test.ts
//
// Property 1: Every product maps to exactly one chip.
// **Validates: Requirements 2.3**
//
// Totality (both directions):
//   - forward:  every product category in products.json has a mapping and
//               chipForCategory never throws, always returning one of the 7 chips.
//   - backward: every CATEGORY_TO_CHIP key is actually used by at least one
//               product (no dead entries), and there are exactly 27 keys.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import products from "../data/products.json";
import {
  chipForCategory,
  CATEGORY_TO_CHIP,
  CHIP_ORDER,
} from "../data/categoryMap";
import type { ChipLabel } from "../lib/types";

interface ProductRecord {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  minimumQuantity: number;
}

const allProducts = products as ProductRecord[];

// The 7 grouped chips (CHIP_ORDER without the "All" pseudo-chip).
const CHIP_SET: ReadonlySet<ChipLabel> = new Set(
  CHIP_ORDER.filter((c): c is ChipLabel => c !== "All")
);

// Every distinct category string that actually appears in products.json.
const productCategories = Array.from(
  new Set(allProducts.map((p) => p.category))
);

describe("Property 1: Every product maps to exactly one chip (Req 2.3)", () => {
  it("exposes exactly the 7 grouped chips", () => {
    expect(CHIP_SET.size).toBe(7);
    expect([...CHIP_SET].sort()).toEqual(
      ["Fancy", "Flower", "Gift", "Kids", "Rocket", "Sound", "Sparklers"].sort()
    );
  });

  it("maps every product in products.json to one of the 7 chips and never throws", () => {
    expect(allProducts.length).toBeGreaterThan(0);
    for (const product of allProducts) {
      let chip: ChipLabel | undefined;
      expect(() => {
        chip = chipForCategory(product.category);
      }, `product ${product.id} (${product.category}) must map without throwing`).not.toThrow();
      expect(CHIP_SET.has(chip as ChipLabel)).toBe(true);
    }
  });

  it("property: chipForCategory(category) is always a member of the chip set (>=100 runs)", () => {
    // Guard: there must be categories to sample from, else constantFrom throws.
    expect(productCategories.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...productCategories), (category) => {
        const chip = chipForCategory(category);
        return CHIP_SET.has(chip);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Totality of CATEGORY_TO_CHIP (Req 2.3)", () => {
  it("has exactly 27 keys", () => {
    expect(Object.keys(CATEGORY_TO_CHIP)).toHaveLength(27);
  });

  it("maps every mapping value to one of the 7 chips", () => {
    for (const chip of Object.values(CATEGORY_TO_CHIP)) {
      expect(CHIP_SET.has(chip)).toBe(true);
    }
  });

  it("forward totality: every product category has a mapping entry", () => {
    const missing = productCategories.filter(
      (c) => !(c in CATEGORY_TO_CHIP)
    );
    expect(missing).toEqual([]);
  });

  it("backward totality: every mapping key is used by at least one product (no dead entries)", () => {
    const used = new Set(productCategories);
    const dead = Object.keys(CATEGORY_TO_CHIP).filter((k) => !used.has(k));
    expect(dead).toEqual([]);
  });

  it("the set of mapping keys equals the set of product categories exactly", () => {
    expect(new Set(Object.keys(CATEGORY_TO_CHIP))).toEqual(
      new Set(productCategories)
    );
  });
});
