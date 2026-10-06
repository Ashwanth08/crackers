/**
 * Store factory — SERVER-ONLY.
 *
 * Chooses the backing stores for the order pipeline based on the environment:
 *
 *  - When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
 *    (e.g. on Vercel), use the Redis-backed stores. These work on read-only
 *    serverless filesystems and are shared across every instance.
 *  - Otherwise fall back to the file-backed stores, which are convenient for
 *    local development.
 *
 * Keeping this behind the OrderIdStore / IdempotencyStore interfaces means the
 * request handler never changes.
 */

import { Redis } from "@upstash/redis";

import {
  FileOrderIdStore,
  RedisOrderIdStore,
  type OrderIdStore,
} from "./orderId";
import {
  FileIdempotencyStore,
  RedisIdempotencyStore,
  type IdempotencyStore,
} from "./idempotency";

export interface OrderStores {
  orderIdStore: OrderIdStore;
  idempotencyStore: IdempotencyStore;
}

/** True when Upstash Redis REST credentials are configured. */
function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Build the order stores for the current environment. Uses Redis on serverless
 * hosts (read-only FS) and the file stores locally.
 */
export function createStores(): OrderStores {
  if (hasRedisConfig()) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
    return {
      orderIdStore: new RedisOrderIdStore(redis),
      idempotencyStore: new RedisIdempotencyStore(redis),
    };
  }

  return {
    orderIdStore: new FileOrderIdStore(),
    idempotencyStore: new FileIdempotencyStore(),
  };
}
