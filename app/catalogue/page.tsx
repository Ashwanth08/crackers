"use client";

/**
 * Catalogue page (`/catalogue`) — Task 18.2.
 *
 * Composes the browse experience: a {@link SearchBar} and the horizontally
 * scrollable {@link CategoryChips} sit in a sticky top area, with the filtered
 * {@link ProductGrid} below and the sticky {@link CartBar} pinned to the bottom
 * (the CartBar self-hides when the cart is empty).
 *
 * Product data comes from the static `data/products.json` import (the build-time
 * source of truth, Req 2.1); the UI never hard-codes product values.
 *
 * Filtering (Req 2.4, 2.9, 2.10, 4.2):
 *  - Chip filtering keeps products whose mapped grouped chip equals the selected
 *    chip; "All" keeps everything. Mapping is via {@link chipForCategory}.
 *  - Search then narrows that list via {@link filterProducts} (case-insensitive
 *    name/category substring).
 *  - Both run inside a `useMemo` keyed on `[query, selectedChip]` so filtering
 *    only recomputes when an input actually changes.
 *
 * The {@link ProductGrid} renders its own empty state when nothing matches, so
 * this page doesn't duplicate that handling.
 *
 * Layout: the search + chips area is `sticky top-0` so it stays reachable while
 * scrolling the grid. Bottom padding (`pb-28`) keeps the grid clear of the
 * sticky CartBar and the mobile BottomNav from the root layout. The page is
 * wrapped in a `<main>` landmark with an sr-only `<h1>` for semantics/SEO.
 *
 * Requirements: 2.1, 2.4, 2.9, 2.10, 4.2, 5.1
 */

import { useMemo, useState } from "react";

import productsData from "../../data/products.json";
import { chipForCategory } from "../../data/categoryMap";
import CartBar from "../../components/CartBar";
import CategoryChips from "../../components/CategoryChips";
import ProductGrid from "../../components/ProductGrid";
import SearchBar from "../../components/SearchBar";
import { filterProducts } from "../../lib/search";
import type { Product } from "../../lib/types";

const products = productsData as Product[];

export default function CataloguePage() {
  // Debounced search text (SearchBar debounces before calling onChange).
  const [query, setQuery] = useState<string>("");
  // Active category chip; defaults to "All" (Req 2.8).
  const [selectedChip, setSelectedChip] = useState<string>("All");

  // Apply chip filtering first, then the search substring filter. Memoized so
  // this only recomputes when the query or selected chip changes (Req 2.4, 2.9,
  // 2.10, 4.2).
  const filtered = useMemo<Product[]>(() => {
    const byChip =
      selectedChip === "All"
        ? products
        : products.filter((p) => chipForCategory(p.category) === selectedChip);

    return filterProducts(byChip, query);
  }, [query, selectedChip]);

  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-28 pt-4">
      {/* Semantic/SEO heading; visually hidden to keep the browse UI compact. */}
      <h1 className="sr-only">Browse Crackers</h1>

      {/* Sticky search + category chips so they stay reachable while scrolling. */}
      <div className="sticky top-0 z-30 -mx-3 flex flex-col gap-3 bg-navy/0 px-3 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <SearchBar value={query} onChange={setQuery} />
        <CategoryChips selected={selectedChip} onSelect={setSelectedChip} />
      </div>

      <div className="mt-3">
        <ProductGrid products={filtered} />
      </div>

      {/* Sticky bottom cart summary; self-hides when the cart is empty (Req 5.1). */}
      <CartBar />
    </main>
  );
}
