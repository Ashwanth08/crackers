"use client";

/**
 * Home page — the festive landing screen.
 *
 * Composes the {@link Hero} (with CTAs wired to catalogue/cart navigation) and
 * the {@link ContactSection}. The sticky Header and mobile BottomNav come from
 * the root layout, so they are intentionally not rendered here.
 *
 * This is a client component so the Hero's "Browse Crackers" / "View Cart"
 * CTAs can navigate imperatively via {@link useRouter} (Req 1.5, 1.6). The
 * content is wrapped in a <main> landmark for semantics/accessibility
 * (Req 1.1, 19.4).
 */

import { useRouter } from "next/navigation";

import ContactSection from "../components/ContactSection";
import Hero from "../components/Hero";

export default function HomePage() {
  const router = useRouter();

  return (
    <main>
      <Hero
        onBrowse={() => router.push("/catalogue")}
        onViewCart={() => router.push("/cart")}
      />
      <ContactSection />
    </main>
  );
}
