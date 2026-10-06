/**
 * Order pipeline â€” SERVER-ONLY core logic for POST /api/order.
 *
 * This module holds the full order-handling pipeline and its helpers. It is
 * kept SEPARATE from the App Router route module (`route.ts`) because Next.js
 * route modules may only export recognised route handlers (GET/POST/â€¦) and
 * config (`runtime`, `dynamic`, â€¦); exporting anything else (like
 * `handleOrder` or `OrderDeps`) breaks `next build` with a generated
 * route-type error. The route re-imports {@link handleOrder} from here.
 *
 * The pipeline re-validates every order from scratch on the server (never
 * trusting client-supplied prices or names), allocates a unique Order ID,
 * sends the owner notification email, records the result for idempotent
 * replay, and returns an `OrderResponse`.
 *
 * The core pipeline is exported as {@link handleOrder} with its dependencies
 * injected via {@link OrderDeps}, so the integration tests (Task 11.2) can
 * drive it with in-memory/temp-file stores and a mock mailer without a real
 * SMTP connection.
 *
 * Secret values are never placed in any response or message; mailer
 * configuration failures are logged server-side only and surfaced as a generic
 * `SERVER_ERROR` by the route.
 *
 * Requirements: 8.9, 8.10, 8.11, 8.12, 9.1, 11.1, 11.4, 12.5, 18.2, 18.3,
 *   18.4, 18.5, 20.3, 20.4.
 */

import products from "../../../data/products.json";
import {
  validateCustomer,
  validateCartItems,
  isBelowMinimumOrderValue,
  minimumOrderValueMessage,
} from "../../../lib/validation";
import { sanitizeCustomerText } from "../../../lib/sanitize";
import {
  OrderIdExhaustedError,
  type OrderIdStore,
} from "../../../lib/orderId";
import {
  DEFAULT_TTL_MS,
  type IdempotencyStore,
} from "../../../lib/idempotency";
import { type Mailer } from "../../../lib/email/mailer";
import {
  buildOrderEmailSubject,
  buildOrderEmailHtml,
  buildOrderEmailText,
  type OrderEmailData,
} from "../../../lib/email/orderEmailTemplate";
import type {
  OrderResponse,
  CartLineItem,
  CustomerDetails,
  ValidationError,
  Product,
} from "../../../lib/types";

/**
 * Server-side product catalogue indexed by `id` for O(1) resolution. Built
 * once at module load from the trusted `products.json` so client-supplied
 * prices/names are always ignored (Req 12.5, 8.10 of the design â€” server is
 * the source of truth).
 */
const PRODUCTS_BY_ID: Map<number, Product> = new Map(
  (products as Product[]).map((p) => [p.id, p]),
);

/**
 * Dependencies for {@link handleOrder}. Injected so tests can substitute
 * in-memory/temp-file stores and a mock mailer.
 */
export interface OrderDeps {
  orderIdStore: OrderIdStore;
  idempotencyStore: IdempotencyStore;
  mailer: Mailer;
  /** Clock override for deterministic timestamps in tests. */
  now?: () => Date;
}

/** The result of running the order pipeline: an HTTP status plus the body. */
export interface HandleOrderResult {
  status: number;
  response: OrderResponse;
}

/** A minimally shape-checked order request (validated further downstream). */
interface ParsedOrderBody {
  idempotencyKey: string;
  customer: CustomerDetails;
  items: Array<{ productId: number; quantity: number }>;
}

/** True when `value` is a non-null, non-array object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Shape-check the raw request body (Req 20.3). We only confirm the top-level
 * structure here â€” a non-empty string `idempotencyKey`, an object `customer`,
 * and an array `items`. Per-field and per-line validation happens later via the
 * shared validators (Req 8.9), and item contents are resolved against the
 * catalogue (Req 12.5).
 *
 * @returns The narrowed body, or `null` when the shape is malformed.
 */
