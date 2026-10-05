// tests/orderId.exhaustion.test.ts
//
// Unit test for Order ID exhaustion.
// **Validates: Requirements 11.4**
//
// When the persisted counter is at 99999, the next sequence number would be
// 100000, which exceeds the maximum issuable value (99999). FileOrderIdStore
// must throw OrderIdExhaustedError WITHOUT persisting the overflow, so the
// counter file is left untouched at "99999" and no number is skipped, reused,
// or duplicated.
//
// Each test uses a unique temporary counter file under the OS temp directory
// (never the real data/.order-counter file) and cleans it up afterwards.

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { FileOrderIdStore, OrderIdExhaustedError } from "../lib/orderId";

/** Temp directories created during the run, removed in afterEach. */
const tempDirs: string[] = [];

/** Creates a fresh temp directory + counter file path and tracks it for cleanup. */
async function makeTempCounter(seed: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "sc-orderid-"));
  tempDirs.push(dir);
  const filePath = path.join(dir, ".order-counter");
  await writeFile(filePath, seed, "utf8");
  return filePath;
}

afterEach(async () => {
  // Remove every temp directory created during the test (and its counter file).
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("FileOrderIdStore exhaustion (Req 11.4)", () => {
  it("throws OrderIdExhaustedError when the counter is already at 99999", async () => {
    const filePath = await makeTempCounter("99999");
    const store = new FileOrderIdStore(filePath);

    await expect(store.next()).rejects.toThrow(OrderIdExhaustedError);
  });

  it("leaves the counter file at '99999' after the failed call (no overflow persisted)", async () => {
    const filePath = await makeTempCounter("99999");
    const store = new FileOrderIdStore(filePath);

    await expect(store.next()).rejects.toThrow(OrderIdExhaustedError);

    // The last issued value must be intact: no overflow written, no duplicate issued.
    const persisted = (await readFile(filePath, "utf8")).trim();
    expect(persisted).toBe("99999");
  });

  it("issues SC-2026-99999 from 99998, then throws on the subsequent call", async () => {
    const filePath = await makeTempCounter("99998");
    const store = new FileOrderIdStore(filePath);

    // The final issuable ID.
    await expect(store.next()).resolves.toBe("SC-2026-99999");

    // Counter advanced to the maximum.
    expect((await readFile(filePath, "utf8")).trim()).toBe("99999");

    // Any further allocation is exhausted.
    await expect(store.next()).rejects.toThrow(OrderIdExhaustedError);

    // And the overflow was not persisted.
    expect((await readFile(filePath, "utf8")).trim()).toBe("99999");
  });
});
