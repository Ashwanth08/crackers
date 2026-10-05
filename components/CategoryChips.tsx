"use client";

/**
 * CategoryChips — a single horizontally scrollable row of modern pill filter
 * chips in the fixed CHIP_ORDER. The active chip gets a gold gradient; the row
 * scrolls on mobile and hides its scrollbar. Props/behaviour unchanged.
 *
 * Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 13.2
 */

import { CHIP_ORDER, type ChipFilter } from "../data/categoryMap";

export interface CategoryChipsProps {
  selected: string;
  onSelect: (chip: string) => void;
}

const chipBase =
  "min-h-[44px] inline-flex items-center justify-center rounded-pill px-5 " +
  "text-sm font-semibold whitespace-nowrap transition-all select-none " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
  "focus-visible:ring-offset-1";

const chipSelected =
  "bg-gradient-to-r from-gold to-[#ff9d2f] text-navy shadow-glow border border-transparent";

const chipUnselected =
  "bg-white text-navy border border-navy/15 hover:border-gold hover:text-festive-red";

export default function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <div
      className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto py-1"
      role="group"
      aria-label="Filter crackers by category"
    >
      {CHIP_ORDER.map((chip: ChipFilter) => {
        const isSelected = chip === selected;
        return (
          <button
            key={chip}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(chip)}
            className={`${chipBase} ${isSelected ? chipSelected : chipUnselected}`}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}