function parseBody(body: unknown): ParsedOrderBody | null {
  if (!isObject(body)) {
    return null;
  }

  const { idempotencyKey, customer, items } = body as Record<string, unknown>;

  if (typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
    return null;
  }
  if (!isObject(customer)) {
    return null;
  }
  if (!Array.isArray(items)) {
    return null;
  }

  return {
    idempotencyKey,
    customer: customer as unknown as CustomerDetails,
    items: items as Array<{ productId: number; quantity: number }>,
  };
}

/**
 * Resolve the client-submitted items against the trusted catalogue.
 *
 * Client-supplied prices/names are IGNORED; every field other than the chosen
 * quantity is snapshotted from `products.json` (Req 12.5). The quantity is
 * coerced to an integer. If any `productId` is unknown, or an item is
 * malformed, resolution fails so the caller can return a VALIDATION error.
 *
 * @returns The resolved line items, or `null` when any item cannot be resolved.
 */
function resolveItems(
  items: Array<{ productId: number; quantity: number }>,
): CartLineItem[] | null {
  const resolved: CartLineItem[] = [];

  for (const raw of items) {
    if (!isObject(raw)) {
      return null;
    }
    const productId = (raw as Record<string, unknown>).productId;
    const quantity = (raw as Record<string, unknown>).quantity;

    if (typeof productId !== "number" || !Number.isFinite(productId)) {
      return null;
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
      return null;
    }

    const product = PRODUCTS_BY_ID.get(productId);
    if (product === undefined) {
      return null;
    }

    resolved.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      minimumQuantity: product.minimumQuantity,
      // Coerce to an integer; the quantity is the only client-controlled field.
      quantity: Math.trunc(quantity),
    });
  }

  return resolved;
}

/**
 * Classify a set of validation errors into a single machine-readable error
 * code (Req 20.4). An empty cart dominates (EMPTY_CART); otherwise any
 * sub-minimum line reports MIN_QUANTITY; any remaining field error is
 * VALIDATION.
 */
function classifyErrors(
  errors: ValidationError[],
): "EMPTY_CART" | "MIN_QUANTITY" | "VALIDATION" {
  if (errors.some((e) => e.field === "cart")) {
    return "EMPTY_CART";
  }
  if (errors.some((e) => /^items\[\d+\]\.quantity$/.test(e.field))) {
    return "MIN_QUANTITY";
  }
  return "VALIDATION";
}

/**
 * Build the customer object used for the email, with every provided text field
 * sanitized (Req 8.10, 18.4). Validation runs on the ORIGINAL values; only the
 * email-facing copy is sanitized so markup is never interpreted.
 */
function sanitizeCustomer(customer: CustomerDetails): CustomerDetails {
  return {
    fullName: sanitizeCustomerText(customer.fullName),
    mobile: sanitizeCustomerText(customer.mobile),
    email:
      customer.email !== undefined
        ? sanitizeCustomerText(customer.email)
        : undefined,
    address: sanitizeCustomerText(customer.address),
    city:
      customer.city !== undefined
        ? sanitizeCustomerText(customer.city)
        : undefined,
    pincode:
      customer.pincode !== undefined
        ? sanitizeCustomerText(customer.pincode)
        : undefined,
    notes:
      customer.notes !== undefined
        ? sanitizeCustomerText(customer.notes)
        : undefined,
  };
}

/**
 * Core order pipeline. Pure with respect to I/O except through the injected
 * `deps`, so it is directly unit/integration testable.
 *
 * Pipeline (see module header for the requirement mapping):
 *   1. Shape-check the body.
 *   2. Idempotent replay â€” return the stored response if the key was seen.
 *   3. Resolve items against the trusted catalogue.
 *   4. Re-validate customer + items on the server (Req 8.9).
 *   5. Sanitize customer fields for the email.
 *   6. Compute totals.
 *   7. Allocate the Order ID (ID_EXHAUSTED on overflow).
 *   8. Send the owner email (EMAIL_FAILED on send error; ID not reused).
 *   9. Record the success for idempotent replay and return it.
 */
