"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SearchBar — modern rounded search with an inline icon and focus glow.
 * Local state keeps typing instant; onChange is debounced (<=300ms, Req 4.2).
 * The external `value` can reset local state. Props unchanged.
 *
 * Requirements: 4.1, 4.2
 */

const DEBOUNCE_MS = 250;

export interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "🔍 Search crackers...",
}: SearchBarProps) {
  const [text, setText] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => onChangeRef.current(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        aria-label="Search crackers"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[48px] rounded-pill border border-navy/10 bg-white py-3 pl-11 pr-4 text-base text-navy shadow-card placeholder:text-navy/40 transition-all focus:outline-none focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-gold/25"
      />
    </div>
  );
}
