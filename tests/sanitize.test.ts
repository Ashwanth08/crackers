// tests/sanitize.test.ts
//
// Property 10: Sanitization leaves no interpretable HTML.
// **Validates: Requirements 8.10, 18.4**
//
// Customer-provided text is escaped (not merely stripped) before it is stored
// or embedded in the owner notification email. These properties assert that
// escapeHtml can never leave a raw "<" or ">" in its output — so no HTML tag
// can ever be interpreted — that the five HTML-significant characters are
// replaced by the correct entities, that re-escaping an already-escaped value
// stays safe (idempotent-safe), and that sanitizeCustomerText coerces missing
// input to "" and trims-then-escapes present input.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { escapeHtml, sanitizeCustomerText } from "../lib/sanitize";

/** The entities escapeHtml may legitimately introduce. */
const KNOWN_ENTITIES = ["&amp;", "&lt;", "&gt;", "&quot;", "&#39;"];

/**
 * Remove every known entity from a string. Whatever remains must not contain
 * any of the HTML-significant characters `&`, `<`, or `>` if the input was
 * correctly escaped — any such leftover would be a bare, unescaped character.
 */
function stripKnownEntities(s: string): string {
  let out = s;
  for (const entity of KNOWN_ENTITIES) {
    out = out.split(entity).join("");
  }
  return out;
}

describe("Property 10: Sanitization leaves no interpretable HTML (Req 8.10, 18.4)", () => {
  it("escapeHtml output never contains a raw '<' or '>' for ANY input", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const escaped = escapeHtml(input);
        expect(escaped.includes("<")).toBe(false);
        expect(escaped.includes(">")).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("escapeHtml replaces & < > \" ' so no bare significant characters remain", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const escaped = escapeHtml(input);
        // After removing the legitimate entities, no significant character
        // (&, <, >) should survive — their presence would mean a bare,
        // unescaped character leaked through.
        const leftover = stripKnownEntities(escaped);
        expect(leftover.includes("&")).toBe(false);
        expect(leftover.includes("<")).toBe(false);
        expect(leftover.includes(">")).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("sanitizeCustomerText(null) === '' and sanitizeCustomerText(undefined) === ''", () => {
    expect(sanitizeCustomerText(null)).toBe("");
    expect(sanitizeCustomerText(undefined)).toBe("");
  });

  it("sanitizeCustomerText trims then escapes (matches escapeHtml(input.trim()))", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizeCustomerText(input);
        expect(sanitized).toBe(escapeHtml(input.trim()));
        // And the invariant still holds: no interpretable HTML survives.
        expect(sanitized.includes("<")).toBe(false);
        expect(sanitized.includes(">")).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("escapeHtml is idempotent-safe: double-escaping still has no raw '<' or '>'", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const twice = escapeHtml(escapeHtml(input));
        expect(twice.includes("<")).toBe(false);
        expect(twice.includes(">")).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("concrete example: a <script> payload is rendered inert", () => {
    const escaped = escapeHtml("<script>alert('x')</script>");
    expect(escaped.includes("<")).toBe(false);
    expect(escaped.includes(">")).toBe(false);
    expect(escaped).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  });
});
