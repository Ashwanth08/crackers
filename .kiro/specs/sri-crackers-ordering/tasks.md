# Implementation Plan: Sri Crackers Online Ordering

## Overview

This plan converts the Sri Crackers design into incremental TypeScript coding tasks for a Next.js (App Router) + React + Tailwind CSS application with a server-only `/api/order` route and Nodemailer/SMTP email. Tasks are ordered so each builds on the previous ones and ends with full wiring and an end-to-end smoke test.

The data foundation — extracting all **186 products** from the Sri Crackers 2026 Price List PDF into `data/products.json` — is an early, hard-dependency task (Task 2). The catalogue, cart, and email tasks all depend on it; none of them should be implemented until the product data file is extracted and verified.

Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP. Property-based tests are implemented with **fast-check** and map one-to-one to the design's Correctness Properties.

## Tasks

- [x] 1. Scaffold the Next.js + TypeScript + Tailwind project
  - Initialize a Next.js App Router project with TypeScript (`tsconfig.json`, `next.config.js`, `package.json`).
  - Install and configure Tailwind CSS (`tailwind.config.ts`, `postcss.config.js`) and create `styles/globals.css` with Tailwind layers.
  - Add Framer Motion and fast-check + a test runner (Vitest) as dependencies; add `test` and `build` scripts.
  - Create the directory skeleton: `app/`, `components/`, `lib/`, `data/`, `styles/`, `public/`.
  - Add a root `app/layout.tsx` (metadata placeholder, global styles import) and a minimal `app/page.tsx` so the app builds.
  - _Requirements: 13.1, 19.4, 19.5_

- [x] 2. Extract and verify all 186 products from the Price List PDF
  - [x] 2.1 Extract every product into `data/products.json`
    - Read the Sri Crackers 2026 Price List PDF and transcribe EVERY product into `data/products.json` as a JSON array of objects with fields `id` (the exact S.No), `name`, `category` (detailed PDF category), `price` (the rate), `unit`, and `minimumQuantity` — with NO omissions, inventions, or alterations.
    - Cover ALL source categories so none are missed: Single Sound, Bijili/Twin Star, Pencil Varieties, Sound Bomb, Florals Crackers, Rocket, Adiyal and Money Bomb, Ground Chakkars Varieties, Flower Pots Varieties, Tri Colour Varieties, Night Splendid Items, Splendid Chakkar Varieties, Kids Special, Peacock Varieties, Multi Sky Shot Varieties, Fancy Sky Shots Pipes, Special Edition Mega Pipes, Dual and Triple Sky Attractions, Repeating Sky Shots, 30 Shots New Arrivals, Whistling Sky Shots, Sonny's Sky Series, Setouts, Sparklers, Colour Matches, Roll Cap and Tablets, Gift Boxes.
    - Preserve exact units verbatim, including tricky ones such as "1 box - 5 pcs", "1 piece", and "1 Packet".
    - _Requirements: 12.1, 12.2, 12.5, 12.6, 6.1, 6.2, Constraints: Source of Truth_

  - [x]* 2.2 Write a data-verification test for products.json
    - Assert the file contains exactly 186 records and that every record has all six fields with correct types (`price` and `minimumQuantity` are positive numbers; `name`, `category`, `unit` non-empty strings).
    - Assert all `id` values are unique.
    - Spot-check category boundaries (first and last product of each source category) and tricky units ("1 box - 5 pcs", "1 piece", "1 Packet") against the PDF values.
    - _Requirements: 12.1, 12.2, 12.6_

- [x] 3. Define shared types and the category-to-chip mapping
  - [x] 3.1 Create shared TypeScript types in `lib/types.ts`
    - Define `ChipLabel`, `Product`, `CartLineItem`, `Cart`, `CustomerDetails`, `OrderRequest`, `OrderResponse`, and `ValidationError` exactly as specified in the design Data Models.
    - _Requirements: 12.2_

  - [x] 3.2 Implement the category-to-chip mapping in `data/categoryMap.ts`
    - Define `CHIP_ORDER` (`["All", "Sound", "Flower", "Rocket", "Kids", "Fancy", "Sparklers", "Gift"]`), the exhaustive `CATEGORY_TO_CHIP` record mapping every detailed category present in `products.json` to one of the seven chips, and `chipForCategory(category)` which throws on an unmapped category.
    - Confirm every detailed category string used in `products.json` has an entry (depends on Task 2).
    - _Requirements: 2.3, 2.6_

  - [x]* 3.3 Write property test for category mapping totality
    - **Property 1: Every product maps to exactly one chip**
    - **Validates: Requirements 2.3**
    - Iterate every product in `products.json`; assert `chipForCategory(product.category)` returns one of the seven chips and never throws.

