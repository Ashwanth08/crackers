// tests/e2e.smoke.test.ts
//
// End-to-end LOGIC-LEVEL smoke test of the full Sri Crackers journey (Task 20).
// There is no browser and no HTTP/SMTP server here: the test exercises the
// whole pipeline by composing the REAL modules exactly as the running app wires
// them together â€”
//
//   browse â†’ filter/search â†’ add to cart (min default) â†’ view cart totals â†’
//   checkout with valid details â†’ submit (SMTP mocked) â†’ confirmation (Order ID)
//
// Validates: Requirements 20.1, 20.2, 20.3
//
//   20.1 â€” selecting quantities drives the live Cart Grand Total.
//   20.2 â€” the cart proceeds to checkout and yields a well-formed Order ID that
//          can drive the confirmation view/URL.
//   20.3 â€” a valid submission is processed server-side, the owner email is sent,
//          and the Confirmation shows the Order ID with recomputed totals.

import { describe, expect, it, vi } from "vitest";

// Real catalogue + browse/filter modules.
import products from "../data/products.json";
import { filterProducts } from "../lib/search";
import { chipForCategory } from "../data/categoryMap";

// Real cart reducer + totals.
import { cartReducer, initialCart } from "../lib/cart/cartReducer";
import {
  distinctCount,
  totalQuantity,
  grandTotal,
} from "../lib/cart/cartTotals";

// Real server-side order pipeline.
import { handleOrder, type OrderDeps } from "../app/api/order/handler";
import type { Mailer } from "../lib/email/mailer";
import type { IdempotencyStore } from "../lib/idempotency";
import type { OrderIdStore } from "../lib/orderId";
import type {
  Cart,
  CustomerDetails,
  OrderRequest,
  OrderResponse,
  Product,
} from "../lib/types";

const CATALOGUE = products as Product[];

// ---------------------------------------------------------------------------
// Test doubles for the submit step â€” identical style to tests/apiOrder.test.ts.
// ---------------------------------------------------------------------------

/** In-memory, sequential Order ID store ("SC-2026-00001", "SC-2026-00002", â€¦). */
class InMemoryOrderIdStore implements OrderIdStore {
  private counter = 0;
  async next(): Promise<string> {
    this.counter += 1;
    return `SC-2026-${String(this.counter).padStart(5, "0")}`;
  }
}

/** In-memory IdempotencyStore honouring the TTL via an absolute expiry. */
class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<
    string,
    { value: OrderResponse; expiresAt: number }
  >();

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
}

/** A mock mailer whose send call is a spy, so the call count can be asserted. */
function makeMockMailer(): Mailer & {
  sendOrderEmail: ReturnType<typeof vi.fn>;
} {
  return { sendOrderEmail: vi.fn(async () => {}) };
}

