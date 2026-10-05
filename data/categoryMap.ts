// data/categoryMap.ts
import type { ChipLabel } from "../lib/types";

export const CHIP_ORDER = [
  "All",
  "Sound",
  "Flower",
  "Rocket",
  "Kids",
  "Fancy",
  "Sparklers",
  "Gift",
] as const;

export type ChipFilter = (typeof CHIP_ORDER)[number];

// Exhaustive: every detailed category present in products.json has a key.
// There are exactly 27 distinct categories in data/products.json.
export const CATEGORY_TO_CHIP: Record<string, ChipLabel> = {
  "Single Sound": "Sound",
  "Bijili/Twin Star": "Sound",
  "Pencil Varieties": "Fancy",
  "Sound Bomb": "Sound",
  "Florals Crackers": "Flower",
  "Rocket": "Rocket",
  "Adiyal and Money Bomb": "Sound",
  "Ground Chakkars Varities": "Flower",
  "Flower Pots Varities": "Flower",
  "Tri Colour Varieties": "Flower",
  "Night Splendid Items": "Fancy",
  "Splendid Chakkar Varities": "Flower",
  "Kids Special": "Kids",
  "Peacock Varieties": "Fancy",
  "Muti Sky Shot Varieties": "Fancy",
  "Fancy Sky Shots Pipes": "Fancy",
  "Special Edition Mega Pipes": "Fancy",
  "Dual and Triple Sky Attractions": "Fancy",
  "Repeating Sky Shots": "Fancy",
  "30 Shots New Arrivals-Limited!!": "Fancy",
  "Whistling Sky Shots": "Fancy",
  "Sonny's Sky Series - Limited!!": "Fancy",
  "Setouts -Mega Continuous Sky Display": "Fancy",
  "Sparklers": "Sparklers",
  "Colour Matches": "Sparklers",
  "Roll Cap And Tablets": "Kids",
  "Gift Boxes": "Gift",
};

export function chipForCategory(category: string): ChipLabel {
  const chip = CATEGORY_TO_CHIP[category];
  if (!chip) throw new Error(`Unmapped category: ${category}`);
  return chip;
}