- [x] 4. Implement cart totals and the cart reducer
  - [x] 4.1 Implement pure total selectors in `lib/cart/cartTotals.ts`
    - Compute `distinctCount`, `totalQuantity`, and `grandTotal` (sum of `price * quantity`) from a `Cart`.
    - _Requirements: 5.8, 5.9, 1.3, 20.1_

  - [x]* 4.2 Write property test for cart totals
    - **Property 3: Cart totals are the sum of line values**
    - **Validates: Requirements 5.8, 5.9, 1.3, 20.1**

  - [x] 4.3 Implement the cart reducer in `lib/cart/cartReducer.ts`
    - Handle `ADD` (defaults quantity to `minimumQuantity`), `REMOVE`, `SET_QTY` (clamp to `max(requested, min)`), `INCREMENT`, `DECREMENT` (clamp at min), and `CLEAR`.
    - _Requirements: 2.11, 2.12, 2.13, 3.6, 3.7, 3.8, 5.5, 5.6, 5.7, 6.3, 6.4_

  - [x]* 4.4 Write property test for the min-quantity invariant
    - **Property 4: Line quantity never falls below its minimum**
    - **Validates: Requirements 2.13, 3.8, 6.4**
    - Apply arbitrary sequences of ADD/SET_QTY/INCREMENT/DECREMENT and assert every line stays >= its minimum.

  - [x]* 4.5 Write property test for first-add default quantity
    - **Property 5: First add defaults to the minimum quantity**
    - **Validates: Requirements 2.11, 6.3**

- [x] 5. Implement the Cart context with localStorage persistence
  - [x] 5.1 Implement `lib/cart/CartContext.tsx`
    - Provide `CartProvider` and a `useCart()` hook exposing the `Cart`, derived selectors (`distinctCount`, `totalQuantity`, `grandTotal`), and dispatchers (`addItem`, `removeItem`, `setQuantity`, `increment`, `decrement`, `clear`).
    - Rehydrate from `localStorage` key `sri-crackers-cart` on mount and persist `items` on every change; re-clamp each rehydrated line to its minimum.
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 6.4, 20.1_

  - [x]* 5.2 Write unit tests for CartContext persistence
    - Test rehydration from localStorage, persistence on change, and re-clamping of sub-minimum rehydrated lines.
    - _Requirements: 5.1, 6.4_

- [x] 6. Implement search filtering
  - [x] 6.1 Implement `filterProducts(catalogue, query)` in `lib/search.ts`
    - Return products whose `name` or `category` contains the query as a case-insensitive substring; empty query returns all.
    - _Requirements: 2.4, 4.3_

  - [x]* 6.2 Write property test for search filtering
    - **Property 2: Search returns exactly the case-insensitive substring matches**
    - **Validates: Requirements 2.4, 4.3**

- [x] 7. Checkpoint - Ensure data, mapping, cart, and search tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the shared validation and sanitization modules
  - [x] 8.1 Implement validators in `lib/validation.ts`
    - Implement `normalizeMobile`, `isValidMobile` (10 digits, first digit 6–9), `isValidEmail` (one "@", >=1 char before, domain with a "."), `validateCustomer` (required Full Name/Mobile/Address with retained values), `validateCartItems` (per-line sub-min errors), and `validateOrder` composing them.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 6.4_

  - [x]* 8.2 Write property test for required-field validation
    - **Property 6: Required fields reject empty or whitespace values**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x]* 8.3 Write property test for mobile validation
    - **Property 7: Mobile validation accepts exactly valid Indian mobile numbers**
    - **Validates: Requirements 8.4**

  - [x]* 8.4 Write property test for email validation
    - **Property 8: Email validation matches the specified rule**
    - **Validates: Requirements 8.5**

  - [x]* 8.5 Write property test for sub-minimum line detection
    - **Property 9: Sub-minimum line items are flagged per line**
    - **Validates: Requirements 8.7**

  - [x] 8.6 Implement the HTML sanitizer in `lib/sanitize.ts`
    - Escape/strip HTML so no tags are interpretable; idempotent re-sanitization stays safe.
    - _Requirements: 8.10, 18.4_

  - [x]* 8.7 Write property test for sanitization safety
    - **Property 10: Sanitization leaves no interpretable HTML**
    - **Validates: Requirements 8.10, 18.4**