export async function handleOrder(
  body: unknown,
  deps: OrderDeps,
): Promise<HandleOrderResult> {
  // 1. Shape-check.
  const parsed = parseBody(body);
  if (parsed === null) {
    return {
      status: 400,
      response: {
        success: false,
        errorCode: "VALIDATION",
        message: "Malformed request.",
      },
    };
  }

  // 2. Idempotent replay (Req 8.11, 18.5): return the original result without
  // creating a new order or sending the email again.
  const existing = await deps.idempotencyStore.get(parsed.idempotencyKey);
  if (existing !== undefined) {
    return { status: 200, response: existing };
  }

  // 3. Resolve items against the trusted catalogue (Req 12.5).
  const resolvedItems = resolveItems(parsed.items);
  if (resolvedItems === null) {
    return {
      status: 400,
      response: {
        success: false,
        errorCode: "VALIDATION",
        message: "One or more items could not be found in the catalogue.",
      },
    };
  }

  // 4. Server-side re-validation (Req 8.9). Do not send the email on failure.
  const errors: ValidationError[] = [
    ...validateCustomer(parsed.customer),
    ...validateCartItems(resolvedItems),
  ];
  if (errors.length > 0) {
    const errorCode = classifyErrors(errors);
    return {
      status: 400,
      response: {
        success: false,
        errors,
        errorCode,
        message: "Please correct the highlighted details and try again.",
      },
    };
  }

  // 5. Sanitize customer fields for the email (validation used raw values).
  const safeCustomer = sanitizeCustomer(parsed.customer);

  // 6. Compute totals.
  const totalProducts = resolvedItems.length;
  const totalQuantity = resolvedItems.reduce((sum, i) => sum + i.quantity, 0);
  const grandTotal = resolvedItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  // 6b. Enforce the minimum order value on the server (authoritative). The
  // client also guards this, but the server re-check prevents bypass.
  if (isBelowMinimumOrderValue(grandTotal)) {
    return {
      status: 400,
      response: {
        success: false,
        errorCode: "MIN_ORDER_VALUE",
        grandTotal,
        message: minimumOrderValueMessage(grandTotal),
      },
    };
  }

  // 7. Allocate the Order ID (Req 11.1, 11.4).
  let orderId: string;
  try {
    orderId = await deps.orderIdStore.next();
  } catch (err) {
    if (err instanceof OrderIdExhaustedError) {
      return {
        status: 503,
        response: {
          success: false,
          errorCode: "ID_EXHAUSTED",
          message:
            "We are temporarily unable to accept new orders. Please try again later.",
        },
      };
    }
    throw err;
  }

  // 8. Send the owner notification email (Req 9.1). On failure, surface
  // EMAIL_FAILED and DO NOT record idempotency success so a retry can resend.
  const dateTime = (deps.now?.() ?? new Date()).toLocaleString("en-IN");
  const emailData: OrderEmailData = {
    orderId,
    dateTime,
    customer: safeCustomer,
    items: resolvedItems,
    totalProducts,
    totalQuantity,
    grandTotal,
  };

  try {
    await deps.mailer.sendOrderEmail({
      subject: buildOrderEmailSubject(orderId, grandTotal),
      html: buildOrderEmailHtml(emailData),
      text: buildOrderEmailText(emailData),
    });
  } catch (err) {
    // Log server-side only; never leak details to the client (Req 18.2, 18.3).
    console.error("Order email send failed", err);
    return {
      status: 502,
      response: {
        success: false,
        orderId,
        errorCode: "EMAIL_FAILED",
        message:
          "Your order could not be submitted due to a delivery problem. Please try again.",
      },
    };
  }

  // 9. Success â€” record for idempotent replay and return (Req 8.11, 20.3).
  const response: OrderResponse = {
    success: true,
    orderId,
    grandTotal,
    totalProducts,
    totalQuantity,
  };
  await deps.idempotencyStore.set(
    parsed.idempotencyKey,
    response,
    DEFAULT_TTL_MS,
  );

  return { status: 200, response };
}

