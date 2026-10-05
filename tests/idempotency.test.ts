// tests/idempotency.test.ts
//
// Property 14: Idempotent replay returns the original result.
// **Validates: Requirements 8.11, 18.5**
//
// For an arbitrary idempotency key and an arbitrary OrderResponse value,
// after set(key, value, DEFAULT_TTL_MS) a get(key) returns a value that is
// deep-equal to the one stored, and get(other-unseen-key) returns undefined.
// A value stored with a very short TTL is no longer retrievable once that TTL
// has elapsed (replay outside the 24h window does not resolve). Storing a
// second key never evicts the first — both remain retrievable within the TTL.
//
// Each test uses its own unique temp file under the OS tmpdir (never the real
// data/.idempotency.json), and all temp files are removed afterwards.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { DEFAULT_TTL_MS, FileIdempotencyStore } from "../lib/idempotency";
import type { OrderErrorCode, OrderResponse } from "../lib/types";

// ---------------------------------------------------------------------------
// Temp-file management
// ---------------------------------------------------------------------------

/** Directories created during the run, torn down in afterAll. */
const tempDirs: string[] = [];

/** Create a fresh, unique backing file path inside a per-call temp dir. */
async function makeTempStoreFile(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sri-idem-"));
  tempDirs.push(dir);
  return path.join(dir, "idempotency.json");
}

/** Stores created during a single test, cleaned up in afterEach. */
let activeFiles: string[] = [];

async function newStore(): Promise<FileIdempotencyStore> {
  const file = await makeTempStoreFile();
  activeFiles.push(file);
  return new FileIdempotencyStore(file);
}

afterEach(async () => {
  for (const file of activeFiles) {
    await rm(file, { force: true });
  }
  activeFiles = [];
});

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty idempotency key (client-generated UUID in production). */
const keyArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 64 });

/** An arbitrary OrderResponse covering both success and failure shapes. */
const orderResponseArb: fc.Arbitrary<OrderResponse> = fc.record(
  {
    success: fc.boolean(),
    orderId: fc.string(),
    grandTotal: fc.integer({ min: 0, max: 1_000_000 }),
    totalProducts: fc.integer({ min: 0, max: 186 }),
    totalQuantity: fc.integer({ min: 0, max: 100_000 }),
    errors: fc.array(
      fc.record({ field: fc.string(), message: fc.string() }),
      { maxLength: 5 },
    ),
    errorCode: fc.constantFrom<OrderErrorCode[]>(
      "VALIDATION",
      "EMPTY_CART",
      "MIN_QUANTITY",
      "ID_EXHAUSTED",
      "EMAIL_FAILED",
      "SERVER_ERROR",
    ),
    message: fc.string(),
  },
  // Every field optional except `success`, so we exercise sparse responses too.
  { requiredKeys: ["success"] },
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 14: Idempotent replay returns the original result (Req 8.11, 18.5)", () => {
  it("set then get returns a deep-equal value; an unseen key returns undefined", async () => {
    await fc.assert(
      fc.asyncProperty(
        keyArb,
        keyArb,
        orderResponseArb,
        async (key, otherKey, value) => {
          fc.pre(otherKey !== key);
          const store = await newStore();

          await store.set(key, value, DEFAULT_TTL_MS);

          const got = await store.get(key);
          expect(got).toEqual(value);

          const missing = await store.get(otherKey);
          expect(missing).toBeUndefined();
        },
      ),
      { numRuns: 40 },
    );
  }, 30000);

  it("an entry stored with a very short TTL is no longer retrievable once it expires", async () => {
    const store = await newStore();
    const value: OrderResponse = {
      success: true,
      orderId: "SC-2026-00001",
      grandTotal: 1234,
      totalProducts: 3,
      totalQuantity: 12,
    };

    await store.set("expiring-key", value, 1);
    await sleep(10);

    expect(await store.get("expiring-key")).toBeUndefined();
  });

  it("setting a second key does not evict the first (both retrievable within TTL)", async () => {
    const store = await newStore();
    const first: OrderResponse = { success: true, orderId: "SC-2026-00001" };
    const second: OrderResponse = { success: true, orderId: "SC-2026-00002" };

    await store.set("key-1", first, DEFAULT_TTL_MS);
    await store.set("key-2", second, DEFAULT_TTL_MS);

    expect(await store.get("key-1")).toEqual(first);
    expect(await store.get("key-2")).toEqual(second);
  });
});
