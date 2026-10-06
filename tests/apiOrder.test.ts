// tests/apiOrder.test.ts
//
// Integration tests for the exported `handleOrder(body, deps)` pipeline from
// app/api/order/handler.ts (Task 11.2). The handler is imported directly and
// driven with in-memory stores and a mock mailer â€” no HTTP server and no real
// SMTP connection are involved.
//
// Validates: Requirements 8.9, 8.11, 8.12, 9.1, 20.3, 20.4
//
//   8.9  â€” the server re-validates every order from scratch and rejects
//          invalid payloads before sending the email.
//   8.11 â€” a replayed submission with the same idempotency key returns the
//          original result without creating a new order.
//   8.12 â€” the Order ID is well-formed ("SC-2026-NNNNN").
//   9.1  â€” a valid order sends exactly one owner notification email.
//   20.3 â€” the response carries the Order ID and recomputed totals.
//   20.4 â€” failures map to machine-readable error codes and never leak secrets.

import { describe, expect, it, vi } from "vitest";

import { handleOrder, type OrderDeps } from "../app/api/order/handler";
import type { Mailer } from "../lib/email/mailer";
import type { IdempotencyStore } from "../lib/idempotency";
import type { OrderIdStore } from "../lib/orderId";
import type { CustomerDetails, OrderResponse } from "../lib/types";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/**
 * In-memory, sequential Order ID store returning "SC-2026-00001",
 * "SC-2026-00002", â€¦ It mirrors the real store's format without touching the
 * filesystem.
 */
class InMemoryOrderIdStore implements OrderIdStore {
  private counter = 0;
  async next(): Promise<string> {
    this.counter += 1;
    return `SC-2026-${String(this.counter).padStart(5, "0")}`;
  }
}

/** In-memory IdempotencyStore honouring the TTL via an absolute expiry. */
class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, { value: OrderResponse; expiresAt: number }>();

  async get(key: string): Promise<OrderResponse | undefined> {
    const entry = this.map.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: OrderResponse, ttlMs: number): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Test-only: how many keys are currently recorded. */
  size(): number {
    return this.map.size;
  }
}

/** A mock mailer whose send call is a spy, so call counts can be asserted. */
function makeMockMailer(): Mailer & { sendOrderEmail: ReturnType<typeof vi.fn> } {
  return { sendOrderEmail: vi.fn(async () => {}) };
}

/** A mailer whose send always rejects, exercising the EMAIL_FAILED path. */
function makeFailingMailer(): Mailer & { sendOrderEmail: ReturnType<typeof vi.fn> } {
  return {
    sendOrderEmail: vi.fn(async () => {
      throw new Error("SMTP connection refused");
    }),
  };
}

/** Build a fresh set of dependencies with the given mailer. */
function makeDeps(
  mailer: Mailer,
): OrderDeps & { idempotencyStore: InMemoryIdempotencyStore } {
  return {
    orderIdStore: new InMemoryOrderIdStore(),
    idempotencyStore: new InMemoryIdempotencyStore(),
    mailer,
  };
}

// A valid customer re-used across tests.
const validCustomer: CustomerDetails = {
  fullName: "Venkatesh Kumar",
  mobile: "9876543210",
  email: "venkatesh@example.com",
  address: "12 Market Road, Sivakasi",
  city: "Sivakasi",
  pincode: "626123",
  notes: "Please deliver before Diwali.",
};

/** Build a valid order body that clears the 2000 minimum order value.
 *  Product 1 (price 10) x 250 = 2500. */
function validBody(idempotencyKey = "key-valid-1") {
  return {
    idempotencyKey,
    customer: { ...validCustomer },
    items: [{ productId: 1, quantity: 250 }],
  };
}

