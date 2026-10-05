// tests/validation.mobile.test.ts
//
// Property 7: Mobile validation accepts exactly valid Indian mobile numbers.
// **Validates: Requirements 8.4**
//
// After normalization (stripping spaces and hyphens), a mobile number is valid
// iff it is exactly 10 digits with a first digit between 6 and 9 inclusive.
// These properties exercise both halves of that rule:
//   - acceptance: 10-digit strings starting with 6/7/8/9 are valid, and remain
//     valid when spaces/hyphens are interspersed (normalizeMobile strips them);
//   - rejection: a wrong leading digit (0-5), a normalized length other than
//     10, or any character outside {digit, space, hyphen} makes it invalid.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { isValidMobile, normalizeMobile } from "../lib/validation";

/** A single decimal digit as a one-character string. */
const digitArb: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 9 })
  .map((n) => String(n));

/** A valid leading digit for an Indian mobile number: 6, 7, 8, or 9. */
const leadingDigitArb: fc.Arbitrary<string> = fc.constantFrom("6", "7", "8", "9");

/** An invalid leading digit: 0, 1, 2, 3, 4, or 5. */
const invalidLeadingDigitArb: fc.Arbitrary<string> = fc.constantFrom(
  "0",
  "1",
  "2",
  "3",
  "4",
  "5"
);

/**
 * A canonical valid mobile number: leading digit in {6,7,8,9} followed by
 * exactly 9 more digits, for a total of 10 digits with no separators.
 */
const validMobileArb: fc.Arbitrary<string> = fc
  .tuple(leadingDigitArb, fc.array(digitArb, { minLength: 9, maxLength: 9 }))
  .map(([first, rest]) => first + rest.join(""));

/**
 * Insert zero or more separators (spaces and hyphens) at arbitrary positions
 * within a digit string, including at the ends. The underlying digits are
 * preserved in order, so normalizeMobile should recover the original string.
 */
function withSeparatorsArb(digits: string): fc.Arbitrary<string> {
  // One "gap" before the first digit, between each pair, and after the last.
  const gapCount = digits.length + 1;
  const sepArb = fc.array(fc.constantFrom(" ", "-"), {
    minLength: 0,
    maxLength: 3,
  });
  return fc.array(sepArb, { minLength: gapCount, maxLength: gapCount }).map(
    (gaps) => {
      let out = "";
      for (let i = 0; i < digits.length; i++) {
        out += gaps[i].join("") + digits[i];
      }
      out += gaps[digits.length].join("");
      return out;
    }
  );
}

describe("Property 7: Mobile validation accepts exactly valid Indian mobile numbers (Req 8.4)", () => {
  it("10 digits with first digit 6-9 is valid", () => {
    fc.assert(
      fc.property(validMobileArb, (mobile) => {
        expect(isValidMobile(mobile)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("valid number with interspersed spaces/hyphens is still valid (separators stripped)", () => {
    fc.assert(
      fc.property(
        validMobileArb.chain((digits) =>
          withSeparatorsArb(digits).map((formatted) => ({ digits, formatted }))
        ),
        ({ digits, formatted }) => {
          // normalizeMobile recovers the original 10 digits...
          expect(normalizeMobile(formatted)).toBe(digits);
          // ...so the formatted value validates just like the bare digits.
          expect(isValidMobile(formatted)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("first digit 0-5 (otherwise 10 digits) is invalid", () => {
    fc.assert(
      fc.property(
        invalidLeadingDigitArb,
        fc.array(digitArb, { minLength: 9, maxLength: 9 }),
        (first, rest) => {
          expect(isValidMobile(first + rest.join(""))).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("normalized length != 10 is invalid (even with a valid leading digit)", () => {
    const wrongLengthArb = fc
      .tuple(
        leadingDigitArb,
        fc.integer({ min: 0, max: 20 }).filter((len) => len !== 9),
        fc.array(digitArb, { minLength: 0, maxLength: 20 })
      )
      .map(([first, len, pool]) => {
        // Build `len` trailing digits (recycling the pool as needed).
        let rest = "";
        for (let i = 0; i < len; i++) {
          rest += pool.length > 0 ? pool[i % pool.length] : "0";
        }
        return first + rest;
      });

    fc.assert(
      fc.property(wrongLengthArb, (mobile) => {
        expect(normalizeMobile(mobile).length).not.toBe(10);
        expect(isValidMobile(mobile)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("containing a char outside {digit, space, hyphen} is invalid", () => {
    // A disallowed character: not a digit, space, or hyphen.
    const badCharArb = fc
      .fullUnicode()
      .filter((ch) => !/[\d\s-]/.test(ch));

    const withBadCharArb = fc
      .tuple(
        validMobileArb,
        badCharArb,
        fc.integer({ min: 0, max: 10 })
      )
      .map(([mobile, bad, pos]) => {
        const at = pos % (mobile.length + 1);
        return mobile.slice(0, at) + bad + mobile.slice(at);
      });

    fc.assert(
      fc.property(withBadCharArb, (mobile) => {
        expect(isValidMobile(mobile)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("concrete examples match the specified rule", () => {
    // Valid.
    expect(isValidMobile("9876543210")).toBe(true);
    expect(isValidMobile("98765 43210")).toBe(true);
    expect(isValidMobile("987-654-3210")).toBe(true);
    // Invalid.
    expect(isValidMobile("1234567890")).toBe(false); // first digit 1
    expect(isValidMobile("98765")).toBe(false); // too short
    expect(isValidMobile("98765432100")).toBe(false); // too long
    expect(isValidMobile("abcd")).toBe(false); // non-digit chars
  });
});
