# Sri Crackers - Online Ordering Website

A production-ready, **mobile-first** online ordering website for **Sri Crackers**, a Sivakasi crackers (fireworks) retailer.

> Quality Crackers at Sivakasi Wholesale Rate

Customers browse a fixed catalogue of **186 products**, build a cart with enforced minimum quantities, review a live total, and place an order. The shop owner receives a professionally formatted email for every order. **No AWS services are used anywhere.**

## Features

- **Mobile-first UI** - festive premium theme (gold / crimson / navy), glassmorphism header and nav, animated hero, 2-column product grid, sticky bottom cart bar, bottom navigation.
- **Full catalogue** - all 186 products loaded from a single `data/products.json` (easy to swap for a future price list). No product data is hard-coded in components.
- **Search and filter** - instant debounced search by name/category plus horizontally scrollable category chips (All, Sound, Flower, Rocket, Kids, Fancy, Sparklers, Gift).
- **Cart** - add / remove / adjust quantity, live totals, localStorage persistence, minimum-quantity enforcement.
- **Checkout** - "Your Details" form with validation (required fields, 10-digit Indian mobile, email format), pre-submit order summary, duplicate-submit protection.
- **Secure backend** - a server-only Next.js API route validates and sanitizes input, generates a unique order ID (SC-2026-NNNNN), and emails the owner via SMTP (Nodemailer). Secrets live only in environment variables.
- **Order confirmation** - success screen with the order ID and a "we will call you within 2 hours" message.

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Animation | Framer Motion (reduced-motion aware) |
| State | React Context + useReducer (cart) + localStorage |
| Email | Nodemailer over SMTP (no AWS) |
| Tests | Vitest + Testing Library + fast-check (property-based) |

## Getting Started

### 1. Prerequisites
- Node.js 18.17+ (or 20+)
- An SMTP account for the owner email (Gmail, Resend, SendGrid, etc. - any non-AWS SMTP)

### 2. Install dependencies
Install packages with the package manager:
`npm install`

### 3. Configure environment
Copy the template to a local env file and fill in real SMTP credentials:
`cp .env.example .env.local`

`.env.local` is gitignored and must never be committed. See Environment Variables below.

### 4. Development server
Start it with the `dev` script, then open http://localhost:3000 :
`npm run dev`

### 5. Production
Build with the `build` script, then serve with the `start` script:
`npm run build` then `npm run start`

## Environment Variables

Set these in `.env.local` (local) or your host dashboard (production):

| Variable | Description | Example |
|---|---|---|
| SMTP_HOST | SMTP server host | smtp.gmail.com |
| SMTP_PORT | SMTP port | 587 |
| SMTP_SECURE | true for port 465, false for 587 STARTTLS | false |
| SMTP_USER | SMTP username | you@gmail.com |
| SMTP_PASS | SMTP password / app password | 16-char app password |
| MAIL_FROM | From address (Gmail: must be your Gmail address) | Sri Crackers <you@gmail.com> |
| OWNER_EMAIL | Inbox that receives each order | owner@gmail.com |

Gmail users: enable 2-Step Verification and create an App Password (Google Account -> Security -> App passwords). The 16-character app password goes in SMTP_PASS; your normal password will not work.

## Scripts

Run with the package manager, e.g. `npm run build`:

| Script | What it does |
|---|---|
| dev | Start the development server |
| build | Production build |
| start | Serve the production build |
| lint | Run Next.js lint |
| typecheck | TypeScript type-check (no emit) |
| test | Run the full test suite (npm test) |

## Project Structure

```
app/                     Next.js App Router pages + API
  api/order/route.ts     POST /api/order (thin handler)
  api/order/handler.ts   Order pipeline (validate, sanitize, id, email)
  page.tsx               Home
  catalogue/page.tsx     Browse + search + filter
  cart/page.tsx          Cart
  checkout/page.tsx      Checkout + submit flow
  confirmation/page.tsx  Success screen
components/              UI components (Header, Hero, ProductCard, ...)
data/
  products.json          All 186 products (source of truth)
  categoryMap.ts         27 detailed categories -> 8 grouped chips
lib/
  cart/                  Cart reducer, totals, context
  email/                 Mailer + HTML email template
  validation.ts          Shared client/server validation
  sanitize.ts            HTML sanitization
  orderId.ts             Unique order-ID store
  idempotency.ts         Duplicate-submission guard
tests/                   Unit, component, property-based and e2e tests
```

## Updating the Catalogue

All products live in `data/products.json`. Each entry has: id, name, category, price, unit, minimumQuantity. To use a new price list, replace this file keeping the same field shape. If new categories appear, add them to `data/categoryMap.ts`. The UI reads everything dynamically - no component changes needed.

## Testing

The suite covers the cart reducer, validation, sanitization, order-ID uniqueness, the email template, the /api/order pipeline (SMTP mocked), key components, and an end-to-end smoke test of the full journey. Property-based tests use fast-check. Run it with `npm test`.

## Deployment

Deploy to any Node host or Vercel. Set the environment variables from the table above in the host dashboard. The order API uses the Node.js runtime (filesystem + Nodemailer), so a Node environment is required.

Multi-instance note: the default order-ID counter and idempotency store are file-backed (single instance). For horizontally scaled deployments, swap them for a shared store (e.g. Redis/Upstash) behind the existing OrderIdStore / IdempotencyStore interfaces.

## Contact (Business)

Sri Crackers - Venkatesh / Sri Athesh
Phone: 8438847168, 9080700123, 8838525024

## License

Private project for Sri Crackers. Not for redistribution.
