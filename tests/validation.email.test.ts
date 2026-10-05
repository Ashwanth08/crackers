// tests/validation.email.test.ts
//
// Property 8: Email validation matches the specified rule.
// **Validates: Requirements 8.5**
//
// isValidEmail is true iff the value has exactly one "@", at least one
// character before the "@", and a domain after it containing at least one
// "." with a non-empty label on each side of the final dot. This is the
// lightweight rule from Requirement 8.5, intentionally not full RFC-5322.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { isValidEmail } from "../lib/validation";

/**
 * Non-empty runs of letters and digits only — no "@" and no "." — safe to use
 * as the local part and the two domain labels when building a valid address.
 */
const labelArb: fc.Arbitrary<string> = fc.stringMatching(/^[A-Za-z0-9]+$/);

describe("Property 8: Email validation matches the specified rule (Req 8.5)", () => {
  it("valid: `${local}@${d1}.${d2}` with non-empty alphanumeric parts is accepted", () => {
    fc.assert(
      fc.property(labelArb, labelArb, labelArb, (local, d1, d2) => {
        const email = `${local}@${d1}.${d2}`;
        expect(isValidEmail(email)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("invalid: zero '@' or two-or-more '@' is rejected", () => {
    // Zero "@": a plain alphanumeric/dot string with no "@".
    const noAtArb = fc.stringMatching(/^[A-Za-z0-9.]+$/);
    fc.assert(
      fc.property(noAtArb, (s) => {
        expect(isValidEmail(s)).toBe(false);
      }),
      { numRuns: 100 }
    );

    // Two-or-more "@": join 3+ alphanumeric chunks with "@".
    const multiAtArb = fc
      .array(labelArb, { minLength: 3, maxLength: 6 })
      .map((parts) => parts.join("@"));
    fc.assert(
      fc.property(multiAtArb, (s) => {
        // The joined value contains >= 2 "@" characters, so split length > 2.
        expect(isValidEmail(s)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("invalid: empty local part '@a.b' is rejected", () => {
    fc.assert(
      fc.property(labelArb, labelArb, (d1, d2) => {
        expect(isValidEmail(`@${d1}.${d2}`)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("invalid: domain without a dot 'a@b' is rejected", () => {
    fc.assert(
      fc.property(labelArb, labelArb, (local, domain) => {
        expect(isValidEmail(`${local}@${domain}`)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("invalid: domain with a trailing dot 'a@b.' is rejected", () => {
    fc.assert(
      fc.property(labelArb, labelArb, (local, d1) => {
        expect(isValidEmail(`${local}@${d1}.`)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("invalid: domain with a leading dot 'a@.b' is rejected", () => {
    fc.assert(
      fc.property(labelArb, labelArb, (local, d2) => {
        expect(isValidEmail(`${local}@.${d2}`)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("concrete examples match the rule", () => {
    // Valid
    expect(isValidEmail("venkatesh@gmail.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
    // Invalid
    expect(isValidEmail("no-at.com")).toBe(false);
    expect(isValidEmail("a@@b.com")).toBe(false);
    expect(isValidEmail("@b.com")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a@b.")).toBe(false);
  });
});
