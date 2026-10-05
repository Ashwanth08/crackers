/**
 * Order ID generation — server-only (Node) module.
 *
 * Issues unique, never-reused Order IDs in the format "SC-2026-NNNNN" where
 * NNNNN is a zero-padded 5-digit sequence number from 00001 to 99999.
 *
 * The default `FileOrderIdStore` persists an integer counter to a server-side
 * file and guards the read-modify-write with an in-process async mutex so that
 * concurrent `next()` calls never return the same number and no number is
 * skipped or reused. When the sequence would exceed 99999 it throws
 * `OrderIdExhaustedError` WITHOUT persisting the overflow, so the last issued
 * number is never lost or duplicated.
 *
 * This module is never imported by client components; it uses node:fs/promises
 * and node:path and must only run on the server.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Lower bound of the issuable sequence (inclusive). */
const MIN_SEQUENCE = 1;
/** Upper bound of the issuable sequence (inclusive) — "99999" (Req 11.1, 11.4). */
const MAX_SEQUENCE = 99999;
/** Number of digits in the zero-padded suffix. */
const SUFFIX_WIDTH = 5;
/** Fixed Order ID prefix. */
const ORDER_ID_PREFIX = "SC-2026-";
/** Matches a well-formed Order ID with a 5-digit suffix. */
const ORDER_ID_PATTERN = /^SC-2026-(\d{5})$/;

/**
 * Allocates monotonically increasing, unique Order IDs.
 * _Requirements: 11.1, 11.2, 11.3, 11.4_
 */
export interface OrderIdStore {
  /** Returns the next formatted Order ID "SC-2026-NNNNN", or throws {@link OrderIdExhaustedError}. */
  next(): Promise<string>;
}

/**
 * Thrown when the Order ID sequence has reached its maximum (99999) and no
 * further IDs can be issued. Maps to the `ID_EXHAUSTED` error code (Req 11.4).
 */
export class OrderIdExhaustedError extends Error {
  constructor(message = "Order ID sequence exhausted (reached 99999).") {
    super(message);
    this.name = "OrderIdExhaustedError";
  }
}

/**
 * Formats a sequence number as an Order ID. Valid for 1..99999 (Req 11.1).
 * @throws RangeError when `n` is not an integer in the issuable range.
 */
export function formatOrderId(n: number): string {
  if (!Number.isInteger(n) || n < MIN_SEQUENCE || n > MAX_SEQUENCE) {
    throw new RangeError(
      `Order ID sequence must be an integer in ${MIN_SEQUENCE}..${MAX_SEQUENCE}, got ${n}.`,
    );
  }
  return `${ORDER_ID_PREFIX}${String(n).padStart(SUFFIX_WIDTH, "0")}`;
}

/**
 * Parses an Order ID back to its sequence number (Req 11.1 round-trip).
 * @throws Error when `id` is not a well-formed Order ID in the issuable range.
 */
export function parseOrderId(id: string): number {
  const match = ORDER_ID_PATTERN.exec(id);
  if (!match) {
    throw new Error(`Malformed Order ID: ${JSON.stringify(id)}.`);
  }
  const n = Number.parseInt(match[1], 10);
  if (n < MIN_SEQUENCE || n > MAX_SEQUENCE) {
    throw new Error(`Order ID sequence out of range: ${JSON.stringify(id)}.`);
  }
  return n;
}

/**
 * A tiny in-process async mutex implemented by chaining promises. Each caller
 * awaits the tail of the chain, then runs its critical section; the next caller
 * only proceeds once the previous one settles. No external dependency.
 */
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  /** Runs `fn` exclusively with respect to other `runExclusive` calls on this mutex. */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn);
    // Keep the chain alive and swallow errors so one failed critical section
    // does not reject the shared tail for subsequent callers.
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

/**
 * File-backed, single-instance {@link OrderIdStore}. Persists an integer counter
 * to a server-side file and serialises concurrent `next()` calls with an async
 * mutex (Req 11.2, 11.3). For multi-instance deployments, swap this for a shared
 * implementation (e.g. Redis `INCR`) behind the same interface.
 */
export class FileOrderIdStore implements OrderIdStore {
  private readonly filePath: string;
  private readonly mutex = new Mutex();

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.join(process.cwd(), "data", ".order-counter");
  }

  async next(): Promise<string> {
    return this.mutex.runExclusive(async () => {
      const current = await this.readCounter();
      const nextValue = current + 1;
      if (nextValue > MAX_SEQUENCE) {
        // Do NOT persist the overflow: the last issued value stays intact so no
        // number is skipped or reused on a subsequent call (Req 11.4).
        throw new OrderIdExhaustedError();
      }
      await this.writeCounter(nextValue);
      return formatOrderId(nextValue);
    });
  }

  /** Reads the current counter, treating a missing/empty/corrupt file as 0. */
  private async readCounter(): Promise<number> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return 0;
      }
      throw err;
    }
    const trimmed = raw.trim();
    if (trimmed === "") {
      return 0;
    }
    const value = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        `Corrupt Order ID counter at ${this.filePath}: ${JSON.stringify(trimmed)}.`,
      );
    }
    return value;
  }

  /**
   * Persists the counter. The read-modify-write is already serialised by the
   * mutex, so there is never a concurrent writer; a direct `writeFile` of the
   * small integer is sufficient and avoids the Windows limitation where
   * renaming over an existing file can fail with EPERM. The payload is a single
   * short token, so a torn write cannot interleave two different values.
   */
  private async writeCounter(value: number): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath, String(value), "utf8");
  }
}
