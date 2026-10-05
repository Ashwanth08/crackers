"use client";

/**
 * Header — sleek sticky glass top bar.
 *
 * Translucent navy glass that stays pinned while scrolling. Left: a gold logo
 * badge + business name. Right: a search control (button when onSearchClick is
 * given, else a link to the catalogue) and a cart link with a count badge that
 * appears only when distinctCount > 0. Props/behaviour unchanged.
 *
 * Requirements: 1.2, 1.3, 13.2
 */

import Link from "next/link";

import { useCart } from "../lib/cart/CartContext";

export interface HeaderProps {
  onSearchClick?: () => void;
}

const controlBase =
  "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center " +
  "rounded-pill text-white transition-colors hover:bg-white/10 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-navy";

function SearchIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M2.5 3h2l2.2 12.1a1.6 1.6 0 0 0 1.6 1.3h8.9a1.6 1.6 0 0 0 1.6-1.2l1.4-7.2H6" />
    </svg>
  );
}

export default function Header({ onSearchClick }: HeaderProps) {
  const { distinctCount } = useCart();
  const hasItems = distinctCount > 0;

  return (
    <header className="glass sticky top-0 z-40 text-white">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" aria-label="Sri Crackers home" className={`${controlBase} gap-2 px-2`}>
          <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-[#ff9d2f] font-extrabold tracking-tight text-navy shadow-glow">
            SC
          </span>
          <span className="text-lg font-extrabold leading-none text-white sm:text-xl">
            Sri Crackers
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {onSearchClick ? (
            <button type="button" onClick={onSearchClick} aria-label="Search" className={controlBase}>
              <SearchIcon />
            </button>
          ) : (
            <Link href="/catalogue" aria-label="Search" className={controlBase}>
              <SearchIcon />
            </Link>
          )}

          <Link href="/cart" aria-label={`View cart (${distinctCount} items)`} className={controlBase}>
            <CartIcon />
            <span aria-live="polite">
              {hasItems ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-festive-red px-1 text-xs font-bold leading-none text-white ring-2 ring-navy animate-pop">
                  {distinctCount}
                </span>
              ) : null}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
