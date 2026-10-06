/**
 * Order validation — pure, framework-agnostic rules shared by the client
 * checkout form and the backend order handler.
 *
 * Every function here is a pure function (no I/O, no side effects, no shared
 * mutable state), so the exact same checks run in the browser (for inline
 * field feedback) and on the server (for the authoritative re-validation
 * required by Requirement 8.9). Messages are human-readable and never contain
 * secret values.
 *
 * Requirements:
 *   8.1 Full Name required.
 *   8.2 Mobile Number required.
 *   8.3 Delivery Address required.
 *   8.4 Mobile format: exactly 10 digits, first digit 6–9, after stripping
 *       spaces and hyphens.
 *   8.5 Email format (only when non-empty): exactly one "@", a local part
 *       before it, and a domain after it containing at least one ".".
 *   8.6 Cart must not be empty.
 *   8.7 Each line item quantity must meet its product Minimum_Quantity.
 *   6.4 Minimum_Quantity is the enforced floor for a line item quantity.
 */

import type {
  CustomerDetails,
  CartLineItem,
  ValidationError,
} from "./types";

/**
 * Strip all spaces and hyphens from a mobile number string, leaving the
 * remaining characters untouched. Used before format checking so that values
 * like "98765 43210" or "98765-43210" are evaluated by their digits alone.
 *
 * @param mobile The raw mobile input.
 * @returns The input with every space and hyphen removed.
 */
export function normalizeMobile(mobile: string): string {
  return mobile.replace(/[\s-]/g, "");
}

/**
 * Validate an Indian mobile number: after normalization it must be exactly
 * 10 digits with a first digit between 6 and 9 inclusive (Requirement 8.4).
 *
 * @param mobile The raw mobile input.
 * @returns True iff the normalized value matches /^[6-9]\d{9}$/.
 */
export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeMobile(mobile));
}

/**
 * Validate an email address against the lightweight rule in Requirement 8.5:
 * exactly one "@", at least one character before it, and a domain after it
 * that contains at least one "." with a non-empty label on each side of the
 * final dot (so "a.b" passes but "a." and ".b" do not). This is intentionally
 * not a full RFC-5322 regex.
 *
 * @param email The email value to check (assumed non-empty by the caller).
 * @returns True iff the value satisfies the Requirement 8.5 rule.
 */
export function isValidEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (local.length === 0) {
    return false;
  }

  const lastDot = domain.lastIndexOf(".");
  // A "." must exist, with at least one char before it and one char after it.
  return lastDot > 0 && lastDot < domain.length - 1;
}

/**
 * Validate the customer-provided checkout details, returning every applicable
 * error (the checks do not short-circuit at the first failure).
 *
 * Rules:
 *   - fullName required           (Requirement 8.1)
 *   - mobile required + format    (Requirements 8.2, 8.4)
 *   - address required            (Requirement 8.3)
 *   - email format if non-empty   (Requirement 8.5)
 *
 * @param c The customer details to validate.
 * @returns A (possibly empty) list of field-level errors.
 */
export function validateCustomer(c: CustomerDetails): ValidationError[] {
  const errors: ValidationError[] = [];

  if (c.fullName.trim().length === 0) {
    errors.push({ field: "fullName", message: "Full Name is required." });
  }

  if (c.mobile.trim().length === 0) {
    errors.push({ field: "mobile", message: "Mobile Number is required." });
  } else if (!isValidMobile(c.mobile)) {
    errors.push({
      field: "mobile",
      message:
        "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.",
    });
  }

  if (c.address.trim().length === 0) {
    errors.push({ field: "address", message: "Delivery Address is required." });
  }

  if (c.email !== undefined && c.email.trim().length > 0 && !isValidEmail(c.email)) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  return errors;
}

/**
 * Validate the cart line items (Requirements 8.6, 8.7, 6.4).
 *
 *   - An empty cart produces a single error on the "cart" field.
 *   - Each item whose quantity is below its Minimum_Quantity produces an error
 *     on `items[${index}].quantity` naming the product and its required
 *     minimum, so the customer can see exactly which lines need adjusting.
 *
 * @param items The cart line items to validate.
 * @returns A (possibly empty) list of field-level errors.
 */
export function validateCartItems(items: CartLineItem[]): ValidationError[] {
  if (items.length === 0) {
    return [{ field: "cart", message: "Your cart is empty." }];
  }

  const errors: ValidationError[] = [];

  items.forEach((item, index) => {
    if (item.quantity < item.minimumQuantity) {
      errors.push({
        field: `items[${index}].quantity`,
        message: `"${item.name}" requires a minimum quantity of ${item.minimumQuantity}.`,
      });
    }
  });

  return errors;
}

/**
 * Compose the full order validation: customer detail checks followed by cart
 * line-item checks (Requirement 8, criteria 8.1–8.7). Returns the combined
 * list of all applicable errors.
 *
 * @param customer The customer details.
 * @param items The cart line items.
 * @returns A (possibly empty) list of all field-level errors.
 */
export function validateOrder(
  customer: CustomerDetails,
  items: CartLineItem[],
): ValidationError[] {
  return [...validateCustomer(customer), ...validateCartItems(items)];
}

/**
 * Minimum order value in Indian Rupees. An order whose grand total is below
 * this amount is rejected on both the client (submit guard) and the server
 * (authoritative re-check), mirroring the shared-validation pattern used for
 * the other order rules.
 */
export const MINIMUM_ORDER_VALUE = 2000;

/** True when a grand total is below the minimum order value. */
export function isBelowMinimumOrderValue(grandTotal: number): boolean {
  return grandTotal < MINIMUM_ORDER_VALUE;
}

/** Human-readable message shown when the cart is below the minimum order value. */
export function minimumOrderValueMessage(grandTotal: number): string {
  const shortfall = Math.max(0, MINIMUM_ORDER_VALUE - grandTotal);
  return `Minimum order value is ₹${MINIMUM_ORDER_VALUE.toLocaleString(
    "en-IN",
  )}. Please add ₹${shortfall.toLocaleString("en-IN")} more to place your order.`;
}
