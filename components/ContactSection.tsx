/**
 * ContactSection — festive contact block with the business name, contacts, and
 * three clickable tel: links. Server component (no hooks). Modern dark festive
 * panel with white call cards. Numbers/names/tel links unchanged.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4
 */

import type { JSX } from "react";

const BUSINESS_NAME = "Sri Crackers";
const CONTACT_PERSONS: readonly string[] = ["Venkatesh", "Sri Athesh"];
const PHONE_NUMBERS: readonly string[] = ["8438847168", "9080700123", "8838525024"];

function PhoneIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export default function ContactSection(): JSX.Element {
  return (
    <section aria-labelledby="contact-heading" className="festive-bg px-4 py-14 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <h2 id="contact-heading" className="text-center text-3xl font-extrabold">
          <span className="text-gold-gradient">Contact Us</span>
        </h2>
        <p className="mt-2 text-center text-sm text-white/70">
          Call us directly to place or follow up on your order.
        </p>

        <address className="mt-8 grid gap-4 not-italic sm:grid-cols-3">
          {/* Identity card spans full width on mobile, left column on desktop. */}
          <div className="glass-light rounded-card p-5 text-center text-navy sm:col-span-3">
            <p className="text-xl font-extrabold">{BUSINESS_NAME}</p>
            <p className="mt-1 text-sm text-navy/70">
              Contact: <span className="font-semibold text-festive-red">{CONTACT_PERSONS.join(" & ")}</span>
            </p>
          </div>

          {PHONE_NUMBERS.map((number) => (
            <a
              key={number}
              href={`tel:${number}`}
              aria-label={`Call ${number}`}
              className="glass-light flex min-h-[44px] items-center justify-center gap-3 rounded-card px-4 py-4 text-base font-bold tracking-wide text-navy transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-festive-red text-white">
                <PhoneIcon />
              </span>
              <span>{number}</span>
            </a>
          ))}
        </address>
      </div>
    </section>
  );
}
