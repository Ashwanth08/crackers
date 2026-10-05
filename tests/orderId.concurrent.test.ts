// tests/orderId.concurrent.test.ts
//
// Property 12: Order IDs are unique across concurrent allocation.
// **Validates: Requirements 11.2, 11.3**
//
// FileOrderIdStore serialises its read-modify-write counter behind an async
// mutex, so firing many next() calls concurrently via Promise.all must still
// yield IDs that are:
//   - all distinct (no reuse, Req 11.2),
//   - all well-formed /^SC-2026-\d{5}$/ (Req 11.1),
//   - a contiguous sequence 1..N with no gaps and no skips (Req 11.3).
//
// Each test points the store at a fresh, unique temp counter file (never the
// real data/.order-counter) and removes it afterwards.

import { describe, it, expect, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { FileOrderIdStore, parseOrderId } from "../lib/orderId";

/** The canonical well-formed Order ID shape. */
const ORDER_ID_RE = /^SC-2026-\d{5}$/;

/** Temp directories created during the run, cleaned up afterwards. */
const createdDirs: string[] = [];

/** Creates a fresh, unique temp counter-file path (and tracks its dir). */
async function freshCounterPath(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "sc-order-counter-"));
  createdDirs.push(dir);
  return path.join(dir, ".order-counter");
}

/**
 * Fires `n` concurrent next() calls against a fresh store and asserts the
 * uniqueness / well-formedness / contiguity invariants.
 */
async function assertConcurrentUniqueness(n: number): Promise<void> {
  const counterPath = await freshCounterPath();
  const store = new FileOrderIdStore(counterPath);

  const ids = await Promise.all(
    Array.from({ length: n }, () => store.next())
  );

  // Every ID is well-formed (Req 11.1).
  for (const id of ids) {
    expect(id).toMatch(ORDER_ID_RE);
  }

  // All IDs are distinct — no reuse under concurrency (Req 11.2).
  expect(new Set(ids).size).toBe(n);

  // The parsed sequence numbers are exactly {1..N}: contiguous, no gaps,
  // no skips, no reuse (Req 11.3).
  const sequences = ids.map(parseOrderId).sort((a, b) => a - b);
  const expected = Array.from({ length: n }, (_, i) => i + 1);
  expect(sequences).toEqual(expected);
}

afterEach(async () => {
  // Remove every temp counter directory created during the test.
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("Property 12: Order IDs are unique across concurrent allocation (Req 11.2, 11.3)", () => {
  it("200 concurrent next() calls yield distinct, well-formed, contiguous IDs", async () => {
    await assertConcurrentUniqueness(200);
  });

  it("holds across several concurrency levels (50, 200)", async () => {
    for (const n of [50, 200]) {
      await assertConcurrentUniqueness(n);
    }
  });
});
