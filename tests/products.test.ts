import { describe, it, expect } from "vitest";
import products from "../data/products.json";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  minimumQuantity: number;
};

const EXPECTED_COUNT = 186;
const EXPECTED_CATEGORY_COUNT = 27;

describe("data/products.json integrity", () => {
  it("is a JSON array", () => {
    expect(Array.isArray(products)).toBe(true);
  });

  it(`contains exactly ${EXPECTED_COUNT} records`, () => {
    expect(products).toHaveLength(EXPECTED_COUNT);
  });

  it("has every record with all six fields of the correct type", () => {
    const list = products as Product[];
    for (const p of list) {
      // id: number
      expect(typeof p.id, `id of record ${JSON.stringify(p)}`).toBe("number");
      expect(Number.isInteger(p.id)).toBe(true);

      // name: non-empty string
      expect(typeof p.name, `name of id ${p.id}`).toBe("string");
      expect(p.name.trim().length, `name of id ${p.id} non-empty`).toBeGreaterThan(0);

      // category: non-empty string
      expect(typeof p.category, `category of id ${p.id}`).toBe("string");
      expect(p.category.trim().length, `category of id ${p.id} non-empty`).toBeGreaterThan(0);

      // price: positive number
      expect(typeof p.price, `price of id ${p.id}`).toBe("number");
      expect(p.price, `price of id ${p.id} positive`).toBeGreaterThan(0);

      // unit: non-empty string
      expect(typeof p.unit, `unit of id ${p.id}`).toBe("string");
      expect(p.unit.trim().length, `unit of id ${p.id} non-empty`).toBeGreaterThan(0);

      // minimumQuantity: positive number
      expect(typeof p.minimumQuantity, `minimumQuantity of id ${p.id}`).toBe("number");
      expect(p.minimumQuantity, `minimumQuantity of id ${p.id} positive`).toBeGreaterThan(0);
    }
  });

  it("has no field beyond the six expected keys", () => {
    const allowed = new Set(["id", "name", "category", "price", "unit", "minimumQuantity"]);
    for (const p of products as Product[]) {
      const keys = Object.keys(p);
      expect(keys.length, `id ${p.id} key count`).toBe(6);
      for (const k of keys) {
        expect(allowed.has(k), `id ${p.id} unexpected key "${k}"`).toBe(true);
      }
    }
  });

  it("has unique ids that cover 1..186 contiguously", () => {
    const list = products as Product[];
    const ids = list.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size, "all ids unique").toBe(EXPECTED_COUNT);

    const sorted = [...ids].sort((a, b) => a - b);
    for (let i = 0; i < EXPECTED_COUNT; i++) {
      expect(sorted[i], `expected id ${i + 1}`).toBe(i + 1);
    }
  });

  it(`has exactly ${EXPECTED_CATEGORY_COUNT} distinct category values`, () => {
    const categories = new Set((products as Product[]).map((p) => p.category));
    expect(categories.size).toBe(EXPECTED_CATEGORY_COUNT);
  });
});

describe("data/products.json spot checks against known PDF values", () => {
  const byId = new Map((products as Product[]).map((p) => [p.id, p]));

  it("id 1 is the first Single Sound '2 ¾” Kuruvi'", () => {
    const p = byId.get(1)!;
    expect(p.name).toBe("2 ¾” Kuruvi");
    expect(p.category).toBe("Single Sound");
    expect(p.price).toBe(10);
    expect(p.unit).toBe("Packet");
  });

  it("id 7 is the last Single Sound '2 Sound'", () => {
    const p = byId.get(7)!;
    expect(p.name).toBe("2 Sound");
    expect(p.category).toBe("Single Sound");
  });

  it("id 168 '30 cm Electric' has unit 'box - 5 pcs' and price 45", () => {
    const p = byId.get(168)!;
    expect(p.name).toBe("30 cm Electric");
    expect(p.unit).toBe("box - 5 pcs");
    expect(p.price).toBe(45);
  });

  it("id 173 '15 cm Orange (New Arrival Limited)' has unit 'box - 10 pcs'", () => {
    const p = byId.get(173)!;
    expect(p.name).toBe("15 cm Orange (New Arrival Limited)");
    expect(p.unit).toBe("box - 10 pcs");
  });

  it("id 114 'Chotta Fancy (5 Varieities)' has unit 'piece' and price 42", () => {
    const p = byId.get(114)!;
    expect(p.name).toBe("Chotta Fancy (5 Varieities)");
    expect(p.unit).toBe("piece");
    expect(p.price).toBe(42);
  });

  it("id 186 '52 Items' is a Gift Boxes product priced 950", () => {
    const p = byId.get(186)!;
    expect(p.name).toBe("52 Items");
    expect(p.category).toBe("Gift Boxes");
    expect(p.price).toBe(950);
  });
});
