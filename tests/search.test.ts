import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterProducts } from "../lib/search";
import type { Product } from "../lib/types";

/**
 * Property test for catalogue search filtering.
 *
 * Property 2: Search returns exactly the case-insensitive substring matches
 * **Validates: Requirements 2.4, 4.3**
 */

/** The reference predicate the implementation must agree with, per the spec. */
function matches(product: Product, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return (
    product.name.toLowerCase().includes(needle) ||
    product.category.toLowerCase().includes(needle)
  );
}

/**
 * Arbitrary single product. Names/categories draw from a small shared pool of
 * tokens so that random queries have a realistic chance of matching, while
 * still exercising mixed casing and whitespace.
 */
const nameWord = fc.constantFrom(
  "Lakshmi",
  "Deepam",
  "SPARKLER",
  "rocket",
  "Flower Pot",
  "Kuruvi",
  "sound",
  "Chakkar",
  "Gift Box",
  "Nova 7"
);

const categoryWord = fc.constantFrom(
  "Single Sound",
  "Sparklers",
  "Rocket",
  "Flower Pots Varieties",
  "Kids Special",
  "Gift Boxes",
  "Florals Crackers"
);

const productArb: fc.Arbitrary<Product> = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  name: fc
    .array(nameWord, { minLength: 1, maxLength: 3 })
    .map((parts) => parts.join(" ")),
  category: categoryWord,
  price: fc.integer({ min: 1, max: 10_000 }),
  unit: fc.constantFrom("Packet", "box", "piece", "box - 5 pcs"),
  minimumQuantity: fc.integer({ min: 1, max: 10 }),
});

/** Small catalogue so each run stays cheap. */
const catalogueArb: fc.Arbitrary<Product[]> = fc.array(productArb, {
  minLength: 0,
  maxLength: 12,
});

/**
 * Query generator: a mix of pool tokens (likely to match), their lowercase /
 * uppercase variants (exercise case-insensitivity), padded whitespace, the
 * empty string, and arbitrary strings (likely to miss).
 */
const queryArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.constant("   "),
  nameWord,
  nameWord.map((w) => w.toLowerCase()),
  nameWord.map((w) => w.toUpperCase()),
  nameWord.map((w) => `  ${w}  `),
  categoryWord,
  categoryWord.map((w) => w.toLowerCase()),
  fc.string({ maxLength: 8 })
);

describe("filterProducts — Property 2: exact case-insensitive substring matches", () => {
  it("returns exactly the products matching the name/category predicate", () => {
    fc.assert(
      fc.property(catalogueArb, queryArb, (catalogue, query) => {
        const result = filterProducts(catalogue, query);
        const expected = catalogue.filter((p) => matches(p, query));
        // Same references, same order, same length.
        expect(result).toEqual(expected);
      }),
      { numRuns: 200 }
    );
  });

  it("returns the full catalogue unchanged (order & length) for a blank query", () => {
    fc.assert(
      fc.property(
        catalogueArb,
        fc.constantFrom("", "   ", "\t", " \n "),
        (catalogue, blank) => {
          const result = filterProducts(catalogue, blank);
          expect(result).toHaveLength(catalogue.length);
          expect(result).toEqual(catalogue);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("preserves original relative order (result is a subsequence of the catalogue)", () => {
    fc.assert(
      fc.property(catalogueArb, queryArb, (catalogue, query) => {
        const result = filterProducts(catalogue, query);
        // Walk the catalogue; every result element must appear in order.
        let cursor = 0;
        for (const item of result) {
          const found = catalogue.indexOf(item, cursor);
          expect(found).toBeGreaterThanOrEqual(0);
          cursor = found + 1;
        }
      }),
      { numRuns: 200 }
    );
  });

  it("never returns a product that is not in the catalogue", () => {
    fc.assert(
      fc.property(catalogueArb, queryArb, (catalogue, query) => {
        const result = filterProducts(catalogue, query);
        for (const item of result) {
          expect(catalogue.includes(item)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });
});

describe("filterProducts — concrete examples", () => {
  const catalogue: Product[] = [
    {
      id: 1,
      name: "Lakshmi Vedi",
      category: "Single Sound",
      price: 25,
      unit: "Packet",
      minimumQuantity: 1,
    },
    {
      id: 2,
      name: "7 cm Electric Sparkler",
      category: "Sparklers",
      price: 30,
      unit: "box",
      minimumQuantity: 2,
    },
    {
      id: 3,
      name: "Deepam Flower Pot",
      category: "Flower Pots Varieties",
      price: 45,
      unit: "box - 5 pcs",
      minimumQuantity: 1,
    },
    {
      id: 4,
      name: "Nova 7 Shot",
      category: "Multi Sky Shot Varieties",
      price: 120,
      unit: "piece",
      minimumQuantity: 1,
    },
  ];

  it("matches by name, case-insensitively ('lakshmi')", () => {
    const result = filterProducts(catalogue, "lakshmi");
    expect(result).toEqual([catalogue[0]]);
  });

  it("matches by a category substring ('flower')", () => {
    const result = filterProducts(catalogue, "flower");
    // 'Flower Pot' (name) and 'Flower Pots Varieties' (category) both on id 3.
    expect(result).toEqual([catalogue[2]]);
  });

  it("matches by category word 'Sparklers' regardless of case", () => {
    const result = filterProducts(catalogue, "SPARKLERS");
    expect(result).toEqual([catalogue[1]]);
  });

  it("returns no products when nothing matches", () => {
    expect(filterProducts(catalogue, "zzzznomatch")).toEqual([]);
  });

  it("returns the whole catalogue for an empty query", () => {
    expect(filterProducts(catalogue, "")).toEqual(catalogue);
    expect(filterProducts(catalogue, "   ")).toEqual(catalogue);
  });
});