- [x] 9. Implement the Order ID store and idempotency store
  - [x] 9.1 Implement `lib/orderId.ts`
    - Define `OrderIdStore` interface, `OrderIdExhaustedError`, `formatOrderId(n)`/`parseOrderId`, and `FileOrderIdStore` persisting a counter to a server-side file guarded by an async mutex; throw on exceeding 99999.
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 9.2 Write property test for Order ID format round-trip
    - **Property 11: Order ID format round-trip**
    - **Validates: Requirements 11.1**

  - [x]* 9.3 Write property test for concurrent Order ID uniqueness
    - **Property 12: Order IDs are unique across concurrent allocation**
    - **Validates: Requirements 11.2, 11.3**
    - Run N concurrent `next()` calls via `Promise.all` against a temp-file store; assert all IDs distinct and well-formed.

  - [x]* 9.4 Write unit test for Order ID exhaustion
    - Counter at 99999 → next call throws `OrderIdExhaustedError`; no duplicate issued.
    - _Requirements: 11.4_

  - [x] 9.5 Implement `lib/idempotency.ts`
    - Define `IdempotencyStore` interface and `FileIdempotencyStore` (file-backed map with 24h TTL `get`/`set`).
    - _Requirements: 8.11, 18.5_

  - [x]* 9.6 Write property test for idempotent replay
    - **Property 14: Idempotent replay returns the original result**
    - **Validates: Requirements 8.11, 18.5**

- [x] 10. Implement the email mailer and template
  - [x] 10.1 Implement `lib/email/mailer.ts`
    - Build a Nodemailer SMTP transport from env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `OWNER_EMAIL`); expose a send function. No AWS dependencies.
    - _Requirements: 9.1, 9.2, 9.3, 18.1_

  - [x] 10.2 Implement `lib/email/orderEmailTemplate.ts`
    - Build the mobile-readable HTML (and plain-text fallback) with the heading "NEW ORDER RECEIVED", Order ID, date/time, customer details, an order table with columns S.No, Product, Qty, Unit, Rate, Amount, plus Total Products, Total Quantity, Grand Total, and Customer Notes.
    - Build the subject `New Sri Crackers Order – {orderId} – ₹{grandTotal}`.
    - _Requirements: 9.5, 9.6, 9.7_

  - [x]* 10.3 Write property test for email body completeness
    - **Property 13: Email body contains all required order information**
    - **Validates: Requirements 9.7**

  - [x]* 10.4 Write unit test for the email subject
    - Assert the exact subject string with Order ID and Grand Total substituted.
    - _Requirements: 9.5_

- [x] 11. Implement the `/api/order` backend route
  - [x] 11.1 Implement `app/api/order/route.ts`
    - Parse/shape-check the `OrderRequest`; check idempotency; resolve items against `products.json` using server-side prices; re-validate (criteria 8.1–8.7); sanitize all customer fields; generate the Order ID; send the owner email; record the idempotency result; return `OrderResponse`.
    - Map failures to `errorCode` values (`VALIDATION`, `EMPTY_CART`, `MIN_QUANTITY`, `ID_EXHAUSTED`, `EMAIL_FAILED`, `SERVER_ERROR`) and never include secrets in responses.
    - _Requirements: 8.9, 8.10, 8.11, 8.12, 9.1, 11.1, 11.4, 12.5, 18.2, 18.3, 18.4, 18.5, 20.3, 20.4_

  - [x]* 11.2 Write integration tests for `/api/order` (SMTP mocked)
    - Valid payload → 200, well-formed Order ID, mailer called once; invalid payloads re-rejected before send; duplicate idempotency key within 24h returns original response with mailer called once total; email-send failure → `EMAIL_FAILED` with ID not reused; no response field contains secrets.
    - _Requirements: 8.9, 8.11, 8.12, 9.1, 20.3, 20.4_

  - [x] 11.3 Create `.env.example`
    - Document `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `OWNER_EMAIL`, `MAIL_FROM` with placeholder (non-secret) values.
    - _Requirements: 18.1, 18.2, 9.3, 9.4_

- [x] 12. Checkpoint - Ensure backend and email tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement the visual theme and base UI primitives
  - [x] 13.1 Define the palette and theme in `styles/globals.css` and `tailwind.config.ts`
    - Add CSS custom properties for gold `#F5C518`, red `#C0132B`, navy `#0E1333`, white card; expose via the Tailwind theme; set mobile-first breakpoints and rounded-card/soft-shadow utilities.
    - _Requirements: 14.1, 14.2, 13.1, 13.5_

  - [x] 13.2 Implement `components/QuantitySelector.tsx`
    - Decrease/value/increase controls, min-quantity-aware on decrease, all controls >=44x44px.
    - _Requirements: 3.3, 3.6, 3.7, 3.8, 6.4, 13.3_

  - [x]* 13.3 Write component tests for QuantitySelector
    - Clamp at minimum on decrease; increment increases by one; verify 44px touch targets.
    - _Requirements: 3.6, 3.7, 3.8, 3.5_