describe("end-to-end smoke test â€” full ordering journey (Task 20)", () => {
  it("browse â†’ filter/search â†’ add (min) â†’ cart totals â†’ checkout â†’ submit â†’ confirmation", async () => {
    // -----------------------------------------------------------------------
    // Step 1 â€” BROWSE + FILTER/SEARCH (Req 2 / 4, backing the browse step).
    // Pick the "Sound" chip, filter the catalogue to that chip, then narrow
    // with a case-insensitive substring search. Assert the filtered list is
    // non-empty and every result both maps to the chosen chip AND matches the
    // query against name or category.
    // -----------------------------------------------------------------------
    const chip = "Sound" as const;

    const inChip = CATALOGUE.filter(
      (product) => chipForCategory(product.category) === chip,
    );
    expect(inChip.length).toBeGreaterThan(0);
    // Every chip-filtered product really maps to the chosen chip.
    for (const product of inChip) {
      expect(chipForCategory(product.category)).toBe(chip);
    }

    const query = "bomb";
    const browseResults = filterProducts(inChip, query);
    expect(browseResults.length).toBeGreaterThan(0);
    const needle = query.toLowerCase();
    for (const product of browseResults) {
      // Still a "Sound" product â€¦
      expect(chipForCategory(product.category)).toBe(chip);
      // â€¦ and a genuine case-insensitive substring match on name or category.
      const matches =
        product.name.toLowerCase().includes(needle) ||
        product.category.toLowerCase().includes(needle);
      expect(matches).toBe(true);
    }

    // -----------------------------------------------------------------------
    // Step 2 â€” ADD TO CART at the default (minimum) quantity (Req 2.11, 6.3,
    // 5.8, 5.9, 20.1). Take two real products and fold ADD actions over the
    // initial cart with NO explicit quantity, so each line defaults to its
    // minimumQuantity. Then assert the live totals.
    // -----------------------------------------------------------------------
    const productA = CATALOGUE.find((p) => p.id === 1);
    const productB = CATALOGUE.find((p) => p.id === 17);
    expect(productA).toBeDefined();
    expect(productB).toBeDefined();
    const chosen: Product[] = [productA!, productB!];

    const cart: Cart = chosen.reduce<Cart>(
      (state, product) => cartReducer(state, { type: "ADD", product }),
      initialCart,
    );

    // Each line defaulted to its product's minimum quantity.
    for (const product of chosen) {
      const line = cart.items.find((i) => i.productId === product.id);
      expect(line).toBeDefined();
      expect(line!.quantity).toBe(product.minimumQuantity);
    }

    // Two distinct products in the cart.
    expect(distinctCount(cart)).toBe(2);

    // Grand total equals the sum of price * minimumQuantity for each line.
    const expectedGrandTotal = chosen.reduce(
      (sum, product) => sum + product.price * product.minimumQuantity,
      0,
    );
    expect(grandTotal(cart)).toBe(expectedGrandTotal);
    expect(totalQuantity(cart)).toBe(
      chosen.reduce((sum, p) => sum + p.minimumQuantity, 0),
    );

    // Bump quantities so the order clears the 2000 minimum order value before
    // checkout (SET_QTY of 150 on each line: 10*150 + 75*150 = 12,750).
    const bumpedCart: Cart = chosen.reduce<Cart>(
      (state, product) =>
        cartReducer(state, { type: "SET_QTY", productId: product.id, quantity: 150 }),
      cart,
    );
    expect(grandTotal(bumpedCart)).toBeGreaterThanOrEqual(2000);

    const cartGrandTotal = grandTotal(bumpedCart);

    // -----------------------------------------------------------------------
    // Step 3 â€” CHECKOUT: build the OrderRequest from the cart (productId +
    // quantity only â€” the server re-prices) with a valid customer, then submit
    // through the real pipeline with mocked SMTP (Req 20.2, 20.3).
    // -----------------------------------------------------------------------
    const customer: CustomerDetails = {
      fullName: "Venkatesh Kumar",
      mobile: "9876543210",
      address: "12 Market Road, Sivakasi",
    };

    const body: OrderRequest = {
      idempotencyKey: "e2e-smoke-key-1",
      customer,
      items: bumpedCart.items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    };

    const mailer = makeMockMailer();
    const deps: OrderDeps = {
      orderIdStore: new InMemoryOrderIdStore(),
      idempotencyStore: new InMemoryIdempotencyStore(),
      mailer,
    };

    const result = await handleOrder(body, deps);

    // -----------------------------------------------------------------------
    // Step 4 â€” SUBMIT assertions (Req 20.3): 200 + success, well-formed Order
    // ID, totals recomputed on the server match the cart, and exactly one
    // owner email was sent.
    // -----------------------------------------------------------------------
    expect(result.status).toBe(200);
    expect(result.response.success).toBe(true);

    const orderId = result.response.orderId;
    expect(orderId).toMatch(/^SC-2026-\d{5}$/);
    expect(result.response.grandTotal).toBe(cartGrandTotal);
    expect(result.response.totalProducts).toBe(2);
    expect(result.response.totalQuantity).toBe(totalQuantity(bumpedCart));
    expect(mailer.sendOrderEmail).toHaveBeenCalledTimes(1);

    // -----------------------------------------------------------------------
    // Step 5 â€” CONFIRMATION (Req 20.2): the returned Order ID is well-formed
    // and can drive the confirmation view / URL for the customer.
    // -----------------------------------------------------------------------
    expect(typeof orderId).toBe("string");
    const confirmationUrl = `/confirmation?orderId=${orderId}`;
    expect(confirmationUrl).toContain(orderId as string);
    expect(confirmationUrl).toMatch(/^\/confirmation\?orderId=SC-2026-\d{5}$/);
  });
});

