/**
 * Shared TypeScript types for the Sri Crackers online ordering app.
 *
 * This is a pure type module (no runtime code). All interfaces are shared
 * across client and server (the Data Models of the design).
 *
 * IMPORTANT: `products.json` is the source of truth and uses NUMERIC ids
 * (1..186). The design text showed "P001"-style string ids, but these types
 * align to the real data file: `Product.id`, `CartLineItem.productId`, and
 * `OrderRequest.items[].productId` are all `number`.
 *
 * Requirements: 12.2 (fields sourced only from the Price List PDF), 5.4/5.9
 * (cart line items + line totals), 7.2 (customer details), 8 (order request /
 * validation), 10.2 (order response), 11.1 (Order ID format).
 */

/**
 * A grouped chip label used by the category filter.
 * _Requirements: 2.3, 2.6_
 */
export type ChipLabel =
  | "Sound"
  | "Flower"
  | "Rocket"
  | "Kids"
  | "Fancy"
  | "Sparklers"
  | "Gift";

/**
 * Catalogue item â€” every field is sourced only from the Price List PDF and
 * mirrors a record in `data/products.json`.
 * _Requirements: 12.2, 12.5, 6.1_
 */
export interface Product {
  /** Stable unique identifier, matching the S.No in products.json (1..186). */
  id: number;
  /** Product name exactly from the PDF. */
  name: string;
  /** Detailed PDF category. */
  category: string;
  /** Unit price in INR (â‚¹), > 0. */
  price: number;
  /** Selling unit from the PDF, e.g. "Packet", "box", "piece", "box - 5 pcs". */
  unit: string;
  /** Minimum order quantity, integer >= 1. */
  minimumQuantity: number;
}

/**
 * A single line in the cart/order. Fields other than `quantity` are snapshots
 * of the product at the time it was added (used for display and the email).
 * _Requirements: 5.4, 5.9, 6.4_
 */
export interface CartLineItem {
  /** References Product.id in products.json. */
  productId: number;
  /** Snapshot of the product name for display/email. */
  name: string;
  /** Snapshot of the category (useful for display). */
  category: string;
  /** Snapshot of the selling unit for the email table. */
  unit: string;
  /** Unit price snapshot (â‚¹). */
  price: number;
  /** Minimum-quantity snapshot used for enforcement. */
  minimumQuantity: number;
  /** Current quantity, always >= minimumQuantity. */
  quantity: number;
  // Derived (not stored): lineTotal = price * quantity (Req 5.9)
}

/**
 * The whole cart. Totals are derived selectors, not persisted:
 *   distinctCount = items.length                    (Req 1.3, 5.8)
 *   totalQuantity = sum(item.quantity)              (Req 5.8)
 *   grandTotal    = sum(item.price * item.quantity) (Req 5.9)
 * _Requirements: 5_
 */
export interface Cart {
  items: CartLineItem[];
}

/**
 * Customer-provided checkout details.
 * _Requirements: 7.2, 8.1, 8.2, 8.3, 8.5, 9.7_
 */
export interface CustomerDetails {
  /** Required. */
  fullName: string;
  /** Required, 10-digit Indian mobile. */
  mobile: string;
  /** Optional, format-checked if present. */
  email?: string;
  /** Required. */
  address: string;
  /** Optional. */
  city?: string;
  /** Optional. */
  pincode?: string;
  /** Optional (shown as Customer Notes in the email). */
  notes?: string;
}

/**
 * Request body for POST /api/order.
 *
 * The server recomputes prices and min-quantities from products.json; it does
 * NOT trust client-supplied price/name values.
 * _Requirements: 8, 8.11, 12.5_
 */
export interface OrderRequest {
  /** Client-generated UUID for idempotent submission. */
  idempotencyKey: string;
  customer: CustomerDetails;
  items: Array<{ productId: number; quantity: number }>;
}

/**
 * A field-level validation failure.
 * _Requirements: 8.9_
 */
export interface ValidationError {
  /** e.g. "fullName", "mobile", "items[2].quantity". */
  field: string;
  message: string;
}

/**
 * Machine-readable failure classification returned by POST /api/order.
 * _Requirements: 10.2, 11.4, 20.4_
 */
export type OrderErrorCode =
  | "VALIDATION"
  | "EMPTY_CART"
  | "MIN_QUANTITY"
  | "MIN_ORDER_VALUE"
  | "ID_EXHAUSTED"
  | "EMAIL_FAILED"
  | "SERVER_ERROR";

/**
 * Response from POST /api/order.
 * _Requirements: 10.2, 11.1, 20.3, 20.4_
 */
export interface OrderResponse {
  success: boolean;
  /** "SC-2026-NNNNN" on success. */
  orderId?: string;
  /** Echoed for the summary view. */
  grandTotal?: number;
  /** Number of distinct products in the order. */
  totalProducts?: number;
  /** Sum of all line quantities. */
  totalQuantity?: number;
  /** Field-level validation failures. */
  errors?: ValidationError[];
  errorCode?: OrderErrorCode;
  /** Human-readable message; never contains secrets. */
  message?: string;
}