- [x] 14. Implement catalogue UI components
  - [x] 14.1 Implement `components/ProductCard.tsx`
    - Show name, category, price, unit, minimum quantity; CSS placeholder visual (no photos); embed `QuantitySelector`; "Add to Cart" button that adds with the shown quantity (defaulting to minimum).
    - _Requirements: 2.2, 3.2, 3.4, 3.5, 2.11, 15.1, 15.2_

  - [x] 14.2 Implement `components/ProductGrid.tsx`
    - 2-column mobile grid (3+ columns on desktop), lazy-load below-the-fold cards, and render an empty-state message when no products match.
    - _Requirements: 2.1, 3.1, 13.4, 19.2, 2.5, 4.4_

  - [x] 14.3 Implement `components/CategoryChips.tsx`
    - Horizontally scrollable single row of "All" + 7 grouped chips in the fixed order; highlight the selected chip; default to "All".
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 13.2_

  - [x] 14.4 Implement `components/SearchBar.tsx`
    - Input with placeholder "🔍 Search crackers..." and debounced change (<=300ms).
    - _Requirements: 4.1, 4.2_

  - [x]* 14.5 Write component tests for catalogue components
    - ProductCard add dispatches with min default; empty-state message renders for no matches; chips render in order with "All" default.
    - _Requirements: 2.11, 2.5, 2.6, 2.8_

- [x] 15. Implement header, hero, navigation, and contact components
  - [x] 15.1 Implement `components/Header.tsx`
    - Sticky top bar with logo, "Sri Crackers" name, search icon, and cart icon with a distinct-product count badge.
    - _Requirements: 1.2, 1.3, 13.2_

  - [x] 15.2 Implement `components/Hero.tsx`
    - Title "🎆 Sri Crackers", tagline, "Browse Crackers" and "View Cart" CTAs, and a firework animation that honours `prefers-reduced-motion` and completes initial render within 2s.
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 14.3_

  - [x] 15.3 Implement `components/BottomNav.tsx`
    - Mobile bottom nav with Home, Categories, Search, Cart entries; >=44px targets; navigate on selection.
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 15.4 Implement `components/ContactSection.tsx`
    - Show "Sri Crackers", contacts "Venkatesh" and "Sri Athesh", and phone numbers 8438847168, 9080700123, 8838525024 as `tel:` links on mobile.
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 16. Implement cart UI components
  - [x] 16.1 Implement `components/CartBar.tsx`
    - Sticky bottom bar showing total item count, Grand Total, and a "VIEW" action; cart-update animation completing within 500ms.
    - _Requirements: 5.1, 5.2, 5.3, 14.4, 20.1_

  - [x] 16.2 Implement `components/CartList.tsx`
    - List line items (name, quantity controls, unit price, line total), remove control, and a totals footer (distinct count, total quantity, Grand Total) that recalculates on change.
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 17. Implement checkout, order summary, and confirmation components
  - [x] 17.1 Implement `components/OrderSummary.tsx`
    - Pre-submit table with Product, Qty, Rate, Amount, plus Total Products, Total Quantity, and Grand Total.
    - _Requirements: 7.4_

  - [x] 17.2 Implement `components/CheckoutForm.tsx`
    - "Your Details" fields (Full Name, Mobile, Email, Address, City, Pincode, Notes) with mobile-friendly >=44px heights; client-side validation via `lib/validation.ts` keeping entered values and showing per-field messages; "SUBMIT ORDER" button disabled while submitting and re-enabled within 1s on complete/fail.
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 17.3 Implement `components/Confirmation.tsx`
    - Show "🎉 Order Submitted Successfully!", the Order ID, a reassurance message, and "Continue Shopping" + "View Order Summary" buttons.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x]* 17.4 Write component test for submit-button disabling
    - Submit button disabled while submitting and re-enabled on resolve/reject within 1s.
    - _Requirements: 8.8, 20.4_

