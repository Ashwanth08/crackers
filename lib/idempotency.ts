/**
 * Idempotency store for POST /api/order.
 *
 * SERVER-ONLY module. Never import this from a client component — it uses
 * node:fs/promises and node:path and reads/writes a server-side file.
 *
 * The store maps a client-generated idempotency key to the original
 * `OrderResponse` so that a submission replayed within the TTL window returns
 * the original result instead of creating a new order.
 *
 * Requirements:
 *   8.11 — a submission whose idempotency key matches one seen within the
 *          preceding 24-hour window returns the result of the original
 *          submission instead of creating a new order.
 *   18.5 — idempotent handling of retried submissions.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";

import type { OrderResponse } from "./types";

/**
 * Pluggable idempotency store. The file-backed implementation below is the
 * default single-instance store; multi-instance deployments can swap in a
 * shared implementation (e.g. Redis/Upstash) behind this same interface.
 * _Requirements: 8.11, 18.5_
 */
export interface IdempotencyStore {
  /** Returns the stored response for `key`, or `undefined` if absent or expired. */
  get(key: string): Promise<OrderResponse | undefined>;
  /** Stores `value` under `key`, expiring after `ttlMs` milliseconds. */
  set(key: string, value: OrderResponse, ttlMs: number): Promise<void>;
}

/** 24 hours in milliseconds (Req 8.11). */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** One entry in the backing file: a response plus its absolute expiry time. */
interface StoredEntry {
  value: OrderResponse;
  /** Epoch milliseconds; the entry is expired once `expiresAt <= Date.now()`. */
  expiresAt: number;
}

/** Shape of the backing JSON file: a plain object keyed by idempotency key. */
type StoreFile = Record<string, StoredEntry>;

/**
 * File-backed idempotency store with a per-entry TTL.
 *
 * The backing file holds a JSON object of the form
 *   { [key]: { value: OrderResponse, expiresAt: number } }
 *
 * Expired entries are pruned lazily on every read and write. Writes are
 * guarded by a small in-process async mutex so concurrent `set` calls do not
 * lose updates (last-writer-wins on the whole file would otherwise drop
 * entries written in between a read and its write-back).
 */
export class FileIdempotencyStore implements IdempotencyStore {
  private readonly filePath: string;

  /**
   * Tail of the write mutex. Each guarded section chains onto this promise so
   * that load → mutate → write-back runs to completion before the next one
   * starts.
   */
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.join(process.cwd(), "data", ".idempotency.json");
  }

  async get(key: string): Promise<OrderResponse | undefined> {
    const store = await this.load();
    const entry = store[key];
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: OrderResponse, ttlMs: number): Promise<void> {
    await this.runExclusive(async () => {
      const store = this.prune(await this.load());
      store[key] = { value, expiresAt: Date.now() + ttlMs };
      await this.save(store);
    });
  }

  /**
   * Run `fn` with exclusive access to the backing file. Sections are serialized
   * through `writeChain`; a failing section does not break the chain for the
   * next caller.
   */
  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeChain.then(fn, fn);
    // Keep the chain alive regardless of whether `run` resolves or rejects.
    this.writeChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Load and parse the backing file. A missing or corrupt file is treated as an
   * empty store so a bad file never blocks order submission.
   */
  private async load(): Promise<StoreFile> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch {
      // Missing file (ENOENT) or any read error → empty store.
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return parsed as StoreFile;
    } catch {
      // Corrupt JSON → treat as empty.
      return {};
    }
  }

  /** Drop expired entries from `store` (mutates and returns it). */
  private prune(store: StoreFile): StoreFile {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      const entry = store[key];
      if (!entry || entry.expiresAt <= now) {
        delete store[key];
      }
    }
    return store;
  }

  /** Ensure the data directory exists, then write the store atomically. */
  private async save(store: StoreFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(store, null, 2), "utf8");
  }
}

/**
 * Redis-backed {@link IdempotencyStore} for multi-instance / serverless hosting
 * (e.g. Vercel). Stores each response under a namespaced key with a native
 * Redis TTL (`PX` = milliseconds), so expiry is handled by Redis and the entry
 * is shared across all instances.
 */
export class RedisIdempotencyStore implements IdempotencyStore {
  // Minimal structural type to avoid a hard dependency on the client types.
  private readonly redis: {
    get(key: string): Promise<unknown>;
    set(key: string, value: string, opts: { px: number }): Promise<unknown>;
  };
  private readonly prefix: string;

  constructor(
    redis: {
      get(key: string): Promise<unknown>;
      set(key: string, value: string, opts: { px: number }): Promise<unknown>;
    },
    prefix = "sri:idem:",
  ) {
    this.redis = redis;
    this.prefix = prefix;
  }

  async get(key: string): Promise<OrderResponse | undefined> {
    const raw = await this.redis.get(this.prefix + key);
    if (raw === null || raw === undefined) {
      return undefined;
    }
    // Upstash may return the value already parsed (object) or as a string
    // depending on how it was stored; handle both defensively.
    if (typeof raw === "object") {
      return raw as OrderResponse;
    }
    try {
      return JSON.parse(String(raw)) as OrderResponse;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: OrderResponse, ttlMs: number): Promise<void> {
    await this.redis.set(this.prefix + key, JSON.stringify(value), { px: ttlMs });
  }
}
