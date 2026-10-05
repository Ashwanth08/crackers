// tests/orderId.format.test.ts
//
// Property 11: Order ID format round-trip.
// **Validates: Requirements 11.1**
//
// formatOrderId(n) must produce an ID matching /^SC-2026-\d{5}$/ with the
// sequence number zero-padded to 5 digits, and parseOrderId must invert it
// exactly (parseOrderId(formatOrderId(n)) === n) across the whole issuable
// range 1..99999. Malformed IDs must be rejected by parseOrderId, and
// out-of-range / non-integer sequence numbers must be rejected by
// formatOrderId with a RangeError.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { formatOrderId, parseOrderId } from "../lib/orderId";

/** The canonical well-formed Order ID shape. */
const ORDER_ID_RE = /^SC-2026-\d{5}$/;

/** Inclusive bounds of the issuable sequence (Req 11.1). */
const MIN_SEQUENCE = 1;
const MAX_SEQUENCE = 99999;

describe("Property 11: Order ID format round-trip (Req 11.1)", () => {
  it("formatOrderId(n) matches /^SC-2026-\\d{5}$/ and round-trips through parseOrderId", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_SEQUENCE, max: MAX_SEQUENCE }),
        (n) => {
          const id = formatOrderId(n);
          expect(id).toMatch(ORDER_ID_RE);
          expect(parseOrderId(id)).toBe(n);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("formatOrderId zero-pads the sequence to exactly 5 digits", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_SEQUENCE, max: MAX_SEQUENCE }),
        (n) => {
          const id = formatOrderId(n);
          // Suffix after the fixed "SC-2026-" prefix is always 5 chars.
          const suffix = id.slice("SC-2026-".length);
          expect(suffix).toHaveLength(5);
          expect(Number.parseInt(suffix, 10)).toBe(n);
          expect(suffix).toBe(String(n).padStart(5, "0"));
        }
      ),
      { numRuns: 500 }
    );
  });

  it("concrete zero-padding examples", () => {
    expect(formatOrderId(1)).toBe("SC-2026-00001");
    expect(formatOrderId(42)).toBe("SC-2026-00042");
    expect(formatOrderId(99999)).toBe("SC-2026-99999");
  });

  it("parseOrderId throws on malformed inputs", () => {
    const malformed = ["SC-2026-ABCDE", "SC-2025-00001", "", "SC-2026-123"];
    for (const bad of malformed) {
      expect(() => parseOrderId(bad)).toThrow();
    }
  });

  it("parseOrderId rejects arbitrary non-matching strings", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !ORDER_ID_RE.test(s)),
        (bad) => {
          expect(() => parseOrderId(bad)).toThrow();
        }
      ),
      { numRuns: 300 }
    );
  });

  it("formatOrderId throws RangeError for n <= 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 0 }), (n) => {
        expect(() => formatOrderId(n)).toThrow(RangeError);
      }),
      { numRuns: 200 }
    );
  });

  it("formatOrderId throws RangeError for n > 99999", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_SEQUENCE + 1, max: 10_000_000 }),
        (n) => {
          expect(() => formatOrderId(n)).toThrow(RangeError);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("formatOrderId throws RangeError for non-integers", () => {
    fc.assert(
      fc.property(
        fc
          .double({ min: MIN_SEQUENCE, max: MAX_SEQUENCE, noNaN: true })
          .filter((x) => !Number.isInteger(x)),
        (n) => {
          expect(() => formatOrderId(n)).toThrow(RangeError);
        }
      ),
      { numRuns: 200 }
    );
    // Explicit non-finite / NaN cases.
    expect(() => formatOrderId(Number.NaN)).toThrow(RangeError);
    expect(() => formatOrderId(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => formatOrderId(1.5)).toThrow(RangeError);
  });
});
