// tests/validation.required.test.ts
//
// Property 6: Required fields reject empty or whitespace values.
// **Validates: Requirements 8.1, 8.2, 8.3**
//
// validateCustomer must flag Full Name, Mobile, and Address when they are
// empty or whitespace-only, must flag none of them when they hold valid
// non-empty values (with email omitted), and must report all applicable
// errors together rather than short-circuiting at the first failure.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { validateCustomer } from "../lib/validation";
import type { CustomerDetails } from "../lib/types";

/** A valid 10-digit Indian mobile used when a field is tested in isolation. */
const VALID_MOBILE = "9876543210";

/**
 * Whitespace-only (or empty) strings: arbitrary-length combinations of the
 * characters the trimming treats as blank (space, tab, newline, carriage
 * return, vertical tab, form feed), including the empty string "".
 */
const whitespaceArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r", "\v", "\f"), {
    minLength: 0,
    maxLength: 8,
  })
  .map((chars) => chars.join(""));

/**
 * Valid non-empty values: a string whose trimmed form has at least one
 * character, so it passes the "required" check for any text field.
 */
const nonEmptyArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0);

/** Does the error list contain an error for the given field? */
function hasFieldError(
  errors: ReturnType<typeof validateCustomer>,
  field: string
): boolean {
  return errors.some((e) => e.field === field);
}

describe("Property 6: Required fields reject empty/whitespace values (Req 8.1, 8.2, 8.3)", () => {
  it("empty/whitespace fullName -> error field 'fullName' (Req 8.1)", () => {
    fc.assert(
      fc.property(whitespaceArb, nonEmptyArb, (blankName, validAddress) => {
        const customer: CustomerDetails = {
          fullName: blankName,
          mobile: VALID_MOBILE,
          address: validAddress,
        };
        const errors = validateCustomer(customer);
        expect(hasFieldError(errors, "fullName")).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("empty/whitespace mobile -> error field 'mobile' (Req 8.2)", () => {
    fc.assert(
      fc.property(whitespaceArb, nonEmptyArb, nonEmptyArb, (blankMobile, validName, validAddress) => {
        const customer: CustomerDetails = {
          fullName: validName,
          mobile: blankMobile,
          address: validAddress,
        };
        const errors = validateCustomer(customer);
        expect(hasFieldError(errors, "mobile")).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("empty/whitespace address -> error field 'address' (Req 8.3)", () => {
    fc.assert(
      fc.property(whitespaceArb, nonEmptyArb, (blankAddress, validName) => {
        const customer: CustomerDetails = {
          fullName: validName,
          mobile: VALID_MOBILE,
          address: blankAddress,
        };
        const errors = validateCustomer(customer);
        expect(hasFieldError(errors, "address")).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("all required fields valid (email omitted) -> no fullName/mobile/address errors", () => {
    fc.assert(
      fc.property(nonEmptyArb, nonEmptyArb, (validName, validAddress) => {
        const customer: CustomerDetails = {
          fullName: validName,
          mobile: VALID_MOBILE,
          address: validAddress,
        };
        const errors = validateCustomer(customer);
        expect(hasFieldError(errors, "fullName")).toBe(false);
        expect(hasFieldError(errors, "mobile")).toBe(false);
        expect(hasFieldError(errors, "address")).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("all three required fields blank -> all three errors returned together (not short-circuited)", () => {
    fc.assert(
      fc.property(
        whitespaceArb,
        whitespaceArb,
        whitespaceArb,
        (blankName, blankMobile, blankAddress) => {
          const customer: CustomerDetails = {
            fullName: blankName,
            mobile: blankMobile,
            address: blankAddress,
          };
          const errors = validateCustomer(customer);
          expect(hasFieldError(errors, "fullName")).toBe(true);
          expect(hasFieldError(errors, "mobile")).toBe(true);
          expect(hasFieldError(errors, "address")).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("concrete example: all-empty input yields errors for fullName, mobile, and address", () => {
    const errors = validateCustomer({ fullName: "", mobile: "", address: "" });
    expect(hasFieldError(errors, "fullName")).toBe(true);
    expect(hasFieldError(errors, "mobile")).toBe(true);
    expect(hasFieldError(errors, "address")).toBe(true);
  });
});
