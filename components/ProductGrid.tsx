"use client";

/**
 * ProductGrid — the responsive catalogue grid that lays out {@link ProductCard}
 * articles for the current (already filtered) product list.
 *
 * Layout (Req 2.1, 3.1, 13.4): a mobile-first grid that shows 2 columns on
 * phones, 3 on `md`, and 4 on `lg`, with a consistent gap. Each cell is a
 * `<ProductCard product={p} />` keyed by the stable numeric `p.id`.
 *
 * Empty state (Req 2.5, 4.4): when there are no products to show (e.g. a search
 * or chip filter matched nothing), the grid is replaced by a friendly, centred
 * empty-state message (🔍 + `emptyMessage`).
 *
 * Lazy / windowed rendering (Req 19.2): the full catalogue is large (186
 * products), so we keep the initial DOM small by rendering only the first
 * `BATCH_SIZE` cards and revealing more in batches as the user scrolls. An
 * IntersectionObserver watches a sentinel element just below the current window
 * and bumps the visible count whenever it scrolls into view. The observer is
 * created only inside a `useEffect` so it is never touched during SSR, and the
 * visible count resets to the first batch whenever the `products` prop changes
 * (e.g. a new filter is applied).
 *
 * Accessibility: the grid is exposed as a labelled list region; the individual
 * cards remain the `<article>` elements rendered by {@link ProductCard}.
 *
 * Requirements: 2.1, 3.1, 13.4, 19.2, 2.5, 4.4
 */

import { useEffect, useRef, useState } from "react";

import type { Product } from "../lib/types";
import ProductCard from "./ProductCard";

export interface ProductGridProps {
  /** The products to display (already filtered by the owning page). */
  products: Product[];
  /** Message shown in the empty state when `products` is empty. */
  emptyMessage?: string;
}

/** How many cards to render initially and to reveal per scroll batch. */
const BATCH_SIZE = 24;

const DEFAULT_EMPTY_MESSAGE =
  "No crackers found. Try a different search or category.";

export default function ProductGrid({
  products,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: ProductGridProps) {
  // Number of cards currently rendered. Starts at one batch and grows as the
  // sentinel scrolls into view.
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);

  // Sentinel element observed to trigger loading the next batch.
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window to the first batch whenever the product list changes
  // (new search term or category filter). Without this, a filter that returns
  // fewer items could leave a stale, oversized visible count.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [products]);

  const hasMore = visibleCount < products.length;

  // Observe the sentinel and reveal the next batch when it becomes visible.
  // Guarded for SSR (and older browsers) by only running in the effect and
  // checking for IntersectionObserver support.
  useEffect(() => {
    if (!hasMore) return;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: no observer available — reveal everything so no cards are
      // permanently hidden.
      setVisibleCount(products.length);
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) =>
            Math.min(count + BATCH_SIZE, products.length)
          );
        }
      },
      // Start loading a little before the sentinel is fully on screen so the
      // next batch is ready as the user approaches the bottom.
      { rootMargin: "200px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length]);

  // Empty state (Req 2.5, 4.4).
  if (products.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center px-4 py-16 text-center"
      >
        <span aria-hidden="true" className="mb-3 text-4xl">
          🔍
        </span>
        <p className="max-w-xs text-sm font-medium text-navy">{emptyMessage}</p>
      </div>
    );
  }

  const visibleProducts = products.slice(0, visibleCount);

  return (
    <div
      role="list"
      aria-label="Crackers catalogue"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      {visibleProducts.map((product) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}

      {/* Sentinel: when it scrolls into view, the next batch is revealed. It
          spans the full grid width and only exists while more remain. */}
      {hasMore && (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="col-span-full h-1 w-full"
        />
      )}
    </div>
  );
}
