/**
 * Owner-notification email builder for the Sri Crackers ordering app.
 *
 * Produces the subject line, a mobile-readable HTML body (inline styles,
 * single-column max-width layout) and a plain-text fallback for the order
 * confirmation email sent to the shop owner.
 *
 * All CUSTOMER-provided values (name, mobile, email, address, city, pincode,
 * notes) are passed through `escapeHtml` / `sanitizeCustomerText` before being
 * placed into the HTML body so that no markup the customer typed is ever
 * interpreted (Req 8.10). Line-item `name`/`unit` come from the trusted
 * `products.json`, but we escape them too since it is harmless.
 *
 * Requirements: 9.5 (subject), 9.6 (mobile-readable layout), 9.7 (body
 * contains order id, date/time, customer details, the S.No/Product/Qty/Unit/
 * Rate/Amount table, totals and customer notes).
 */

import type { CustomerDetails, CartLineItem } from "../types";
import { escapeHtml, sanitizeCustomerText } from "../sanitize";

/**
 * Everything the template needs to render an owner notification email. These
 * values are RESOLVED SERVER-SIDE (prices/units from products.json, totals
 * recomputed) — the template performs no pricing logic of its own.
 */
export interface OrderEmailData {
  /** "SC-2026-NNNNN". */
  orderId: string;
  /** Pre-formatted date/time string (e.g. an IST timestamp). */
  dateTime: string;
  /** Customer-provided details (sanitized before insertion into HTML). */
  customer: CustomerDetails;
  /** Server-resolved line items. */
  items: CartLineItem[];
  /** Number of distinct products. */
  totalProducts: number;
  /** Sum of all line quantities. */
  totalQuantity: number;
  /** Sum of price * quantity across all lines. */
  grandTotal: number;
}

/** Placeholder for an absent/empty optional value. */
const EMPTY = "—";

/**
 * Build the exact email subject line.
 *
 * The format is `New Sri Crackers Order – {orderId} – ₹{grandTotal}` using the
 * en-dash ("–") separator and the ₹ symbol. `grandTotal` is inserted as the
 * raw number (NO thousands separators) so the substitution is exact
 * (Req 9.5).
 *
 * @param orderId The allocated order id, e.g. "SC-2026-00042".
 * @param grandTotal The order grand total in INR.
 * @returns The subject string.
 */
export function buildOrderEmailSubject(
  orderId: string,
  grandTotal: number
): string {
  return `New Sri Crackers Order – ${orderId} – ₹${grandTotal}`;
}

/**
 * Format a number with Indian-style thousands separators for display in the
 * body (e.g. 5230 -> "5,230"). Used only for human-readable body figures; the
 * subject (Req 9.5) deliberately uses the raw number instead.
 */
function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN");
}

/**
 * Render one `<td>` for the order table.
 */
function cell(content: string, extraStyle = ""): string {
  const base =
    "padding:8px 10px;border-bottom:1px solid #eceff1;font-size:14px;color:#0E1333;";
  return `<td style="${base}${extraStyle}">${content}</td>`;
}

/**
 * Render a labelled customer-detail row for the HTML body. `value` MUST already
 * be sanitized/escaped by the caller.
 */
function detailRow(label: string, value: string): string {
  return (
    `<tr>` +
    `<td style="padding:4px 0;font-size:14px;color:#5b6472;width:110px;vertical-align:top;">${label}</td>` +
    `<td style="padding:4px 0;font-size:14px;color:#0E1333;vertical-align:top;">${value}</td>` +
    `</tr>`
  );
}

/**
 * Build the mobile-readable HTML body for the owner notification email.
 *
 * Uses a single-column, ~600px max-width table layout with inline styles so it
 * renders consistently across mobile email clients (Req 9.6). Includes the
 * heading "NEW ORDER RECEIVED", the Order ID and date/time, a sanitized
 * customer-details block, the S.No/Product/Qty/Unit/Rate/Amount order table,
 * the Total Products / Total Quantity / emphasised Grand Total figures, and a
 * Customer Notes section (Req 9.7).
 *
 * @param data The server-resolved order data.
 * @returns A self-contained HTML string.
 */
export function buildOrderEmailHtml(data: OrderEmailData): string {
  const {
    orderId,
    dateTime,
    customer,
    items,
    totalProducts,
    totalQuantity,
    grandTotal,
  } = data;

  // Sanitize every customer-provided value before insertion (Req 8.10).
  const name = sanitizeCustomerText(customer.fullName);
  const mobile = sanitizeCustomerText(customer.mobile);
  const email = customer.email ? sanitizeCustomerText(customer.email) : EMPTY;
  const address = sanitizeCustomerText(customer.address);
  const city = customer.city ? sanitizeCustomerText(customer.city) : EMPTY;
  const pincode = customer.pincode
    ? sanitizeCustomerText(customer.pincode)
    : EMPTY;
  const notesSanitized = sanitizeCustomerText(customer.notes);
  const notes = notesSanitized.length > 0 ? notesSanitized : EMPTY;

  const rows = items
    .map((item: CartLineItem, index: number) => {
      const sno = String(index + 1);
      const product = escapeHtml(item.name);
      const unit = escapeHtml(item.unit);
      const amount = item.price * item.quantity;
      return (
        `<tr>` +
        cell(sno) +
        cell(product) +
        cell(String(item.quantity), "text-align:right;") +
        cell(unit) +
        cell(`₹${formatInr(item.price)}`, "text-align:right;") +
        cell(`₹${formatInr(amount)}`, "text-align:right;") +
        `</tr>`
      );
    })
    .join("");

  const headCellStyle =
    "padding:8px 10px;background:#0E1333;color:#ffffff;font-size:13px;text-align:left;";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(buildOrderEmailSubject(orderId, grandTotal))}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:16px 0;">