- [x] 18. Wire pages and the client submit flow
  - [x] 18.1 Wire the root layout and home page
    - Wrap the app in `CartProvider`, add descriptive `metadata` and semantic landmarks in `app/layout.tsx`, and compose Header, Hero, ContactSection, and BottomNav in `app/page.tsx` with CTA navigation.
    - _Requirements: 1.1, 1.5, 1.6, 19.4, 19.5_

  - [x] 18.2 Wire the catalogue page `app/catalogue/page.tsx`
    - Load products from `products.json`, compose SearchBar + CategoryChips + ProductGrid, apply search and chip filtering (via `filterProducts` and `chipForCategory`), and show the sticky CartBar.
    - _Requirements: 2.1, 2.4, 2.9, 2.10, 4.2, 5.1_

  - [x] 18.3 Wire the cart page `app/cart/page.tsx`
    - Render CartList with totals and a proceed-to-checkout action.
    - _Requirements: 5.4, 5.8, 20.2_

  - [x] 18.4 Wire the checkout page and submit flow `app/checkout/page.tsx`
    - Render OrderSummary + CheckoutForm; on valid submit, generate a UUID idempotency key, POST the `OrderRequest` to `/api/order`, disable the button while processing, navigate to Confirmation with the Order ID on success, and show an error + re-enable on failure.
    - _Requirements: 7.4, 8.8, 8.11, 20.3, 20.4_

  - [x] 18.5 Wire the confirmation page `app/confirmation/page.tsx`
    - Render Confirmation with the returned Order ID; "Continue Shopping" navigates to the catalogue; "View Order Summary" shows the submitted order summary; clear the cart after success.
    - _Requirements: 10.1, 10.2, 10.5, 10.6_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x]* 20. Write an end-to-end smoke test of the full journey
  - Simulate browse → filter/search → add to cart (min default) → view cart → checkout with valid details → submit (SMTP mocked) → confirmation with Order ID; assert cart totals and the returned Order ID format.
  - _Requirements: 20.1, 20.2, 20.3_

## Notes

- Tasks marked with `*` are optional (test) sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Task 2 (PDF extraction + verification) is a hard dependency for the catalogue (Tasks 14, 18.2), cart (Tasks 4, 5), and email (Tasks 10, 11) tasks — do not implement those before `data/products.json` is extracted and verified.
- Each task references specific requirement sub-clauses for traceability.
- Property-based tests use fast-check with a minimum of 100 iterations and map one-to-one to the design's 14 Correctness Properties.
- Checkpoints (Tasks 7, 12, 19) ensure incremental validation at natural breaks.
- The server recomputes prices and totals from `products.json`; it never trusts client-supplied prices.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "4.1", "6.1", "8.1", "8.6", "9.1", "9.5"] },
    { "id": 3, "tasks": ["4.2", "4.3", "6.2", "8.2", "8.3", "8.4", "8.5", "8.7", "9.2", "9.3", "9.4", "9.6", "10.1", "10.2", "11.3", "13.1"] },
    { "id": 4, "tasks": ["4.4", "4.5", "5.1", "10.3", "10.4", "11.1", "13.2"] },
    { "id": 5, "tasks": ["5.2", "11.2", "13.3", "14.1", "14.3", "14.4", "15.1", "15.2", "15.3", "15.4", "16.1", "16.2", "17.1", "17.3"] },
    { "id": 6, "tasks": ["14.2", "17.2"] },
    { "id": 7, "tasks": ["14.5", "17.4", "18.1", "18.3", "18.5"] },
    { "id": 8, "tasks": ["18.2", "18.4"] },
    { "id": 9, "tasks": ["20"] }
  ]
}
```
