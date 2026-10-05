"use client";

/**
 * BottomNav — mobile-only glass bottom navigation (Home, Categories, Search,
 * Cart). Active entry highlighted in gold with a top indicator. Links/active
 * logic/props unchanged.
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "../lib/cart/CartContext";

interface NavEntry {
  readonly label: string;
  readonly href: string;
  readonly ariaLabel: string;
  readonly Icon: () => JSX.Element;
  readonly isActive: (pathname: string) => boolean;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}
function CategoriesIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M2.5 3h2l2.2 12.1a1.6 1.6 0 0 0 1.6 1.3h8.9a1.6 1.6 0 0 0 1.6-1.2l1.4-7.2H6" />
    </svg>
  );
}

const NAV_ENTRIES: readonly NavEntry[] = [
  { label: "Home", href: "/", ariaLabel: "Go to home", Icon: HomeIcon, isActive: (p) => p === "/" },
  { label: "Categories", href: "/catalogue", ariaLabel: "Browse categories", Icon: CategoriesIcon, isActive: (p) => p === "/catalogue" },
  { label: "Search", href: "/catalogue?focus=search", ariaLabel: "Search crackers", Icon: SearchIcon, isActive: () => false },
  { label: "Cart", href: "/cart", ariaLabel: "View cart", Icon: CartIcon, isActive: (p) => p === "/cart" },
] as const;

const entryBase =
  "relative inline-flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center " +
  "justify-center gap-0.5 py-2 text-[11px] font-semibold leading-none " +
  "transition-colors focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-gold focus-visible:ring-inset";

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  const { distinctCount } = useCart();
  const hasItems = distinctCount > 0;

  return (
    <nav aria-label="Mobile bottom navigation" className="glass fixed bottom-0 left-0 right-0 z-30 text-white md:hidden">
      <ul className="mx-auto flex w-full max-w-5xl items-stretch">
        {NAV_ENTRIES.map((entry) => {
          const active = entry.isActive(pathname);
          const isCart = entry.href === "/cart";
          return (
            <li key={entry.label} className="flex flex-1">
              <Link
                href={entry.href}
                aria-label={isCart ? `${entry.ariaLabel} (${distinctCount} items)` : entry.ariaLabel}
                aria-current={active ? "page" : undefined}
                className={`${entryBase} ${active ? "text-gold" : "text-white/70 hover:text-white"}`}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold" />
                ) : null}
                <span className="relative inline-flex">
                  <entry.Icon />
                  {isCart && hasItems ? (
                    <span aria-hidden="true" className="absolute -right-2 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-festive-red px-1 text-[10px] font-bold leading-none text-white ring-2 ring-navy">
                      {distinctCount}
                    </span>
                  ) : null}
                </span>
                <span>{entry.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
