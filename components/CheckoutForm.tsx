"use client";

/**
 * CheckoutForm — the "Your Details" form (Req 7.1). Modern inputs, larger
 * touch targets, nicer focus states. Validation, serverErrors merge, value
 * retention, submit disabling and the "SUBMIT ORDER" label are all unchanged.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8.
 */

import { useMemo, useState } from "react";
import type { CustomerDetails, ValidationError } from "../lib/types";
import { validateCustomer } from "../lib/validation";

export interface CheckoutFormProps {
  submitting: boolean;
  serverErrors?: ValidationError[];
  onSubmit: (customer: CustomerDetails) => void;
}

const FIELD_BASE =
  "min-h-[48px] w-full rounded-xl border px-4 py-2.5 text-base text-navy " +
  "bg-white placeholder:text-navy/40 transition-all focus:outline-none " +
  "focus-visible:ring-4 focus-visible:ring-gold/25 focus-visible:border-gold";

function fieldClass(hasError: boolean): string {
  return `${FIELD_BASE} ${hasError ? "border-festive-red" : "border-navy/15"}`;
}

export default function CheckoutForm({ submitting, serverErrors, onSubmit }: CheckoutFormProps) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [clientErrors, setClientErrors] = useState<ValidationError[]>([]);

  const errorByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of [...clientErrors, ...(serverErrors ?? [])]) {
      if (!map.has(e.field)) map.set(e.field, e.message);
    }
    return map;
  }, [clientErrors, serverErrors]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customer: CustomerDetails = {
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      email: email.trim() === "" ? undefined : email.trim(),
      city: city.trim() === "" ? undefined : city.trim(),
      pincode: pincode.trim() === "" ? undefined : pincode.trim(),
      notes: notes.trim() === "" ? undefined : notes.trim(),
    };
    const errors = validateCustomer(customer);
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }
    setClientErrors([]);
    onSubmit(customer);
  }

  return (
    <section aria-labelledby="checkout-form-heading" className="card p-5">
      <h2 id="checkout-form-heading" className="mb-4 text-lg font-extrabold text-navy">
        Your Details
      </h2>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="checkout-fullName" label="Full Name" required error={errorByField.get("fullName")}>
          <input id="checkout-fullName" name="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-required="true" aria-invalid={errorByField.has("fullName") || undefined} aria-describedby={errorByField.has("fullName") ? "checkout-fullName-error" : undefined} className={fieldClass(errorByField.has("fullName"))} />
        </Field>

        <Field id="checkout-mobile" label="Mobile Number" required error={errorByField.get("mobile")}>
          <input id="checkout-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} aria-required="true" aria-invalid={errorByField.has("mobile") || undefined} aria-describedby={errorByField.has("mobile") ? "checkout-mobile-error" : undefined} className={fieldClass(errorByField.has("mobile"))} />
        </Field>

        <Field id="checkout-email" label="Email" error={errorByField.get("email")}>
          <input id="checkout-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errorByField.has("email") || undefined} aria-describedby={errorByField.has("email") ? "checkout-email-error" : undefined} className={fieldClass(errorByField.has("email"))} />
        </Field>

        <Field id="checkout-address" label="Delivery Address" required error={errorByField.get("address")}>
          <textarea id="checkout-address" name="address" rows={3} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} aria-required="true" aria-invalid={errorByField.has("address") || undefined} aria-describedby={errorByField.has("address") ? "checkout-address-error" : undefined} className={fieldClass(errorByField.has("address"))} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field id="checkout-city" label="City">
            <input id="checkout-city" name="city" type="text" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass(false)} />
          </Field>
          <Field id="checkout-pincode" label="Pincode">
            <input id="checkout-pincode" name="pincode" type="text" inputMode="numeric" autoComplete="postal-code" value={pincode} onChange={(e) => setPincode(e.target.value)} className={fieldClass(false)} />
          </Field>
        </div>

        <Field id="checkout-notes" label="Additional Notes">
          <textarea id="checkout-notes" name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass(false)} />
        </Field>

        <button type="submit" disabled={submitting} aria-busy={submitting || undefined} className="btn-festive mt-1 min-h-[52px] w-full rounded-pill px-6 text-base font-bold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Submitting..." : "SUBMIT ORDER"}
        </button>
      </form>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-navy">
        {label}
        {required ? <span className="ml-0.5 text-festive-red" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-festive-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
