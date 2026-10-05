// tests/orderEmailSubject.test.ts
//
// Unit test for the owner-notification email subject line.
// **Validates: Requirements 9.5**
//
// The subject must be exactly:
//   `New Sri Crackers Order – {orderId} – ₹{grandTotal}`
// using the en-dash ("–") separator and the ₹ symbol, with grandTotal
// inserted as the raw number (NO thousands separators) so the substitution
// is exact.

import { describe, it, expect } from "vitest";

import { buildOrderEmailSubject } from "../lib/email/orderEmailTemplate";

describe("buildOrderEmailSubject (Req 9.5)", () => {
  it("builds the exact subject with en-dash and raw ₹ grand total", () => {
    expect(buildOrderEmailSubject("SC-2026-00042", 5230)).toBe(
      "New Sri Crackers Order – SC-2026-00042 – ₹5230"
    );
  });

  it("handles additional concrete cases", () => {
    expect(buildOrderEmailSubject("SC-2026-00001", 265)).toBe(
      "New Sri Crackers Order – SC-2026-00001 – ₹265"
    );
    expect(buildOrderEmailSubject("SC-2026-99999", 1234567)).toBe(
      "New Sri Crackers Order – SC-2026-99999 – ₹1234567"
    );
  });

  it("does not insert thousands separators into the grand total", () => {
    const subject = buildOrderEmailSubject("SC-2026-00500", 100000);
    expect(subject).toBe("New Sri Crackers Order – SC-2026-00500 – ₹100000");
    // No comma grouping anywhere in the subject.
    expect(subject).not.toContain(",");
  });

  it("starts with the fixed prefix and contains the order id and ₹ + raw total", () => {
    const orderId = "SC-2026-01234";
    const grandTotal = 7890;
    const subject = buildOrderEmailSubject(orderId, grandTotal);

    expect(subject.startsWith("New Sri Crackers Order – ")).toBe(true);
    expect(subject).toContain(orderId);
    expect(subject).toContain(`₹${grandTotal}`);
  });
});