/** Recursively collect every string value in a JSON-ish object. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

/** Collect every object key name recursively. */
function collectKeys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      collectKeys(v, out);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleOrder integration (Task 11.2)", () => {
  it("1. valid payload â†’ 200, success, well-formed Order ID, correct totals, one email (Req 8.12, 9.1, 20.3)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    const result = await handleOrder(validBody(), deps);

    expect(result.status).toBe(200);
    expect(result.response.success).toBe(true);
    expect(result.response.orderId).toMatch(/^SC-2026-\d{5}$/);
    // Product 1: price 10, quantity 1 â†’ one product, one unit, â‚¹10.
    expect(result.response.grandTotal).toBe(10);
    expect(result.response.totalProducts).toBe(1);
    expect(result.response.totalQuantity).toBe(1);
    expect(mailer.sendOrderEmail).toHaveBeenCalledTimes(1);
  });

  it("2. invalid customer (empty fullName) â†’ 400, errors includes fullName, no email (Req 8.9)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    const body = validBody("key-bad-name");
    body.customer.fullName = "";

    const result = await handleOrder(body, deps);

    expect(result.status).toBe(400);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("VALIDATION");
    expect(result.response.errors?.some((e) => e.field === "fullName")).toBe(true);
    expect(mailer.sendOrderEmail).not.toHaveBeenCalled();
  });

  it("3. empty items â†’ 400 EMPTY_CART, no email (Req 8.9, 20.4)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    const body = { ...validBody("key-empty-cart"), items: [] as Array<{ productId: number; quantity: number }> };

    const result = await handleOrder(body, deps);

    expect(result.status).toBe(400);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("EMPTY_CART");
    expect(mailer.sendOrderEmail).not.toHaveBeenCalled();
  });

  it("4. quantity below minimum â†’ 400 MIN_QUANTITY, no email (Req 8.9, 20.4)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    // Product 1 has minimumQuantity 1; quantity 0 is below the minimum.
    const body = { ...validBody("key-min-qty"), items: [{ productId: 1, quantity: 0 }] };

    const result = await handleOrder(body, deps);

    expect(result.status).toBe(400);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("MIN_QUANTITY");
    expect(mailer.sendOrderEmail).not.toHaveBeenCalled();
  });

  it("5. unknown productId â†’ 400 VALIDATION, no email (Req 8.9)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    const body = { ...validBody("key-unknown"), items: [{ productId: 99999, quantity: 1 }] };

    const result = await handleOrder(body, deps);

    expect(result.status).toBe(400);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("VALIDATION");
    expect(mailer.sendOrderEmail).not.toHaveBeenCalled();
  });

  it("5b. below minimum order value -> 400 MIN_ORDER_VALUE, no email", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    // Product 1 (price 10) x 10 = 100, well below the 2000 minimum.
    const body = { ...validBody("key-min-order"), items: [{ productId: 1, quantity: 10 }] };

    const result = await handleOrder(body, deps);

    expect(result.status).toBe(400);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("MIN_ORDER_VALUE");
    expect(result.response.grandTotal).toBe(100);
    expect(mailer.sendOrderEmail).not.toHaveBeenCalled();
  });

  it("6. same idempotency key twice â†’ second returns the original, one email total (Req 8.11)", async () => {
    const mailer = makeMockMailer();
    const deps = makeDeps(mailer);

    const first = await handleOrder(validBody("dup-key"), deps);
    const second = await handleOrder(validBody("dup-key"), deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // The replay returns the exact original response.
    expect(second.response).toEqual(first.response);
    expect(second.response.orderId).toBe(first.response.orderId);
    // The email was sent only on the first submission.
    expect(mailer.sendOrderEmail).toHaveBeenCalledTimes(1);
  });

  it("7. email failure â†’ 502 EMAIL_FAILED with orderId, idempotency not recorded; retry resends (Req 20.4, 8.11)", async () => {
    const failing = makeFailingMailer();
    const deps = makeDeps(failing);

    const result = await handleOrder(validBody("retry-key"), deps);

    expect(result.status).toBe(502);
    expect(result.response.success).toBe(false);
    expect(result.response.errorCode).toBe("EMAIL_FAILED");
    expect(result.response.orderId).toMatch(/^SC-2026-\d{5}$/);
    // The failed order was NOT recorded for idempotent replay.
    expect(deps.idempotencyStore.size()).toBe(0);

    // A retry with the SAME key attempts to send again (not short-circuited).
    await handleOrder(validBody("retry-key"), deps);
    expect(failing.sendOrderEmail).toHaveBeenCalledTimes(2);
  });

  it("8. responses carry no SMTP secrets and expose no password-like fields (Req 20.4)", async () => {
    const okMailer = makeMockMailer();
    const okDeps = makeDeps(okMailer);
    const okResult = await handleOrder(validBody("sec-ok"), okDeps);

    const failMailer = makeFailingMailer();
    const failDeps = makeDeps(failMailer);
    const failResult = await handleOrder(validBody("sec-fail"), failDeps);

    for (const response of [okResult.response, failResult.response]) {
      const strings = collectStrings(response);
      const keys = collectKeys(response).map((k) => k.toLowerCase());

      // No secret-like substrings leak into any string value.
      for (const s of strings) {
        const lower = s.toLowerCase();
        expect(lower).not.toContain("smtp");
        expect(lower).not.toContain("password");
        expect(lower).not.toContain("secret");
        expect(lower).not.toContain("smtp connection refused");
      }

      // No field is named password/pass/secret.
      expect(keys).not.toContain("password");
      expect(keys).not.toContain("pass");
      expect(keys).not.toContain("secret");

      // Any message present is a plain, non-empty human-readable string.
      if (response.message !== undefined) {
        expect(typeof response.message).toBe("string");
        expect(response.message.length).toBeGreaterThan(0);
      }
    }

    // The failure response surfaces a human-readable message.
    expect(typeof failResult.response.message).toBe("string");
    expect((failResult.response.message as string).length).toBeGreaterThan(0);
  });
});


