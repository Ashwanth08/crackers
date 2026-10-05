/**
 * HTML sanitization for customer-provided input.
 *
 * Pure, dependency-free module. Customer text (names, addresses, notes, etc.)
 * is sanitized before it is stored or included in the owner notification
 * email, so that no HTML tags are ever interpreted. We escape rather than
 * strip, preserving the exact characters the customer typed while rendering
 * them inert in an HTML context.
 *
 * Sanitization is idempotent-safe: re-escaping already-escaped text yields a
 * still-safe value (the leading `&` of each entity is itself escaped to
 * `&amp;`), so no raw `<` or `>` can ever survive.
 *
 * Requirements: 8.10, 18.4.
 */

/**
 * Escape the five HTML-significant characters so the result contains no raw
 * `<` or `>` and therefore no interpretable HTML tags.
 *
 * The ampersand is escaped first so the ampersands introduced by the later
 * replacements are not double-escaped.
 *
 * @param input The raw text to escape.
 * @returns The escaped text, safe to place in HTML content or attributes.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a single customer-provided text field.
 *
 * Coerces `null`/`undefined` to an empty string, trims surrounding
 * whitespace, then HTML-escapes the result. This is a pure function with no
 * side effects.
 *
 * @param input The raw field value, possibly missing.
 * @returns The trimmed, HTML-escaped value (empty string for missing input).
 */
export function sanitizeCustomerText(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return "";
  }

  return escapeHtml(input.trim());
}
