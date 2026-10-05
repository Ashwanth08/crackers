/**
 * Catalogue search filtering.
 *
 * Pure, dependency-free module backing the Search_Component. Filtering matches
 * the entered query against a product's `name` OR `category` as a
 * case-insensitive substring (via `toLowerCase().includes()`), and an empty
 * query returns the catalogue unchanged in its original order.
 *
 * Requirements: 2.4, 4.3.
 */

import type { Product } from "./types";

/**
 * Return the products whose `name` or `category` contains `query` as a
 * case-insensitive substring. A blank query (empty or whitespace-only) returns
 * the catalogue unchanged, preserving the original order.
 *
 * This is a pure function: it never mutates `catalogue` and returns a new
 * array of references to the matching products.
 *
 * @param catalogue The full list of products to filter.
 * @param query     The raw search text entered by the customer.
 * @returns The matching products, in their original relative order.
 */
export function filterProducts(catalogue: Product[], query: string): Product[] {
  const trimmed = query.trim();

  // Empty query -> catalogue unchanged (same order).
  if (trimmed === "") {
    return catalogue.slice();
  }

  const needle = trimmed.toLowerCase();

  return catalogue.filter(
    (product) =>
      product.name.toLowerCase().includes(needle) ||
      product.category.toLowerCase().includes(needle)
  );
}