<tr>
<td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(14,19,51,0.08);">
<tr>
<td style="background:#C0132B;padding:20px 24px;">
<h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.5px;">NEW ORDER RECEIVED</h1>
</td>
</tr>
<tr>
<td style="padding:20px 24px;">
<p style="margin:0 0 4px;font-size:15px;color:#0E1333;"><strong>Order ID:</strong> ${escapeHtml(
    orderId
  )}</p>
<p style="margin:0 0 16px;font-size:15px;color:#0E1333;"><strong>Date/Time:</strong> ${escapeHtml(
    dateTime
  )}</p>

<h2 style="margin:16px 0 8px;font-size:16px;color:#C0132B;">Customer Details</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${detailRow("Name:", name)}
${detailRow("Mobile:", mobile)}
${detailRow("Email:", email)}
${detailRow("Address:", address)}
${detailRow("City:", city)}
${detailRow("Pincode:", pincode)}
</table>

<h2 style="margin:20px 0 8px;font-size:16px;color:#C0132B;">Order Details</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
<thead>
<tr>
<th style="${headCellStyle}">S.No</th>
<th style="${headCellStyle}">Product</th>
<th style="${headCellStyle}text-align:right;">Qty</th>
<th style="${headCellStyle}">Unit</th>
<th style="${headCellStyle}text-align:right;">Rate</th>
<th style="${headCellStyle}text-align:right;">Amount</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
<tr><td style="padding:3px 0;font-size:14px;color:#0E1333;">Total Products: ${totalProducts}</td></tr>
<tr><td style="padding:3px 0;font-size:14px;color:#0E1333;">Total Quantity: ${totalQuantity}</td></tr>
<tr><td style="padding:8px 0 0;font-size:18px;color:#0E1333;"><strong>Grand Total: ₹${formatInr(
    grandTotal
  )}</strong></td></tr>
</table>

<h2 style="margin:20px 0 8px;font-size:16px;color:#C0132B;">Customer Notes</h2>
<p style="margin:0;font-size:14px;color:#0E1333;white-space:pre-wrap;">${notes}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

/**
 * Build the plain-text fallback for the owner notification email.
 *
 * Covers the same content as the HTML body: heading, order id, date/time,
 * customer details, a simple text table, totals and notes (Req 9.7). Customer
 * values are passed through `sanitizeCustomerText` for consistency (and so no
 * stray markup leaks), though plain text does not interpret HTML.
 *
 * @param data The server-resolved order data.
 * @returns A plain-text string.
 */
export function buildOrderEmailText(data: OrderEmailData): string {
  const {
    orderId,
    dateTime,
    customer,
    items,
    totalProducts,
    totalQuantity,
    grandTotal,
  } = data;

  const name = sanitizeCustomerText(customer.fullName);
  const mobile = sanitizeCustomerText(customer.mobile);
  const email = customer.email ? sanitizeCustomerText(customer.email) : EMPTY;
  const address = sanitizeCustomerText(customer.address);
  const city = customer.city ? sanitizeCustomerText(customer.city) : EMPTY;
  const pincode = customer.pincode
    ? sanitizeCustomerText(customer.pincode)
    : EMPTY;
  const notesSanitized = sanitizeCustomerText(customer.notes);
  const notes = notesSanitized.length > 0 ? notesSanitized : EMPTY;

  const lines: string[] = [];
  lines.push("NEW ORDER RECEIVED");
  lines.push("==================");
  lines.push("");
  lines.push(`Order ID: ${orderId}`);
  lines.push(`Date/Time: ${dateTime}`);
  lines.push("");
  lines.push("Customer Details");
  lines.push("----------------");
  lines.push(`Name:    ${name}`);
  lines.push(`Mobile:  ${mobile}`);
  lines.push(`Email:   ${email}`);
  lines.push(`Address: ${address}`);
  lines.push(`City:    ${city}`);
  lines.push(`Pincode: ${pincode}`);
  lines.push("");
  lines.push("Order Details");
  lines.push("-------------");
  lines.push("S.No | Product | Qty | Unit | Rate | Amount");

  items.forEach((item: CartLineItem, index: number) => {
    const sno = index + 1;
    const amount = item.price * item.quantity;
    lines.push(
      `${sno} | ${item.name} | ${item.quantity} | ${item.unit} | ₹${formatInr(
        item.price
      )} | ₹${formatInr(amount)}`
    );
  });

  lines.push("");
  lines.push(`Total Products: ${totalProducts}`);
  lines.push(`Total Quantity: ${totalQuantity}`);
  lines.push(`Grand Total: ₹${formatInr(grandTotal)}`);
  lines.push("");
  lines.push("Customer Notes");
  lines.push("--------------");
  lines.push(notes);

  return lines.join("\n");
}
